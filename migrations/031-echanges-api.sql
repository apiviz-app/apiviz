-- Apiviz — migration 031 : historique des échanges avec API (v5.62, maquettes « Tes échanges » et « Une conversation »
-- validées par Pierre-Louis le 18 nov. 2026 : « il faudrait garder l'historique des conversations avec API »).
--
-- Contenu :
--   1. api_echanges : une question posée à API et sa réponse (les quatre blocs, en jsonb), rangées par conversation.
--      ruche_id : la ruche dont on parlait (question posée depuis sa fiche). conseils_suivis : les numéros des conseils
--      de la réponse déjà transformés en tâche (ou écartés), pour ne plus les proposer.
--   2. Accès : chacun ne voit, n'ajoute, ne modifie et n'efface que SES échanges, dans l'exploitation courante. Un
--      lecteur (rôle en lecture seule) garde aussi son historique : poser une question à API n'écrit rien d'autre.
--      Pas d'audit : effacer un échange l'efface vraiment (l'audit en garderait une copie).
-- Dépendances : 000 à 030 (exploitation_courante() de 014).
-- Casse l'ancienne version : NON. Une table nouvelle ; rien d'existant n'est modifié. L'ancienne version ne la lit pas.
-- Relançable : oui (if not exists, drop policy if exists).
-- Sécurité : RLS par exploitation ET par auteur (e-mail du jeton), aucun droit pour anon. Taille bornée.
-- Retour arrière : revenir au code précédent suffit ; la table peut rester en place (ou être supprimée : drop table
--   public.api_echanges).

-- 1. Échanges ------------------------------------------------------------------------------------------------------------
create table if not exists public.api_echanges (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  conversation_id uuid not null,
  ruche_id uuid references public.ruches(id) on delete set null,
  question text not null check (length(btrim(question)) between 1 and 1000),
  reponse jsonb not null check (jsonb_typeof(reponse) = 'object' and pg_column_size(reponse) <= 65536),
  mode text not null default '' check (mode in ('', 'rapide', 'approfondi')),
  cout numeric check (cout is null or cout >= 0),
  conseils_suivis jsonb not null default '[]' check (jsonb_typeof(conseils_suivis) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists api_echanges_auteur_idx on public.api_echanges (exploitation_id, auteur, created_at desc);
create index if not exists api_echanges_conversation_idx on public.api_echanges (conversation_id, created_at);

-- 2. Accès ---------------------------------------------------------------------------------------------------------------
revoke all on public.api_echanges from anon;
grant select, insert, update, delete on public.api_echanges to authenticated;
alter table public.api_echanges enable row level security;
drop policy if exists lire on public.api_echanges;
drop policy if exists ajouter on public.api_echanges;
drop policy if exists modifier on public.api_echanges;
drop policy if exists supprimer on public.api_echanges;
create policy lire on public.api_echanges for select to authenticated
  using (exploitation_id = (select public.exploitation_courante())
         and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
create policy ajouter on public.api_echanges for insert to authenticated
  with check (exploitation_id = (select public.exploitation_courante())
              and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
create policy modifier on public.api_echanges for update to authenticated
  using (exploitation_id = (select public.exploitation_courante())
         and auteur = coalesce((select auth.jwt()) ->> 'email', ''))
  with check (exploitation_id = (select public.exploitation_courante())
              and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
create policy supprimer on public.api_echanges for delete to authenticated
  using (exploitation_id = (select public.exploitation_courante())
         and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
