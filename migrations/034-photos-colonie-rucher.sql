-- Apiviz — migration 034 : photos de colonie et de rucher, journal du nettoyage du stockage (IT-11, v5.74).
--
-- Contenu :
--   1. visite_photos : colonnes facultatives colonie_id et rucher_id (AP-TECH-165). visite_id devient facultatif ; une
--      photo reste rattachée à au moins une fiche (visite, colonie ou rucher). Liens « même exploitation » (clés
--      composites, comme 014 à 019) et rattachements() à jour.
--   2. nettoyages_stockage : journal des passages du nettoyage nocturne (AP-TECH-168). Lecture par les membres de
--      l'exploitation ; seule la fonction serveur « nettoyer-stockage » (clé de service) y écrit.
--   3. photos_a_nettoyer(p_jours) : fichiers du stockage des photos qu'aucune fiche n'utilise depuis plus de p_jours
--      jours (7 par défaut), pour la fonction serveur seulement (AP-TECH-166).
-- Dépendances : 004 (visite_photos, stockage), 008 (exploitations), 014 (règles d'accès, audit), 015 (ruchers),
--   019 (dernière version de rattachements()).
-- Casse ou non l'ancienne version : NE CASSE PAS. L'ancienne version remplit toujours visite_id ; elle ignore les
--   photos sans visite (ses vignettes sont filtrées par visite) et les deux colonnes nouvelles. Seule différence : une
--   photo de colonie ou de rucher n'apparaît que dans la nouvelle version.
-- Relançable (if not exists, create or replace, contraintes posées une seule fois).

-- 1. Photos rattachées à une colonie ou à un rucher -------------------------------------------------------------------
alter table public.visite_photos add column if not exists colonie_id uuid references public.ruches(id) on delete cascade;
alter table public.visite_photos add column if not exists rucher_id uuid references public.ruchers(id) on delete cascade;
alter table public.visite_photos alter column visite_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'visite_photos_rattachee' and conrelid = 'public.visite_photos'::regclass) then
    alter table public.visite_photos add constraint visite_photos_rattachee check (num_nonnulls(visite_id, colonie_id, rucher_id) >= 1);
  end if;
end $$;

create index if not exists visite_photos_colonie_idx on public.visite_photos (colonie_id) where colonie_id is not null;
create index if not exists visite_photos_rucher_idx on public.visite_photos (rucher_id) where rucher_id is not null;

-- Rattachements dans la même exploitation (clés composites, comme 019).
do $$
declare r record;
begin
  for r in select * from (values ('visite_photos', 'colonie_id', 'ruches'), ('visite_photos', 'rucher_id', 'ruchers')) v(enfant, colonne, parent)
  loop
    if not exists (select 1 from pg_constraint where conname = r.enfant || '_' || r.colonne || '_meme_exploitation') then
      execute format('alter table public.%I add constraint %I foreign key (%I, exploitation_id) references public.%I (id, exploitation_id) on delete cascade',
                     r.enfant, r.enfant || '_' || r.colonne || '_meme_exploitation', r.colonne, r.parent);
    end if;
  end loop;
end $$;

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
         ('colonie_contenants', 'contenant_id', 'contenants'),
         ('mouvements_stock', 'article_id', 'articles'), ('mouvements_stock', 'depense_id', 'depenses'),
         ('mouvements_stock', 'lot_id', 'lots'),
         ('reines', 'colonie_id', 'ruches'), ('colonie_liens', 'parent_id', 'ruches'),
         ('colonie_liens', 'enfant_id', 'ruches'), ('colonie_liens', 'evenement_id', 'ruche_evenements'),
         ('visite_photos', 'colonie_id', 'ruches'), ('visite_photos', 'rucher_id', 'ruchers');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

-- 2. Journal du nettoyage du stockage ---------------------------------------------------------------------------------
create table if not exists public.nettoyages_stockage (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null references public.exploitations(id) on delete cascade,
  fait_le timestamptz not null default now(),
  statut text not null check (statut in ('fait', 'rien', 'echec', 'simule')),
  fichiers int not null default 0 check (fichiers >= 0),
  octets bigint not null default 0 check (octets >= 0),
  detail text not null default '' check (length(detail) <= 500)
);
create index if not exists nettoyages_stockage_exploitation_idx on public.nettoyages_stockage (exploitation_id, fait_le desc);

-- Lecture seule pour les membres (lecteurs compris) de l'exploitation choisie ; aucune écriture depuis l'application.
revoke all on public.nettoyages_stockage from anon, authenticated;
grant select on public.nettoyages_stockage to authenticated;
grant select, insert, delete on public.nettoyages_stockage to service_role;
alter table public.nettoyages_stockage enable row level security;
drop policy if exists lire on public.nettoyages_stockage;
create policy lire on public.nettoyages_stockage for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));

-- 3. Fichiers à retirer, pour la fonction serveur « nettoyer-stockage » (clé de service) ----------------------------------
-- Un fichier n'est candidat que s'il est rangé sous le dossier d'une exploitation qui existe (les très anciens chemins
-- sans dossier d'exploitation ne sont jamais touchés), qu'aucune ligne de visite_photos ne l'utilise, et qu'il a plus
-- de p_jours jours (une photo en cours d'envoi a son fichier avant sa ligne : le délai la protège).
-- security invoker : la clé de service lit déjà tout le stockage ; aucun autre rôle ne peut l'appeler.
create or replace function public.photos_a_nettoyer(p_jours int default 7)
returns table (exploitation_id uuid, chemin text, octets bigint, cree_le timestamptz)
language sql stable security invoker set search_path = '' as $$
  select e.id, o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
    from storage.objects o
    join public.exploitations e on e.id::text = split_part(o.name, '/', 1)
   where o.bucket_id = 'photos-visites'
     and o.created_at < now() - make_interval(days => greatest(coalesce(p_jours, 7), 1))
     and not exists (select 1 from public.visite_photos p where p.chemin = o.name)
   order by e.id, o.created_at;
$$;
revoke all on function public.photos_a_nettoyer(int) from public, anon, authenticated;
grant execute on function public.photos_a_nettoyer(int) to service_role;
