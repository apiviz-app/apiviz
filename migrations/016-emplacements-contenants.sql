-- Apidoo — migration 016 : emplacements, déplacements, statut des colonies, ruches physiques (IT-06, AP-FEAT-028 à 031).
--
-- Contenu :
--   1. Statut et origine de la colonie (AP-FEAT-030, AP-TECH-107, AP-TECH-108) : ruches.statut (active, orpheline,
--      morte, reunie, vendue, perdue), origine, date_creation, code. Reprise depuis ruches.sortie. Déclencheur qui
--      garde sortie et statut d'accord dans les deux sens, tant que l'ancienne version écrit sortie. sortie accepte
--      aussi « Perdue ». changer_statut(p) pour la nouvelle version (file d'envoi hors ligne).
--   2. deplacements (AP-FEAT-029) : un mouvement d'un lot de colonies (date, rucher d'origine, de destination, motif,
--      nombre de colonies, notes). ruche_evenements.deplacement_id relie chaque ligne du registre à son déplacement.
--      Reprise des événements « deplacement » de 010 (AP-TECH-105) : un déplacement par (date, détail), texte inchangé.
--   3. colonie_emplacements (AP-FEAT-028, AP-TECH-100 à 102) : où était chaque colonie, période par période ; les
--      chevauchements sont refusés par une contrainte d'exclusion (extension btree_gist). Reprise : un emplacement
--      ouvert par colonie, depuis son dernier déplacement noté, à défaut sa date d'installation, à défaut sa date de
--      création. Un déclencheur suit tout changement de rucher (y compris par le texte de l'ancienne version).
--      rucher_a_date(colonie, date).
--   4. deplacer_colonies(p) (AP-TECH-103) : N colonies vers un rucher, en une transaction, idempotente par p.id.
--   5. contenants et colonie_contenants (AP-FEAT-031, AP-TECH-110 à 112) : ruches physiques (numéro, type, état,
--      date d'achat, lien facultatif vers un article d'équipement), occupation par période sans chevauchement (ni pour
--      la colonie, ni pour le contenant). affecter_contenant(p), idempotente par p.id.
-- Dépendances : 000, 004 à 015 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer(),
--   rattachements() de 014 ; ruchers et ruches.rucher_id de 015 ; ruche_evenements de 009/010).
-- Casse l'ancienne version : NON.
--   - Tout est ajouté : aucune colonne retirée ni renommée. ruches.sortie reste la référence de l'ancienne version et
--     suit le statut ; une sortie notée par l'ancienne version met le statut à jour.
--   - Un déplacement fait par l'ancienne version (« Déplacer des ruches » de la v5.10 : événements puis texte du
--     rucher) reste accepté ; l'emplacement suit, à la date du jour.
--   - ruche_evenements garde ses lignes et leur texte ; seule une colonne deplacement_id leur est ajoutée.
--   - Seule différence visible : la sortie « Perdue » (nouvelle version) s'affiche telle quelle dans l'ancienne.
-- Relançable : oui (if not exists, create or replace, drop … if exists ; les reprises ne traitent que ce qui n'a pas
--   encore été repris).
-- Sécurité : RLS sur les 4 nouvelles tables (lecture : exploitation courante ; écriture : responsable ou membre,
--   comme 014), audit des modifications et suppressions. Aucune fonction en security definer : déclencheurs et
--   fonctions s'exécutent avec les droits de la personne connectée, sous RLS ; search_path vide partout.
--   Extension btree_gist installée dans le schéma extensions (pas dans public).

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- 1. Statut et origine de la colonie -------------------------------------------------------------------------------
alter table public.ruches add column if not exists statut text not null default 'active';
alter table public.ruches add column if not exists origine text not null default '';
alter table public.ruches add column if not exists date_creation date;
alter table public.ruches add column if not exists code text not null default '';
alter table public.ruches drop constraint if exists ruches_statut_check;
alter table public.ruches add constraint ruches_statut_check
  check (statut in ('active', 'orpheline', 'morte', 'reunie', 'vendue', 'perdue'));
alter table public.ruches drop constraint if exists ruches_origine_check;
alter table public.ruches add constraint ruches_origine_check
  check (origine in ('', 'achat', 'essaim', 'division', 'elevage'));
-- sortie accepte aussi « Perdue » (colonie disparue, volée…). N'élargit que ce qui est accepté.
alter table public.ruches drop constraint if exists ruches_sortie_check;
alter table public.ruches add constraint ruches_sortie_check check (sortie in ('', 'Morte', 'Vendue', 'Réunie', 'Perdue'));

-- Correspondance sortie (ancienne version) ↔ statut.
create or replace function public.statut_de_sortie(s text) returns text
language sql immutable set search_path = '' as $$
  select case s when 'Morte' then 'morte' when 'Vendue' then 'vendue' when 'Réunie' then 'reunie'
                when 'Perdue' then 'perdue' else 'active' end;
$$;
create or replace function public.sortie_de_statut(s text) returns text
language sql immutable set search_path = '' as $$
  select case s when 'morte' then 'Morte' when 'vendue' then 'Vendue' when 'reunie' then 'Réunie'
                when 'perdue' then 'Perdue' else '' end;
$$;

-- 2. Déplacements ----------------------------------------------------------------------------------------------------
create table if not exists public.deplacements (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  date_deplacement date not null default current_date,
  rucher_origine_id uuid references public.ruchers(id),        -- vide : plusieurs ruchers d'origine, ou inconnu (reprise)
  rucher_destination_id uuid references public.ruchers(id),    -- vide : inconnu (reprise des événements de 010)
  motif text not null default '',                               -- transhumance, hivernage, vente…
  nb_colonies int not null default 0 check (nb_colonies >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists deplacements_id_exploitation_uidx on public.deplacements (id, exploitation_id);
create index if not exists deplacements_exploitation_idx on public.deplacements (exploitation_id, date_deplacement desc);

alter table public.ruche_evenements add column if not exists deplacement_id uuid references public.deplacements(id) on delete set null;
create index if not exists ruche_evenements_deplacement_idx on public.ruche_evenements (deplacement_id);

-- 3. Emplacements -----------------------------------------------------------------------------------------------------
-- du : premier jour dans ce rucher ; au : premier jour ailleurs (vide = emplacement actuel). rucher_id vide = « Sans
-- rucher ». Périodes [du, au) : jamais deux à la fois pour une colonie.
create table if not exists public.colonie_emplacements (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  colonie_id uuid not null references public.ruches(id) on delete cascade,
  rucher_id uuid references public.ruchers(id),
  du date not null,
  au date,
  deplacement_id uuid references public.deplacements(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint colonie_emplacements_periode check (au is null or au > du),
  constraint colonie_emplacements_sans_chevauchement exclude using gist (colonie_id with =, daterange(du, au) with &&)
);
create index if not exists colonie_emplacements_rucher_idx on public.colonie_emplacements (rucher_id);
create index if not exists colonie_emplacements_exploitation_idx on public.colonie_emplacements (exploitation_id);

-- 5. Contenants (tables ; fonction plus bas) ---------------------------------------------------------------------------
create table if not exists public.contenants (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  code text not null check (btrim(code) <> ''),            -- numéro peint ou gravé sur la caisse
  type text not null default '',                           -- Dadant 10, Langstroth, ruchette…
  etat text not null default 'bon' check (etat in ('bon', 'a_reparer', 'hors_service')),
  achat_le date,
  article_id uuid references public.articles(id) on delete set null,  -- lien facultatif avec le matériel (équipement)
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists contenants_code_uidx on public.contenants (exploitation_id, lower(btrim(code)));
create unique index if not exists contenants_id_exploitation_uidx on public.contenants (id, exploitation_id);
create index if not exists contenants_article_idx on public.contenants (article_id);

create table if not exists public.colonie_contenants (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  colonie_id uuid not null references public.ruches(id) on delete cascade,
  contenant_id uuid not null references public.contenants(id) on delete cascade,
  du date not null,
  au date,
  created_at timestamptz not null default now(),
  constraint colonie_contenants_periode check (au is null or au > du),
  constraint colonie_contenants_colonie_seule exclude using gist (colonie_id with =, daterange(du, au) with &&),
  constraint colonie_contenants_contenant_seul exclude using gist (contenant_id with =, daterange(du, au) with &&)
);
create index if not exists colonie_contenants_exploitation_idx on public.colonie_contenants (exploitation_id);

-- Rattachements dans la même exploitation (comme 014 et 015).
do $$
declare r record;
begin
  for r in select * from (values
      ('deplacements', 'rucher_origine_id', 'ruchers'), ('deplacements', 'rucher_destination_id', 'ruchers'),
      ('colonie_emplacements', 'colonie_id', 'ruches'), ('colonie_emplacements', 'rucher_id', 'ruchers'),
      ('colonie_emplacements', 'deplacement_id', 'deplacements'), ('ruche_evenements', 'deplacement_id', 'deplacements'),
      ('contenants', 'article_id', 'articles'),
      ('colonie_contenants', 'colonie_id', 'ruches'), ('colonie_contenants', 'contenant_id', 'contenants')) v(enfant, colonne, parent)
  loop
    -- Les clés vers deplacements et articles se vident à la suppression du parent : contrôle par déclencheur
    -- (une clé composite viderait aussi exploitation_id). Les autres : clé composite.
    if r.parent in ('deplacements', 'articles') then continue; end if;
    if not exists (select 1 from pg_constraint where conname = r.enfant || '_' || r.colonne || '_meme_exploitation') then
      execute format('alter table public.%I add constraint %I foreign key (%I, exploitation_id) references public.%I (id, exploitation_id)',
                     r.enfant, r.enfant || '_' || r.colonne || '_meme_exploitation', r.colonne, r.parent);
    end if;
  end loop;
end $$;

-- Rattachement vers deplacements ou articles : même exploitation (pour les clés qui se vident à la suppression).
create or replace function public.meme_exploitation_016() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Tests séparés : en plpgsql, new.<colonne> d'une autre table échouerait même derrière un « and ».
  if tg_table_name = 'contenants' then
    if new.article_id is not null
       and not exists (select 1 from public.articles a where a.id = new.article_id and a.exploitation_id = new.exploitation_id) then
      raise exception 'Article introuvable';
    end if;
  elsif new.deplacement_id is not null
     and not exists (select 1 from public.deplacements d where d.id = new.deplacement_id and d.exploitation_id = new.exploitation_id) then
    raise exception 'Déplacement introuvable';
  end if;
  return new;
end;
$$;
drop trigger if exists meme_exploitation on public.colonie_emplacements;
create trigger meme_exploitation before insert or update of deplacement_id on public.colonie_emplacements
  for each row execute function public.meme_exploitation_016();
drop trigger if exists meme_exploitation on public.ruche_evenements;
create trigger meme_exploitation before insert or update of deplacement_id on public.ruche_evenements
  for each row execute function public.meme_exploitation_016();
drop trigger if exists meme_exploitation on public.contenants;
create trigger meme_exploitation before insert or update of article_id on public.contenants
  for each row execute function public.meme_exploitation_016();

-- incoherences_exploitation() (014) contrôle aussi ces rattachements.
create or replace function public.rattachements() returns table (enfant text, colonne text, parent text)
language sql immutable set search_path = '' as $$
  values ('articles', 'fournisseur_id', 'fournisseurs'), ('depenses', 'article_id', 'articles'),
         ('depenses', 'fournisseur_id', 'fournisseurs'), ('recoltes', 'ruche_id', 'ruches'),
         ('taches', 'ruche_id', 'ruches'), ('ventes', 'client_id', 'clients'),
         ('vente_lignes', 'vente_id', 'ventes'), ('vente_lignes', 'lot_id', 'lots'),
         ('visites', 'ruche_id', 'ruches'), ('visite_intrants', 'visite_id', 'visites'),
         ('visite_intrants', 'article_id', 'articles'), ('visite_photos', 'visite_id', 'visites'),
         ('ruche_evenements', 'ruche_id', 'ruches'), ('ruche_evenements', 'autre_ruche_id', 'ruches'),
         ('ruches', 'rucher_id', 'ruchers'),
         ('deplacements', 'rucher_origine_id', 'ruchers'), ('deplacements', 'rucher_destination_id', 'ruchers'),
         ('colonie_emplacements', 'colonie_id', 'ruches'), ('colonie_emplacements', 'rucher_id', 'ruchers'),
         ('colonie_emplacements', 'deplacement_id', 'deplacements'), ('ruche_evenements', 'deplacement_id', 'deplacements'),
         ('contenants', 'article_id', 'articles'), ('colonie_contenants', 'colonie_id', 'ruches'),
         ('colonie_contenants', 'contenant_id', 'contenants');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

-- Règles d'accès (comme 014) et audit.
do $$
declare t text;
begin
  foreach t in array array['deplacements', 'colonie_emplacements', 'contenants', 'colonie_contenants'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lire on public.%I', t);
    execute format('drop policy if exists ajouter on public.%I', t);
    execute format('drop policy if exists modifier on public.%I', t);
    execute format('drop policy if exists supprimer on public.%I', t);
    execute format('create policy lire on public.%I for select to authenticated
                      using (exploitation_id = (select public.exploitation_courante()))', t);
    execute format('create policy ajouter on public.%I for insert to authenticated
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy modifier on public.%I for update to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy supprimer on public.%I for delete to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after update or delete on public.%I for each row execute function public.auditer()', t);
  end loop;
end $$;

-- Reprises ------------------------------------------------------------------------------------------------------------
-- Pas une modification faite par quelqu'un : audit suspendu ; déclencheurs de 016 créés après.
drop trigger if exists ruches_statut on public.ruches;
drop trigger if exists ruches_emplacement on public.ruches;
alter table public.ruches disable trigger audit;
alter table public.ruche_evenements disable trigger audit;

-- 1. Statut depuis sortie ; date de création.
update public.ruches set statut = public.statut_de_sortie(sortie) where sortie <> '' and statut = 'active';
update public.ruches set date_creation = coalesce(date_installation, created_at::date, current_date) where date_creation is null;

-- 2. Événements « deplacement » de 010 : un déplacement par (exploitation, date, détail). Le texte n'est pas touché.
do $$
declare g record; v uuid;
begin
  for g in select exploitation_id, date_evenement, coalesce(detail, '') detail, array_agg(id) ids, count(*) n
           from public.ruche_evenements where type = 'deplacement' and deplacement_id is null
           group by 1, 2, 3 order by 2 loop
    insert into public.deplacements (exploitation_id, date_deplacement, nb_colonies, notes)
    values (g.exploitation_id, coalesce(g.date_evenement, current_date), g.n, g.detail) returning id into v;
    update public.ruche_evenements set deplacement_id = v where id = any(g.ids);
  end loop;
end $$;

-- 3. Un emplacement ouvert par colonie : son rucher actuel, depuis son dernier déplacement noté (c'est là qu'elle est
-- arrivée), à défaut sa date d'installation, à défaut sa date de création. Avant, l'emplacement n'est pas connu.
insert into public.colonie_emplacements (exploitation_id, colonie_id, rucher_id, du, deplacement_id)
select r.exploitation_id, r.id, r.rucher_id,
       coalesce(m.date_evenement, r.date_installation, r.date_creation, r.created_at::date, current_date), m.deplacement_id
from public.ruches r
left join lateral (select e.date_evenement, e.deplacement_id from public.ruche_evenements e
                   where e.ruche_id = r.id and e.type = 'deplacement' and e.date_evenement is not null
                   order by e.date_evenement desc, e.created_at desc limit 1) m on true
where not exists (select 1 from public.colonie_emplacements x where x.colonie_id = r.id);

alter table public.ruches enable trigger audit;
alter table public.ruche_evenements enable trigger audit;

-- Déclencheurs ---------------------------------------------------------------------------------------------------------
-- sortie ↔ statut. Le statut changé fait foi ; sinon la sortie (ancienne version) donne le statut.
create or replace function public.ruches_statut_sync() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.sortie <> '' then new.statut := public.statut_de_sortie(new.sortie);
    elsif new.statut not in ('active', 'orpheline') then new.sortie := public.sortie_de_statut(new.statut);
    end if;
    new.date_creation := coalesce(new.date_creation, new.date_installation, current_date);
  elsif new.statut is distinct from old.statut then
    new.sortie := public.sortie_de_statut(new.statut);
  elsif new.sortie is distinct from old.sortie then
    new.statut := case when new.sortie = '' and old.statut in ('active', 'orpheline') then old.statut
                       else public.statut_de_sortie(new.sortie) end;
  end if;
  if new.sortie = '' then new.date_sortie := null;
  elsif new.date_sortie is null then new.date_sortie := current_date;
  end if;
  return new;
end;
$$;
create trigger ruches_statut before insert or update of sortie, statut, date_sortie on public.ruches
  for each row execute function public.ruches_statut_sync();

-- Changement de rucher : l'emplacement ouvert est fermé et un nouveau est ouvert. Date et déplacement : ceux de
-- deplacer_colonies() (variables de la transaction), à défaut aujourd'hui (ancienne version, fiche de la ruche).
create or replace function public.ruches_emplacement() returns trigger
language plpgsql set search_path = '' as $$
declare
  d date := coalesce(nullif(current_setting('apidoo.deplacement_date', true), '')::date, current_date);
  dep uuid := nullif(current_setting('apidoo.deplacement_id', true), '')::uuid;
  o public.colonie_emplacements;
begin
  if tg_op = 'INSERT' then
    insert into public.colonie_emplacements (exploitation_id, colonie_id, rucher_id, du)
    values (new.exploitation_id, new.id, new.rucher_id, coalesce(new.date_installation, new.date_creation, current_date));
    return null;
  end if;
  if new.rucher_id is not distinct from old.rucher_id then return null; end if;
  select * into o from public.colonie_emplacements where colonie_id = new.id and au is null;
  if found and o.du >= d then
    -- Même jour (ou emplacement daté plus tard) : on corrige l'emplacement ouvert plutôt que d'en créer un d'un jour.
    update public.colonie_emplacements set rucher_id = new.rucher_id, deplacement_id = coalesce(dep, deplacement_id)
    where id = o.id;
  else
    if found then update public.colonie_emplacements set au = d where id = o.id; end if;
    insert into public.colonie_emplacements (exploitation_id, colonie_id, rucher_id, du, deplacement_id)
    values (new.exploitation_id, new.id, new.rucher_id, d, dep);
  end if;
  return null;
end;
$$;
create trigger ruches_emplacement after insert or update of rucher, rucher_id on public.ruches
  for each row execute function public.ruches_emplacement();

-- Fonctions ------------------------------------------------------------------------------------------------------------
-- Le rucher où était une colonie à une date (null : pas de rucher, ou emplacement inconnu à cette date).
create or replace function public.rucher_a_date(p_colonie uuid, p_date date) returns uuid
language sql stable set search_path = '' as $$
  select rucher_id from public.colonie_emplacements
  where colonie_id = p_colonie and du <= p_date and (au is null or au > p_date)
  limit 1;
$$;

-- Déplace des colonies (p : {id, date, rucher_id, colonies: [id], motif, notes}). Une transaction ; idempotente par
-- p.id (une saisie renvoyée après une coupure n'est appliquée qu'une fois). Écrit aussi une ligne « deplacement » par
-- colonie dans ruche_evenements (registre, et ancienne version), reliée au déplacement.
create or replace function public.deplacer_colonies(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_dest uuid := nullif(p->>'rucher_id', '')::uuid;
  v_motif text := btrim(coalesce(p->>'motif', ''));
  v_notes text := btrim(coalesce(p->>'notes', ''));
  v_ids uuid[];
  v_origines uuid[];
  dest public.ruchers;
  r record;
  n int;
begin
  if exists (select 1 from public.deplacements where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  select array_agg(distinct x::uuid) into v_ids
  from jsonb_array_elements_text(coalesce(p->'colonies', '[]'::jsonb)) x where x <> '';
  if v_ids is null then raise exception 'Choisis au moins une colonie.'; end if;
  if v_date > current_date + 1 then raise exception 'La date du déplacement ne peut pas être dans le futur.'; end if;
  select * into dest from public.ruchers where id = v_dest;
  if not found then raise exception 'Rucher introuvable'; end if;
  if dest.archive_le is not null then raise exception 'Ce rucher est archivé : il n''accepte plus de colonie.'; end if;

  select count(*) into n from public.ruches where id = any(v_ids);
  if n <> cardinality(v_ids) then raise exception 'Colonie introuvable'; end if;
  for r in select x.nom, x.statut from public.ruches x where x.id = any(v_ids) and x.statut not in ('active', 'orpheline') loop
    raise exception '% n''est plus active : elle ne peut pas être déplacée.', r.nom;
  end loop;
  for r in select x.nom, e.du from public.ruches x join public.colonie_emplacements e on e.colonie_id = x.id and e.au is null
           where x.id = any(v_ids) and e.du > v_date and x.rucher_id is distinct from v_dest loop
    raise exception '% est arrivée dans son rucher actuel le % : choisis une date à partir de ce jour.', r.nom, to_char(r.du, 'DD/MM/YYYY');
  end loop;
  -- Les colonies déjà dans ce rucher ne bougent pas.
  select array_agg(id) into v_ids from public.ruches where id = any(v_ids) and rucher_id is distinct from v_dest;
  if v_ids is null then raise exception 'Ces colonies sont déjà dans ce rucher.'; end if;
  select array_agg(distinct rucher_id) into v_origines from public.ruches where id = any(v_ids);

  insert into public.deplacements (id, date_deplacement, rucher_origine_id, rucher_destination_id, motif, nb_colonies, notes)
  values (v_id, v_date, case when cardinality(v_origines) = 1 then v_origines[1] end, v_dest, v_motif, cardinality(v_ids), v_notes);

  insert into public.ruche_evenements (ruche_id, type, date_evenement, detail, deplacement_id)
  select x.id, 'deplacement', v_date,
         concat_ws(', ', coalesce(nullif(o.nom, ''), 'Sans rucher') || ' vers ' || dest.nom, nullif(v_motif, ''), nullif(v_notes, '')),
         v_id
  from public.ruches x left join public.ruchers o on o.id = x.rucher_id
  where x.id = any(v_ids);

  perform set_config('apidoo.deplacement_date', v_date::text, true), set_config('apidoo.deplacement_id', v_id::text, true);
  update public.ruches set rucher_id = v_dest where id = any(v_ids);
  -- Position du rucher de destination, s'il est placé (sinon on ne touche pas aux positions : le déclencheur
  -- rucher_position de 015 recalculerait la position du rucher depuis celles d'origine).
  if dest.lat is not null then
    update public.ruches set lat = dest.lat, lng = dest.lng
    where id = any(v_ids) and (lat is distinct from dest.lat or lng is distinct from dest.lng);
  end if;
  perform set_config('apidoo.deplacement_date', '', true), set_config('apidoo.deplacement_id', '', true);
  return v_id;
end;
$$;

-- Change le statut d'une colonie (p : {id, statut, date, detail}). Sans effet si le statut est déjà celui-là (saisie
-- renvoyée). Une sortie (morte, vendue, perdue) ou une remise en service est notée au registre, comme dans v3.js.
create or replace function public.changer_statut(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_statut text := coalesce(p->>'statut', '');
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_detail text := btrim(coalesce(p->>'detail', ''));
  r public.ruches;
begin
  perform public.exiger_ecriture();
  if v_statut not in ('active', 'orpheline', 'morte', 'vendue', 'perdue') then
    raise exception 'Statut inconnu (la réunion se fait depuis la fiche de la ruche qui accueille).';
  end if;
  select * into r from public.ruches where id = v_id;
  if not found then raise exception 'Colonie introuvable'; end if;
  if r.statut = v_statut then return v_id; end if;
  update public.ruches set statut = v_statut, date_sortie = case when v_statut in ('active', 'orpheline') then null else v_date end
  where id = v_id;
  if v_statut in ('morte', 'vendue', 'perdue') then
    insert into public.ruche_evenements (ruche_id, type, date_evenement, detail)
    values (v_id, 'sortie', v_date, concat_ws(' · ', public.sortie_de_statut(v_statut), nullif(v_detail, '')));
  elsif r.statut not in ('active', 'orpheline') then
    insert into public.ruche_evenements (ruche_id, type, date_evenement, detail) values (v_id, 'reactivation', v_date, nullif(v_detail, ''));
  end if;
  return v_id;
end;
$$;

-- Met une colonie dans un contenant (p : {id, colonie_id, contenant_id, date}) ; contenant_id vide : la colonie quitte
-- son contenant. L'ancien contenant est libéré. Idempotente par p.id (identifiant de l'occupation créée).
create or replace function public.affecter_contenant(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  v_col uuid := nullif(p->>'colonie_id', '')::uuid;
  v_cont uuid := nullif(p->>'contenant_id', '')::uuid;
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  col public.ruches;
  cont public.contenants;
  o public.colonie_contenants;
  occ record;
begin
  if exists (select 1 from public.colonie_contenants where id = v_id) then return v_id; end if;
  perform public.exiger_ecriture();
  select * into col from public.ruches where id = v_col;
  if not found then raise exception 'Colonie introuvable'; end if;
  if v_cont is not null then
    if col.statut not in ('active', 'orpheline') then raise exception '% n''est plus active.', col.nom; end if;
    select * into cont from public.contenants where id = v_cont;
    if not found then raise exception 'Contenant introuvable'; end if;
    if cont.etat = 'hors_service' then raise exception 'Le contenant % est hors service.', cont.code; end if;
    -- Occupé par une autre colonie encore active ? Une colonie qui n'est plus active libère son contenant.
    select c.*, x.nom, x.statut colonie_statut into occ from public.colonie_contenants c join public.ruches x on x.id = c.colonie_id
    where c.contenant_id = v_cont and c.colonie_id <> v_col and (c.au is null or c.au > v_date) order by c.du desc limit 1;
    if found then
      if occ.colonie_statut in ('active', 'orpheline') or occ.du >= v_date then
        raise exception 'Le contenant % est occupé par %.', cont.code, occ.nom;
      end if;
      update public.colonie_contenants set au = v_date where id = occ.id;
    end if;
  end if;
  select * into o from public.colonie_contenants where colonie_id = v_col and au is null;
  if found then
    if o.contenant_id is not distinct from v_cont then return o.id; end if;
    if o.du > v_date then
      raise exception '% est dans le contenant actuel depuis le % : choisis une date à partir de ce jour.', col.nom, to_char(o.du, 'DD/MM/YYYY');
    end if;
    if o.du = v_date then delete from public.colonie_contenants where id = o.id;  -- erreur du jour même : corrigée
    else update public.colonie_contenants set au = v_date where id = o.id;
    end if;
  elsif v_cont is null then
    return v_id;
  end if;
  if v_cont is not null then
    insert into public.colonie_contenants (id, colonie_id, contenant_id, du) values (v_id, v_col, v_cont, v_date);
  end if;
  return v_id;
end;
$$;

revoke all on function public.deplacer_colonies(jsonb), public.changer_statut(jsonb), public.affecter_contenant(jsonb),
  public.rucher_a_date(uuid, date) from public, anon;
grant execute on function public.deplacer_colonies(jsonb), public.changer_statut(jsonb), public.affecter_contenant(jsonb),
  public.rucher_a_date(uuid, date) to authenticated;
revoke all on function public.ruches_statut_sync(), public.ruches_emplacement(), public.meme_exploitation_016()
  from public, anon, authenticated;
