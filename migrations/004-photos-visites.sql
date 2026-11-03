-- Apidoo — migration 004 : photos de visite
-- Appliquée le 3 novembre 2026. Peut être relancée sans risque.

-- 1. Liste des photos, rattachées à une visite.
create table if not exists public.visite_photos (
  id uuid primary key default gen_random_uuid(),
  visite_id uuid not null references public.visites(id) on delete cascade,
  chemin text not null unique,          -- emplacement du fichier dans le stockage
  largeur int,
  hauteur int,
  octets int,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists visite_photos_visite_idx on public.visite_photos (visite_id);

grant select, insert, update, delete on public.visite_photos to authenticated;
alter table public.visite_photos enable row level security;
drop policy if exists membres_tout on public.visite_photos;
create policy membres_tout on public.visite_photos for all to authenticated
  using ((select public.est_membre())) with check ((select public.est_membre()));

-- 2. Espace de stockage privé (2 Mo max par fichier, images seulement).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-visites', 'photos-visites', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Seuls les membres peuvent voir, ajouter et supprimer ces fichiers.
drop policy if exists photos_visites_lire on storage.objects;
drop policy if exists photos_visites_ajouter on storage.objects;
drop policy if exists photos_visites_modifier on storage.objects;
drop policy if exists photos_visites_supprimer on storage.objects;

create policy photos_visites_lire on storage.objects for select to authenticated
  using (bucket_id = 'photos-visites' and (select public.est_membre()));
create policy photos_visites_ajouter on storage.objects for insert to authenticated
  with check (bucket_id = 'photos-visites' and (select public.est_membre()));
create policy photos_visites_modifier on storage.objects for update to authenticated
  using (bucket_id = 'photos-visites' and (select public.est_membre()))
  with check (bucket_id = 'photos-visites' and (select public.est_membre()));
create policy photos_visites_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'photos-visites' and (select public.est_membre()));

-- 4. Place occupée par les photos (pour surveiller le quota de 1 Go).
create or replace function public.photos_espace() returns bigint
language sql stable security definer set search_path = '' as $$
  select case when public.est_membre()
    then coalesce(sum((metadata ->> 'size')::bigint), 0) else 0 end
  from storage.objects where bucket_id = 'photos-visites';
$$;
revoke all on function public.photos_espace() from public, anon;
grant execute on function public.photos_espace() to authenticated;
