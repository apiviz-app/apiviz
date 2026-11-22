-- Apiviz — migration 034 : ordre de pose, code court des QR, actions groupées (IT-10, v5.74 ; maquette « IT-10 — QR et
-- tournée » du 22 nov. 2026).
--
-- Contenu :
--   1. ruches.ordre_pose : place de la colonie dans son rucher (1, 2, 3…), dans l'ordre où elle est posée. Vide = pas
--      encore rangée (la tournée la met alors après les colonies rangées). AP-TECH-140.
--   2. ruches.code_qr : code court de 4 caractères (« K7M2 »), unique dans l'exploitation, imprimé sous le QR et lu par
--      le lien « ?c=K7M2 ». Sans 0, O, 1, I ni L, pour ne pas se tromper en le recopiant. Rempli tout seul pour les
--      colonies existantes et nouvelles. AP-TECH-159. (La colonne code de 016 reste le numéro peint sur la caisse : libre.)
--   3. ruches.etiquette_imprimee_le : date de la dernière impression de l'étiquette (« Seulement les nouvelles »).
--   4. Table actions_groupees : journal des actions appliquées à plusieurs colonies d'un coup ; son identifiant, fourni
--      par l'application, rend l'action idempotente (une action rejouée par la file d'envoi n'est appliquée qu'une fois).
--   5. appliquer_action_groupee(p) : +1 hausse, état ou tâche sur plusieurs colonies, en une transaction. AP-TECH-145.
--   6. ranger_ruches(p) : enregistre l'ordre de pose d'un rucher en une fois.
--   7. noter_etiquettes(p) : note la date d'impression des étiquettes.
-- Dépendances : 000 à 033 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture() de 014, auditer()).
-- Sécurité : RLS sur actions_groupees (lecture : exploitation courante ; écriture : responsable ou membre). Fonctions en
--   security invoker (droits de la personne connectée, sous RLS), search_path vide ; chacune vérifie que toutes les
--   colonies citées sont dans l'exploitation ouverte, et refuse sinon.
-- Casse l'ancienne version : NON. Trois colonnes avec valeur par défaut ou vides, une table et trois fonctions nouvelles ;
--   l'ancienne version les ignore. Une colonie créée par l'ancienne version reçoit son code court par le déclencheur.
-- Relançable : oui (if not exists, create or replace, drop … if exists ; la reprise ne traite que les codes vides).
-- Retour arrière : revenir au code précédent suffit ; colonnes, table et fonctions peuvent rester.

-- 1. Ordre de pose ----------------------------------------------------------------------------------------------------
alter table public.ruches add column if not exists ordre_pose int;
alter table public.ruches drop constraint if exists ruches_ordre_pose_positif;
alter table public.ruches add constraint ruches_ordre_pose_positif check (ordre_pose is null or ordre_pose between 1 and 9999);

-- 2. Code court des QR ------------------------------------------------------------------------------------------------
alter table public.ruches add column if not exists code_qr text not null default '';
alter table public.ruches drop constraint if exists ruches_code_qr_forme;
alter table public.ruches add constraint ruches_code_qr_forme
  check (code_qr = '' or code_qr ~ '^[2-9A-HJKMNP-Z]{4,6}$');
create unique index if not exists ruches_code_qr_unique on public.ruches (exploitation_id, code_qr) where code_qr <> '';

-- Un code libre dans l'exploitation e : 4 caractères tirés au hasard parmi 31 (près d'un million de codes).
-- Pas besoin d'aléa cryptographique : le code ne donne aucun droit, la RLS décide de ce qu'on voit.
create or replace function public.code_qr_libre(e uuid) returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  c text;
  essai int := 0;
begin
  loop
    c := '';
    for i in 1..4 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.ruches where exploitation_id is not distinct from e and code_qr = c);
    essai := essai + 1;
    if essai > 200 then raise exception 'Impossible de trouver un code libre pour cette colonie'; end if;
  end loop;
  return c;
end;
$$;

create or replace function public.ruches_code_qr() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(new.code_qr, '') = '' then new.code_qr := public.code_qr_libre(new.exploitation_id); end if;
  new.code_qr := upper(new.code_qr);
  return new;
end;
$$;
drop trigger if exists code_qr on public.ruches;
create trigger code_qr before insert on public.ruches for each row execute function public.ruches_code_qr();

-- Reprise : une colonie à la fois, pour que chaque tirage voie les codes déjà donnés.
do $$
declare r record;
begin
  for r in select id, exploitation_id from public.ruches where code_qr = '' order by created_at nulls last, id loop
    update public.ruches set code_qr = public.code_qr_libre(r.exploitation_id) where id = r.id;
  end loop;
end;
$$;

-- 3. Date d'impression de l'étiquette ---------------------------------------------------------------------------------
alter table public.ruches add column if not exists etiquette_imprimee_le date;

-- 4. Journal des actions groupées -------------------------------------------------------------------------------------
create table if not exists public.actions_groupees (
  id uuid primary key,
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  action text not null check (action in ('hausse', 'etat', 'tache')),
  ruches uuid[] not null check (cardinality(ruches) between 1 and 500),
  valeur jsonb not null default '{}'::jsonb,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists actions_groupees_exploitation_idx on public.actions_groupees (exploitation_id, created_at desc);
alter table public.actions_groupees enable row level security;
drop policy if exists lire on public.actions_groupees;
drop policy if exists ajouter on public.actions_groupees;
create policy lire on public.actions_groupees for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ajouter on public.actions_groupees for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture()));
-- Ni modification ni suppression : c'est un journal.
revoke all on public.actions_groupees from anon;
grant select, insert on public.actions_groupees to authenticated;

-- Les colonies citées, toutes dans l'exploitation e et sans doublon ; sinon une erreur en français.
create or replace function public.colonies_de(e uuid, p jsonb) returns uuid[]
language plpgsql stable set search_path = '' as $$
declare
  ids uuid[];
  n int;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then raise exception 'Choisis au moins une colonie'; end if;
  if jsonb_array_length(p) > 500 then raise exception 'Pas plus de 500 colonies à la fois'; end if;
  begin
    select array_agg(distinct (x #>> '{}')::uuid) into ids from jsonb_array_elements(p) x;
  exception when invalid_text_representation then raise exception 'Colonie introuvable';
  end;
  select count(*) into n from public.ruches where id = any(ids) and exploitation_id = e;
  if n <> cardinality(ids) then raise exception 'Une des colonies n’est pas dans ton exploitation'; end if;
  return ids;
end;
$$;

-- 5. Action groupée ---------------------------------------------------------------------------------------------------
-- p = { id, action: 'hausse' | 'etat' | 'tache', ruches: [uuid…], valeur: { delta } | { etat } | { titre, echeance } }.
-- Rend le nombre de colonies touchées ; une action déjà appliquée (même id) rend son nombre sans rien refaire.
create or replace function public.appliquer_action_groupee(p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_action text := coalesce(p->>'action', '');
  v_val jsonb := coalesce(p->'valeur', '{}'::jsonb);
  v_deja uuid[];
  e uuid;
  ids uuid[];
  d int;
  v_etat text;
  v_titre text;
begin
  if v_id is null then raise exception 'Identifiant de l’action manquant'; end if;
  select ruches into v_deja from public.actions_groupees where id = v_id;
  if v_deja is not null then return cardinality(v_deja); end if;
  e := public.exiger_ecriture();
  ids := public.colonies_de(e, p->'ruches');

  if v_action = 'hausse' then
    d := coalesce(nullif(v_val->>'delta', '')::int, 1);
    if d = 0 or d not between -5 and 5 then raise exception 'Nombre de hausses à ajouter mal indiqué'; end if;
    update public.ruches set hausses = greatest(hausses + d, 0) where id = any(ids) and exploitation_id = e;
  elsif v_action = 'etat' then
    v_etat := coalesce(v_val->>'etat', '');
    if v_etat not in ('Bonne', 'À surveiller', 'Critique') then raise exception 'Choisis un état : Bonne, À surveiller ou Critique'; end if;
    update public.ruches set etat = v_etat where id = any(ids) and exploitation_id = e;
  elsif v_action = 'tache' then
    v_titre := left(btrim(coalesce(v_val->>'titre', '')), 200);
    if v_titre = '' then raise exception 'Indique la tâche à faire'; end if;
    insert into public.taches (titre, echeance, ruche_id, exploitation_id)
    select v_titre, nullif(v_val->>'echeance', '')::date, r, e from unnest(ids) r;
  else
    raise exception 'Action inconnue : %', v_action;
  end if;

  insert into public.actions_groupees (id, exploitation_id, action, ruches, valeur) values (v_id, e, v_action, ids, v_val);
  return cardinality(ids);
end;
$$;
revoke all on function public.appliquer_action_groupee(jsonb) from public, anon;
grant execute on function public.appliquer_action_groupee(jsonb) to authenticated;

-- 6. Ordre de pose d'un rucher ----------------------------------------------------------------------------------------
-- p = { ruches: [uuid…] } dans l'ordre de pose : la 1re reçoit 1, la 2e 2… Rejouer le même ordre ne change rien.
create or replace function public.ranger_ruches(p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  ids uuid[];
begin
  if jsonb_typeof(p->'ruches') = 'array'
     and jsonb_array_length(p->'ruches') <> (select count(distinct x) from jsonb_array_elements(p->'ruches') x) then
    raise exception 'Une colonie apparaît deux fois dans l’ordre';
  end if;
  ids := public.colonies_de(e, p->'ruches');
  update public.ruches r set ordre_pose = o.n::int
  from (select (x #>> '{}')::uuid as id, n from jsonb_array_elements(p->'ruches') with ordinality as t(x, n)) o
  where r.id = o.id and r.exploitation_id = e and r.ordre_pose is distinct from o.n::int;
  return cardinality(ids);
end;
$$;
revoke all on function public.ranger_ruches(jsonb) from public, anon;
grant execute on function public.ranger_ruches(jsonb) to authenticated;

-- 7. Étiquettes imprimées ---------------------------------------------------------------------------------------------
-- p = { ruches: [uuid…], date } (date du jour par défaut).
create or replace function public.noter_etiquettes(p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  ids uuid[] := public.colonies_de(e, p->'ruches');
begin
  update public.ruches set etiquette_imprimee_le = coalesce(nullif(p->>'date', '')::date, current_date)
  where id = any(ids) and exploitation_id = e;
  return cardinality(ids);
end;
$$;
revoke all on function public.noter_etiquettes(jsonb) from public, anon;
grant execute on function public.noter_etiquettes(jsonb) to authenticated;
revoke all on function public.colonies_de(uuid, jsonb), public.code_qr_libre(uuid) from public, anon;
grant execute on function public.colonies_de(uuid, jsonb), public.code_qr_libre(uuid) to authenticated;
