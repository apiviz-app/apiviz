-- Apidoo — migration 015 : le rucher devient une entité (IT-05, AP-FEAT-025, AP-FEAT-026, AP-FEAT-027).
--
-- Contenu :
--   1. Table ruchers : nom (unique par exploitation, sans tenir compte de la casse ni des espaces), position, accès,
--      propriétaire et son téléphone, capacité, environnement, ressources, point d'eau, notes, archivage
--      (AP-TECH-094). Règles d'accès comme les tables métier depuis 014 (lecture : exploitation courante ; écriture :
--      responsable ou membre), audit des modifications.
--   2. ruches.rucher_id : clé vers le rucher, simple et composite (même exploitation). Vide = « Sans rucher ».
--   3. Reprise : une ligne par valeur distincte de ruches.rucher, normalisée (espaces en trop, casse) ; nom gardé :
--      la graphie la plus fréquente ; position : moyenne des ruches placées (calcul de meteo.js). Le texte des ruches
--      est réécrit avec ce nom (AP-TECH-091).
--   4. Synchronisation tant que l'ancienne version existe (AP-TECH-090) :
--      - ruche : un rucher_id donné réécrit le texte ; un texte saisi (ancienne version) retrouve ou crée le rucher ;
--        une colonie nouvelle sans position prend celle de son rucher ; un rucher archivé refuse toute colonie ;
--      - rucher renommé : le texte de toutes ses colonies suit (AP-US-028) ;
--      - rucher placé : la position est recopiée sur ses colonies (AP-US-029, météo et carte de l'ancienne version) ;
--      - colonies placées par l'ancienne version : la position du rucher devient la moyenne de ses colonies placées ;
--      - archivage : seulement un rucher sans colonie active (AP-TECH-096).
--   5. Fonctions : creer_rucher(p) (rucher et, en option, ses colonies, en une transaction ; sert au rucher en
--      3 questions, AP-TECH-093) et placer_rucher(p) (passe par la file d'envoi hors ligne). Idempotentes par
--      l'identifiant fourni par l'application, refusent un lecteur.
-- Dépendances : 000, 004 à 014 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer(),
--   rattachements() de 014 ; ruches.exploitation_id de 008).
-- Casse l'ancienne version : NON.
--   - ruches.rucher reste rempli et à jour ; l'ancienne version continue de lire et d'écrire ce texte.
--   - Un texte tapé dans l'ancienne version crée ou retrouve le rucher, comme le regroupement d'avant.
--   - Seules différences visibles : les variantes « Verger » / « verger » / « Verger  » sont regroupées sous un seul
--     nom ; une colonie nouvelle sans position prend celle de son rucher ; un nom de rucher archivé est refusé
--     (« Ce rucher est archivé »).
-- Relançable : oui (if not exists, create or replace, drop … if exists ; la reprise ne traite que les colonies sans
--   rucher_id).
-- Sécurité : RLS sur ruchers (politiques lire / ajouter / modifier / supprimer de 014). Aucune fonction en security
--   definer : les déclencheurs et les fonctions s'exécutent avec les droits de la personne connectée, sous RLS ;
--   search_path vide partout.

-- 1. Table ruchers -------------------------------------------------------------------------------------------------
-- Clé de comparaison des noms : espaces en trop retirés, minuscules.
create or replace function public.rucher_cle(t text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

create table if not exists public.ruchers (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  nom text not null check (btrim(nom) <> ''),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  acces text not null default '',            -- consignes d'accès : portail, code, chemin, clé…
  proprietaire text not null default '',     -- propriétaire du terrain
  proprietaire_tel text not null default '',
  capacite int check (capacite >= 0),        -- nombre de colonies que le lieu peut accueillir
  environnement text not null default '',
  ressources text not null default '',       -- flore, miellées
  point_eau text not null default '',
  notes text not null default '',
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  constraint ruchers_position_complete check ((lat is null) = (lng is null))
);
create unique index if not exists ruchers_nom_uidx on public.ruchers (exploitation_id, public.rucher_cle(nom));
create unique index if not exists ruchers_id_exploitation_uidx on public.ruchers (id, exploitation_id);
create index if not exists ruchers_exploitation_idx on public.ruchers (exploitation_id);

grant select, insert, update, delete on public.ruchers to authenticated;
alter table public.ruchers enable row level security;
drop policy if exists lire on public.ruchers;
drop policy if exists ajouter on public.ruchers;
drop policy if exists modifier on public.ruchers;
drop policy if exists supprimer on public.ruchers;
create policy lire on public.ruchers for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ajouter on public.ruchers for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy modifier on public.ruchers for update to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()))
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy supprimer on public.ruchers for delete to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()));

drop trigger if exists audit on public.ruchers;
create trigger audit after update or delete on public.ruchers for each row execute function public.auditer();

-- 2. ruches.rucher_id ------------------------------------------------------------------------------------------------
-- « no action » (et non « restrict ») : contrôlé en fin d'instruction, pour que la suppression d'une exploitation
-- (cascade sur ruchers et ruches) passe. Un rucher qui a des colonies ne peut pas être supprimé : on l'archive.
alter table public.ruches add column if not exists rucher_id uuid references public.ruchers(id);
create index if not exists ruches_rucher_idx on public.ruches (rucher_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ruches_rucher_id_meme_exploitation' and conrelid = 'public.ruches'::regclass) then
    alter table public.ruches add constraint ruches_rucher_id_meme_exploitation
      foreign key (rucher_id, exploitation_id) references public.ruchers (id, exploitation_id);
  end if;
end $$;

-- incoherences_exploitation() (014) contrôle aussi ce rattachement.
create or replace function public.rattachements() returns table (enfant text, colonne text, parent text)
language sql immutable set search_path = '' as $$
  values ('articles', 'fournisseur_id', 'fournisseurs'), ('depenses', 'article_id', 'articles'),
         ('depenses', 'fournisseur_id', 'fournisseurs'), ('recoltes', 'ruche_id', 'ruches'),
         ('taches', 'ruche_id', 'ruches'), ('ventes', 'client_id', 'clients'),
         ('vente_lignes', 'vente_id', 'ventes'), ('vente_lignes', 'lot_id', 'lots'),
         ('visites', 'ruche_id', 'ruches'), ('visite_intrants', 'visite_id', 'visites'),
         ('visite_intrants', 'article_id', 'articles'), ('visite_photos', 'visite_id', 'visites'),
         ('ruche_evenements', 'ruche_id', 'ruches'), ('ruche_evenements', 'autre_ruche_id', 'ruches'),
         ('ruches', 'rucher_id', 'ruchers');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

-- 3. Reprise des textes ----------------------------------------------------------------------------------------------
-- Déclencheurs de synchronisation retirés pendant la reprise (recréés plus bas), audit suspendu : la reprise n'est
-- pas une modification faite par quelqu'un.
drop trigger if exists rucher_sync on public.ruches;
drop trigger if exists rucher_position on public.ruches;
alter table public.ruches disable trigger audit;

with graphies as (
  select exploitation_id, public.rucher_cle(rucher) cle, regexp_replace(btrim(rucher), '\s+', ' ', 'g') graphie, count(*) n
  from public.ruches where public.rucher_cle(rucher) <> '' and rucher_id is null
  group by 1, 2, 3),
choix as (
  select distinct on (exploitation_id, cle) exploitation_id, cle, graphie
  from graphies order by exploitation_id, cle, n desc, graphie collate "C"),
positions as (
  select exploitation_id, public.rucher_cle(rucher) cle,
         round(avg(lat)::numeric, 6)::double precision lat, round(avg(lng)::numeric, 6)::double precision lng
  from public.ruches where public.rucher_cle(rucher) <> '' and lat is not null and lng is not null
  group by 1, 2)
insert into public.ruchers (exploitation_id, nom, lat, lng)
select c.exploitation_id, c.graphie, p.lat, p.lng
from choix c left join positions p on p.exploitation_id = c.exploitation_id and p.cle = c.cle
on conflict do nothing;

update public.ruches r set rucher_id = x.id, rucher = x.nom
from public.ruchers x
where r.rucher_id is null and public.rucher_cle(r.rucher) <> ''
  and x.exploitation_id = r.exploitation_id and public.rucher_cle(x.nom) = public.rucher_cle(r.rucher);
update public.ruches set rucher = '' where rucher_id is null and rucher <> '';

alter table public.ruches enable trigger audit;

-- 4. Synchronisation ---------------------------------------------------------------------------------------------------
-- Rucher : nom nettoyé ; archivage seulement sans colonie active.
create or replace function public.ruchers_avant() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.nom := regexp_replace(btrim(coalesce(new.nom, '')), '\s+', ' ', 'g');
  if new.nom = '' then raise exception 'Donne un nom au rucher.'; end if;
  if tg_op = 'UPDATE' and new.archive_le is not null and old.archive_le is null
     and exists (select 1 from public.ruches where rucher_id = new.id and sortie = '') then
    raise exception 'Déplace d''abord ses colonies : un rucher ne s''archive qu''une fois vide.';
  end if;
  return new;
end;
$$;
drop trigger if exists ruchers_avant on public.ruchers;
create trigger ruchers_avant before insert or update on public.ruchers for each row execute function public.ruchers_avant();

-- Rucher renommé ou placé : ses colonies suivent. La position n'est recopiée que pour une modification faite
-- directement sur le rucher (pg_trigger_depth() = 1), pas quand elle vient d'un recalcul depuis les colonies.
create or replace function public.ruchers_apres() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.nom is distinct from old.nom then
    update public.ruches set rucher = new.nom where rucher_id = new.id and rucher is distinct from new.nom;
  end if;
  if pg_catalog.pg_trigger_depth() = 1 and (new.lat is distinct from old.lat or new.lng is distinct from old.lng) then
    update public.ruches set lat = new.lat, lng = new.lng
    where rucher_id = new.id and (lat is distinct from new.lat or lng is distinct from new.lng);
  end if;
  return null;
end;
$$;
drop trigger if exists ruchers_apres on public.ruchers;
create trigger ruchers_apres after update of nom, lat, lng on public.ruchers for each row execute function public.ruchers_apres();

-- Colonie : le rucher_id fait foi ; à défaut, le texte (ancienne version) retrouve ou crée le rucher.
create or replace function public.ruches_rucher_sync() returns trigger
language plpgsql set search_path = '' as $$
declare
  r public.ruchers;
  cle text := public.rucher_cle(new.rucher);
begin
  if tg_op = 'UPDATE' and new.rucher_id is not distinct from old.rucher_id and new.rucher is not distinct from old.rucher then
    return new;
  end if;
  if new.rucher_id is not null and (tg_op = 'INSERT' or new.rucher_id is distinct from old.rucher_id) then
    select * into r from public.ruchers where id = new.rucher_id and exploitation_id = new.exploitation_id;
    if not found then raise exception 'Rucher introuvable'; end if;
    if r.archive_le is not null then raise exception 'Ce rucher est archivé : il n''accepte plus de colonie.'; end if;
    new.rucher := r.nom;
  elsif tg_op = 'UPDATE' and new.rucher_id is null and old.rucher_id is not null and new.rucher is not distinct from old.rucher then
    new.rucher := '';  -- colonie retirée de son rucher
  elsif cle = '' then
    new.rucher_id := null;
    new.rucher := '';
  else
    select * into r from public.ruchers where exploitation_id = new.exploitation_id and public.rucher_cle(nom) = cle;
    if not found then
      insert into public.ruchers (exploitation_id, nom, lat, lng)
      values (new.exploitation_id, new.rucher, new.lat, case when new.lat is null then null else new.lng end)
      returning * into r;
    elsif r.archive_le is not null and new.rucher_id is distinct from r.id then
      raise exception 'Ce rucher est archivé : il n''accepte plus de colonie.';
    end if;
    new.rucher_id := r.id;
    new.rucher := r.nom;
  end if;
  if tg_op = 'INSERT' and new.lat is null and r.lat is not null then
    new.lat := r.lat;
    new.lng := r.lng;
  end if;
  return new;
end;
$$;
create trigger rucher_sync before insert or update of rucher, rucher_id on public.ruches
  for each row execute function public.ruches_rucher_sync();

-- Colonies placées par l'ancienne version (« Placer sur la carte » met à jour les ruches) : le rucher prend la
-- moyenne de ses colonies placées. Ignoré quand la position vient du rucher lui-même.
create or replace function public.ruches_position_rucher() returns trigger
language plpgsql set search_path = '' as $$
begin
  if pg_catalog.pg_trigger_depth() > 1 or new.rucher_id is null then return null; end if;
  update public.ruchers x set lat = p.lat, lng = p.lng
  from (select round(avg(lat)::numeric, 6)::double precision lat, round(avg(lng)::numeric, 6)::double precision lng
        from public.ruches where rucher_id = new.rucher_id and lat is not null and lng is not null) p
  where x.id = new.rucher_id and p.lat is not null and (x.lat is distinct from p.lat or x.lng is distinct from p.lng);
  return null;
end;
$$;
create trigger rucher_position after update of lat, lng on public.ruches
  for each row execute function public.ruches_position_rucher();

-- 5. Fonctions --------------------------------------------------------------------------------------------------------
-- Crée un rucher et, en option, ses colonies (p.colonies : [{id, nom}]). Idempotente par p.id.
create or replace function public.creer_rucher(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  v_nom text := regexp_replace(btrim(coalesce(p->>'nom', '')), '\s+', ' ', 'g');
  c jsonb;
begin
  if exists (select 1 from public.ruchers where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  if v_nom = '' then raise exception 'Donne un nom au rucher.'; end if;
  if exists (select 1 from public.ruchers x where public.rucher_cle(x.nom) = public.rucher_cle(v_nom)) then
    raise exception 'Ce rucher existe déjà.';
  end if;
  if (p->>'lat') is not null and (nullif(p->>'lat', '')::double precision not between -90 and 90
      or nullif(p->>'lng', '')::double precision not between -180 and 180) then
    raise exception 'Position invalide';
  end if;
  insert into public.ruchers (id, nom, lat, lng, acces, proprietaire, proprietaire_tel, capacite, environnement,
                              ressources, point_eau, notes)
  values (v_id, v_nom, nullif(p->>'lat', '')::double precision, nullif(p->>'lng', '')::double precision,
          coalesce(p->>'acces', ''), coalesce(p->>'proprietaire', ''), coalesce(p->>'proprietaire_tel', ''),
          nullif(p->>'capacite', '')::int, coalesce(p->>'environnement', ''), coalesce(p->>'ressources', ''),
          coalesce(p->>'point_eau', ''), coalesce(p->>'notes', ''));
  for c in select * from jsonb_array_elements(coalesce(p->'colonies', '[]'::jsonb)) loop
    insert into public.ruches (id, nom, rucher_id, type_ruche, etat, date_installation)
    values (coalesce(nullif(c->>'id', '')::uuid, gen_random_uuid()), btrim(c->>'nom'), v_id,
            coalesce(c->>'type_ruche', ''), 'Bonne', current_date);
  end loop;
  return v_id;
end;
$$;

-- Place un rucher (p : {id, lat, lng}) ; ses colonies prennent cette position (déclencheur ruchers_apres).
create or replace function public.placer_rucher(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  la double precision := nullif(p->>'lat', '')::double precision;
  lo double precision := nullif(p->>'lng', '')::double precision;
begin
  perform public.exiger_ecriture();
  if la is null or lo is null or la not between -90 and 90 or lo not between -180 and 180 then
    raise exception 'Position invalide';
  end if;
  update public.ruchers set lat = round(la::numeric, 6)::double precision, lng = round(lo::numeric, 6)::double precision
  where id = v_id;
  if not found then raise exception 'Rucher introuvable'; end if;
  return v_id;
end;
$$;

revoke all on function public.creer_rucher(jsonb), public.placer_rucher(jsonb) from public, anon;
grant execute on function public.creer_rucher(jsonb), public.placer_rucher(jsonb) to authenticated;
revoke all on function public.ruchers_avant(), public.ruchers_apres(), public.ruches_rucher_sync(),
  public.ruches_position_rucher() from public, anon, authenticated;
