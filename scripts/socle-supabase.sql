-- Le strict minimum de Supabase sur un Postgres nu, pour relire une sauvegarde de la base Apiviz (schéma public)
-- ailleurs que chez Supabase : essai de restauration de l'action « Sauvegarde », restauration à la main (PROCESSUS.md).
-- Même contenu que SUPABASE dans tests/sql/socle.mjs (tests SQL), plus le schéma « extensions » (btree_gist, 016).
-- Ne pas lancer sur un projet Supabase : ces rôles et schémas y existent déjà.
-- Les rôles valent pour tout le serveur Postgres : créés seulement s'ils manquent.
do $$ declare r text; begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I', r); end if;
  end loop;
end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema auth, storage, public to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
