-- Apiviz — migration 025 : la facture d'un achat, gardée avec lui (corrections du 17 nov. 2026, maquettes validées
-- par Pierre-Louis : écran « Factures » et « Joindre la facture (photo ou PDF) »).
--
-- Contenu :
--   1. depenses.fichier : chemin du fichier de la facture dans l'espace « factures » (vide : pas de fichier). Toutes les
--      lignes d'un même achat (achat_id, 018) portent le même chemin.
--   2. Espace de stockage privé « factures » : PDF, JPEG, PNG ou WebP, 10 Mo au plus par fichier (même limite que la
--      lecture des factures par API, v5.52). Chemin : « <exploitation>/<achat>/<nom> ».
--   3. Accès : comme les photos de visite (008, 014). Les membres de l'exploitation voient ses factures ; un responsable
--      ou un membre en ajoute, remplace ou supprime ; un lecteur les consulte seulement.
-- Dépendances : 000 à 024 (achat_id et piece de 018, mon_email() de 008).
-- Casse l'ancienne version : NON.
--   - Une colonne facultative (défaut '') : l'ancienne version ne la lit ni ne l'envoie.
--   - Un nouvel espace de stockage et ses règles : rien d'existant n'est modifié.
-- Relançable : oui (add column if not exists, on conflict, create or replace, drop policy if exists).
-- Sécurité : peut_facture() et peut_facture_ecrire() en security definer, search_path vide, ne disent que oui ou non ;
--   exécutables par les seuls comptes connectés. L'espace n'est pas public : les fichiers s'ouvrent par un lien
--   temporaire signé.
-- Retour arrière : revenir au code précédent suffit ; la colonne et l'espace peuvent rester en place.

-- 1. Chemin du fichier ---------------------------------------------------------------------------------------------------
alter table public.depenses add column if not exists fichier text not null default '';

-- 2. Espace de stockage --------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('factures', 'factures', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Accès : le premier dossier du chemin est l'exploitation -------------------------------------------------------------
create or replace function public.peut_facture(p_nom text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m
                 where m.email = public.mon_email() and m.email <> ''
                   and m.exploitation_id::text = split_part(p_nom, '/', 1));
$$;

create or replace function public.peut_facture_ecrire(p_nom text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m
                 where m.email = public.mon_email() and m.email <> '' and m.role in ('responsable', 'membre')
                   and m.exploitation_id::text = split_part(p_nom, '/', 1));
$$;

revoke all on function public.peut_facture(text), public.peut_facture_ecrire(text) from public, anon;
grant execute on function public.peut_facture(text), public.peut_facture_ecrire(text) to authenticated;

drop policy if exists factures_lire on storage.objects;
drop policy if exists factures_ajouter on storage.objects;
drop policy if exists factures_modifier on storage.objects;
drop policy if exists factures_supprimer on storage.objects;
create policy factures_lire on storage.objects for select to authenticated
  using (bucket_id = 'factures' and public.peut_facture(name));
create policy factures_ajouter on storage.objects for insert to authenticated
  with check (bucket_id = 'factures' and public.peut_facture_ecrire(name));
create policy factures_modifier on storage.objects for update to authenticated
  using (bucket_id = 'factures' and public.peut_facture_ecrire(name))
  with check (bucket_id = 'factures' and public.peut_facture_ecrire(name));
create policy factures_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'factures' and public.peut_facture_ecrire(name));
