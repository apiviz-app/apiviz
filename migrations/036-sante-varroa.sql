-- Apiviz — migration 036 : comptages varroa en opération, seuils sourcés, signes sanitaires (IT-12, v5.76 ; maquette
-- « IT-12 Santé : varroa et observations sanitaires » du 23 nov. 2026). La fiche d'itération l'appelait « 021 » : ce
-- numéro est pris (profils et étiquettes) ; c'est la suivante, 036.
--
-- Contenu :
--   1. operations : une opération sur une ou plusieurs colonies (pour l'instant le seul type « comptage_varroa ») :
--      date, méthode (Sucre glace, Lavage, Lange, Autre), échantillon d'abeilles, durée du lange, rucher, note.
--      origine = 'operation' (comptage du rucher) ou 'visite' (comptage noté dans une visite). AP-TECH-178.
--   2. operation_colonies : le résultat de chaque colonie (varroas, abeilles prélevées). AP-TECH-178.
--   3. Reprise : chaque visite qui a un comptage (visites.varroa) devient une opération d'origine « visite », avec le
--      même identifiant que la visite ; les colonnes varroa des visites ne changent pas. AP-TECH-179.
--   4. Déclencheur sur visites : une visite créée, corrigée, restaurée ou dont le comptage est effacé garde son
--      opération à jour (creer_visite n'a pas à changer, la file d'envoi non plus). AP-TECH-181.
--   5. compter_varroa(p) : comptage de plusieurs colonies en une transaction, idempotent par l'identifiant fourni par
--      l'application (une saisie rejouée par la file d'envoi n'est enregistrée qu'une fois). AP-TECH-180.
--   6. seuils_varroa : seuil par méthode et période (mois de début et de fin), valeur, source, lien, date de
--      consultation ; source et date obligatoires. AUCUNE valeur initiale (AP-TECH-182, AP-TECH-183).
--   7. observations_sanitaires + noter_signes(p) : signes vus sur une ou plusieurs colonies (une ligne par colonie),
--      importance, note, visite éventuelle ; idempotent par saisie_id. AP-TECH-196 à 198.
-- Dépendances : 000 à 035 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture() de 014, ruchers de 015,
--   colonies_de() de 034).
-- Sécurité : RLS sur les quatre tables (lecture : exploitation courante ; écriture : personne qui peut écrire dans
--   l'exploitation). Fonctions et déclencheur en security invoker (droits de la personne connectée, sous RLS),
--   search_path vide ; compter_varroa et noter_signes vérifient que colonies, rucher et visite citées sont dans
--   l'exploitation ouverte.
-- Casse l'ancienne version : NON. Tables et fonctions nouvelles ; les colonnes varroa des visites restent écrites et lues
--   comme avant (l'ancienne version continue de les afficher ; un comptage du rucher fait avec la nouvelle version
--   n'apparaît pas dans l'ancienne).
-- Relançable : oui (if not exists, create or replace, drop … if exists ; reprise en « on conflict do nothing »).
-- Retour arrière : revenir au code précédent suffit ; il relit les colonnes varroa des visites, toujours à jour.

-- 1. Opérations -------------------------------------------------------------------------------------------------------
create table if not exists public.operations (
  id uuid primary key,
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  type text not null default 'comptage_varroa' check (type in ('comptage_varroa')),
  rucher_id uuid references public.ruchers(id) on delete set null,
  date_operation date not null default current_date,
  methode text not null default '' check (methode in ('', 'Sucre glace', 'Lavage', 'Lange', 'Autre')),
  echantillon_abeilles int check (echantillon_abeilles is null or echantillon_abeilles > 0),
  duree_jours numeric(5,1) check (duree_jours is null or duree_jours > 0),
  note text not null default '' check (length(note) <= 2000),
  origine text not null default 'operation' check (origine in ('operation', 'visite')),
  visite_id uuid unique references public.visites(id) on delete cascade,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists operations_exploitation_idx on public.operations (exploitation_id, date_operation desc);

-- 2. Résultat par colonie ---------------------------------------------------------------------------------------------
create table if not exists public.operation_colonies (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  ruche_id uuid not null references public.ruches(id) on delete cascade,
  varroa int not null check (varroa >= 0),
  abeilles int check (abeilles is null or abeilles > 0),
  unique (operation_id, ruche_id)
);
create index if not exists operation_colonies_ruche_idx on public.operation_colonies (ruche_id);

do $$
declare t text;
begin
  foreach t in array array['operations', 'operation_colonies'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lire on public.%I', t);
    execute format('drop policy if exists ecrire on public.%I', t);
    execute format('create policy lire on public.%I for select to authenticated using (exploitation_id = (select public.exploitation_courante()))', t);
    execute format('create policy ecrire on public.%I for all to authenticated using (exploitation_id = (select public.exploitation_ecriture())) with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 3 et 4. Une visite avec un comptage = une opération d'origine « visite » (même identifiant que la visite) ---------
-- Appelé par le déclencheur (droits de la personne qui écrit la visite) et par la reprise ci-dessous.
create or replace function public.synchroniser_comptage_visite() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.varroa is null and old.varroa is not null then
    delete from public.operations where id = new.id and origine = 'visite';
    return new;
  end if;
  if new.varroa is null then return new; end if;
  if tg_op = 'UPDATE' and new.varroa is not distinct from old.varroa and new.varroa_methode is not distinct from old.varroa_methode
     and new.varroa_abeilles is not distinct from old.varroa_abeilles and new.date_visite is not distinct from old.date_visite
     and exists (select 1 from public.operations where id = new.id) then
    return new;
  end if;
  insert into public.operations (id, exploitation_id, rucher_id, date_operation, methode, echantillon_abeilles, origine, visite_id, auteur, created_at)
  select new.id, new.exploitation_id, r.rucher_id, new.date_visite,
         case when new.varroa_methode in ('Sucre glace', 'Lavage', 'Lange', 'Autre') then new.varroa_methode else '' end,
         new.varroa_abeilles, 'visite', new.id, coalesce(new.auteur, ''), coalesce(new.created_at, now())
  from public.ruches r where r.id = new.ruche_id
  on conflict (id) do update set date_operation = excluded.date_operation, methode = excluded.methode,
    echantillon_abeilles = excluded.echantillon_abeilles, rucher_id = excluded.rucher_id;
  insert into public.operation_colonies (id, operation_id, exploitation_id, ruche_id, varroa, abeilles)
  values (new.id, new.id, new.exploitation_id, new.ruche_id, new.varroa, new.varroa_abeilles)
  on conflict (operation_id, ruche_id) do update set varroa = excluded.varroa, abeilles = excluded.abeilles;
  return new;
end;
$$;
revoke all on function public.synchroniser_comptage_visite() from public, anon;
drop trigger if exists comptage_varroa on public.visites;
create trigger comptage_varroa after insert or update of varroa, varroa_methode, varroa_abeilles, date_visite on public.visites
  for each row execute function public.synchroniser_comptage_visite();

-- Reprise des comptages déjà notés (à l'identique : varroas, abeilles, méthode, date). Une méthode hors liste (saisie
-- libre d'une ancienne version) est reprise vide, comme « méthode non notée ».
insert into public.operations (id, exploitation_id, rucher_id, date_operation, methode, echantillon_abeilles, origine, visite_id, auteur, created_at)
select v.id, v.exploitation_id, r.rucher_id, v.date_visite,
       case when v.varroa_methode in ('Sucre glace', 'Lavage', 'Lange', 'Autre') then v.varroa_methode else '' end,
       v.varroa_abeilles, 'visite', v.id, coalesce(v.auteur, ''), coalesce(v.created_at, now())
from public.visites v join public.ruches r on r.id = v.ruche_id
where v.varroa is not null and v.exploitation_id is not null
on conflict do nothing;
insert into public.operation_colonies (id, operation_id, exploitation_id, ruche_id, varroa, abeilles)
select v.id, v.id, v.exploitation_id, v.ruche_id, v.varroa, v.varroa_abeilles
from public.visites v join public.operations o on o.id = v.id
where v.varroa is not null
on conflict do nothing;

-- 5. Comptage du rucher -----------------------------------------------------------------------------------------------
-- p = { id, date, methode, rucher_id?, echantillon_abeilles?, duree_jours? (Lange), note?,
--       colonies: [{ ruche_id, varroa, abeilles? }] }. Rend l'identifiant ; rejoué, ne refait rien.
create or replace function public.compter_varroa(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_methode text := coalesce(p->>'methode', '');
  v_rucher uuid := nullif(p->>'rucher_id', '')::uuid;
  v_duree numeric := nullif(p->>'duree_jours', '')::numeric;
  e uuid;
  ids uuid[];
  c jsonb;
begin
  if v_id is null then raise exception 'Identifiant du comptage manquant'; end if;
  if exists (select 1 from public.operations where id = v_id) then return v_id; end if;
  e := public.exiger_ecriture();
  if v_methode not in ('Sucre glace', 'Lavage', 'Lange', 'Autre') then raise exception 'Choisis une méthode de comptage'; end if;
  if v_methode = 'Lange' and not coalesce(v_duree > 0, false) then raise exception 'Indique sur combien de jours le lange est resté'; end if;
  if jsonb_typeof(p->'colonies') <> 'array' or jsonb_array_length(p->'colonies') = 0 then raise exception 'Compte au moins une colonie'; end if;
  if jsonb_array_length(p->'colonies') <> (select count(distinct x->>'ruche_id') from jsonb_array_elements(p->'colonies') x) then
    raise exception 'Une colonie apparaît deux fois dans le comptage';
  end if;
  ids := public.colonies_de(e, (select jsonb_agg(x->'ruche_id') from jsonb_array_elements(p->'colonies') x));
  if v_rucher is not null and not exists (select 1 from public.ruchers where id = v_rucher and exploitation_id = e) then
    raise exception 'Ce rucher n’est pas dans ton exploitation';
  end if;
  for c in select * from jsonb_array_elements(p->'colonies') loop
    if coalesce((c->>'varroa') !~ '^\d{1,6}$', true) then raise exception 'Le nombre de varroas doit être un entier positif'; end if;
    if nullif(c->>'abeilles', '') is not null and (c->>'abeilles') !~ '^[1-9]\d{0,5}$' then raise exception 'Le nombre d’abeilles doit être supérieur à 0'; end if;
  end loop;
  insert into public.operations (id, exploitation_id, rucher_id, date_operation, methode, echantillon_abeilles, duree_jours, note, origine)
  values (v_id, e, v_rucher, coalesce(nullif(p->>'date', '')::date, current_date), v_methode,
          nullif(p->>'echantillon_abeilles', '')::int, case when v_methode = 'Lange' then v_duree end,
          left(coalesce(p->>'note', ''), 2000), 'operation');
  insert into public.operation_colonies (operation_id, exploitation_id, ruche_id, varroa, abeilles)
  select v_id, e, (x->>'ruche_id')::uuid, (x->>'varroa')::int,
         case when v_methode = 'Lange' then null else nullif(x->>'abeilles', '')::int end
  from jsonb_array_elements(p->'colonies') x;
  return v_id;
end;
$$;
revoke all on function public.compter_varroa(jsonb) from public, anon;
grant execute on function public.compter_varroa(jsonb) to authenticated;

-- 6. Seuils sourcés ---------------------------------------------------------------------------------------------------
-- Aucune ligne n'est insérée ici : un seuil n'existe que si quelqu'un l'a saisi avec sa source et sa date.
create table if not exists public.seuils_varroa (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  methode text not null check (methode in ('Sucre glace', 'Lavage', 'Lange', 'Autre')),
  mois_debut int not null check (mois_debut between 1 and 12),
  mois_fin int not null check (mois_fin between 1 and 12),
  valeur numeric(7,2) not null check (valeur > 0),
  source text not null check (length(btrim(source)) between 1 and 500),
  url text not null default '' check (length(url) <= 1000),
  consulte_le date not null,
  origine text not null default 'utilisateur' check (origine in ('utilisateur', 'officielle')),
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists seuils_varroa_exploitation_idx on public.seuils_varroa (exploitation_id, methode);
alter table public.seuils_varroa enable row level security;
drop policy if exists lire on public.seuils_varroa;
drop policy if exists ecrire on public.seuils_varroa;
create policy lire on public.seuils_varroa for select to authenticated using (exploitation_id = (select public.exploitation_courante()));
create policy ecrire on public.seuils_varroa for all to authenticated
  using (exploitation_id = (select public.exploitation_ecriture())) with check (exploitation_id = (select public.exploitation_ecriture()));
revoke all on public.seuils_varroa from anon;
grant select, insert, update, delete on public.seuils_varroa to authenticated;

-- 7. Signes sanitaires ------------------------------------------------------------------------------------------------
create table if not exists public.observations_sanitaires (
  id uuid primary key default gen_random_uuid(),
  saisie_id uuid not null,
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  ruche_id uuid not null references public.ruches(id) on delete cascade,
  date_observation date not null default current_date,
  signes text[] not null check (cardinality(signes) between 1 and 20),
  importance text not null default 'leger' check (importance in ('leger', 'marque', 'grave')),
  note text not null default '' check (length(note) <= 2000),
  visite_id uuid references public.visites(id) on delete set null,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now(),
  unique (saisie_id, ruche_id)
);
create index if not exists observations_sanitaires_ruche_idx on public.observations_sanitaires (ruche_id, date_observation desc);
alter table public.observations_sanitaires enable row level security;
drop policy if exists lire on public.observations_sanitaires;
drop policy if exists ecrire on public.observations_sanitaires;
create policy lire on public.observations_sanitaires for select to authenticated using (exploitation_id = (select public.exploitation_courante()));
create policy ecrire on public.observations_sanitaires for all to authenticated
  using (exploitation_id = (select public.exploitation_ecriture())) with check (exploitation_id = (select public.exploitation_ecriture()));
revoke all on public.observations_sanitaires from anon;
grant select, insert, update, delete on public.observations_sanitaires to authenticated;

-- p = { id, date, ruches: [uuid…], signes: [clé…], importance, note?, visite_id? }. Rend le nombre de colonies ;
-- rejoué (même id), ne refait rien. Les clés des signes sont celles de l'application (src/domaines/sante/regles.js).
create or replace function public.noter_signes(p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_visite uuid := nullif(p->>'visite_id', '')::uuid;
  v_imp text := coalesce(nullif(p->>'importance', ''), 'leger');
  v_signes text[];
  e uuid;
  ids uuid[];
  n int;
begin
  if v_id is null then raise exception 'Identifiant de l’observation manquant'; end if;
  select count(*) into n from public.observations_sanitaires where saisie_id = v_id;
  if n > 0 then return n; end if;
  e := public.exiger_ecriture();
  ids := public.colonies_de(e, p->'ruches');
  if jsonb_typeof(p->'signes') <> 'array' or jsonb_array_length(p->'signes') = 0 then raise exception 'Choisis au moins un signe'; end if;
  select array_agg(distinct x) into v_signes from jsonb_array_elements_text(p->'signes') x;
  if exists (select 1 from unnest(v_signes) s where s !~ '^[a-z_]{2,40}$') or cardinality(v_signes) > 20 then raise exception 'Signe inconnu'; end if;
  if v_imp not in ('leger', 'marque', 'grave') then raise exception 'Choisis l’importance : léger, marqué ou grave'; end if;
  if v_visite is not null and not exists (select 1 from public.visites where id = v_visite and exploitation_id = e) then
    raise exception 'Cette visite n’est pas dans ton exploitation';
  end if;
  insert into public.observations_sanitaires (saisie_id, exploitation_id, ruche_id, date_observation, signes, importance, note, visite_id)
  select v_id, e, r, coalesce(nullif(p->>'date', '')::date, current_date), v_signes, v_imp, left(coalesce(p->>'note', ''), 2000), v_visite
  from unnest(ids) r;
  return cardinality(ids);
end;
$$;
revoke all on function public.noter_signes(jsonb) from public, anon;
grant execute on function public.noter_signes(jsonb) to authenticated;
