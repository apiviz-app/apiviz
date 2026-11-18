-- Apiviz — migration 029 : fil de l'équipe (v5.59, maquette « Fil de l'équipe » validée par Pierre-Louis le 17 nov.
-- 2026, « implémente les propositions 5, 6 et 7 » le 18 nov.).
--
-- Contenu :
--   1. messages : ce que les membres s'écrivent dans l'exploitation. Une note (éventuellement sur une ruche), une demande
--      à un membre (« pour » : son e-mail, quand le texte le mentionne par @Prénom), une réponse (parent_id). Une demande
--      prise en charge garde la tâche créée (tache_id) et qui l'a prise (pris_par).
--   2. Accès, comme les autres tables (014) : les membres de l'exploitation lisent ; responsable et membre écrivent ;
--      un lecteur consulte. Seul l'auteur supprime son message ; la prise en charge se fait par prendre_demande().
--   3. prendre_demande(id, tache) : crée la tâche (même identifiant que celui envoyé, pour la file d'envoi) et la relie
--      à la demande, en une transaction. Idempotente : une demande déjà prise renvoie sa tâche.
-- Dépendances : 000 à 028 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer() de 014).
-- Casse l'ancienne version : NON. Une table et une fonction nouvelles ; rien d'existant n'est modifié.
-- Relançable : oui (if not exists, create or replace, drop policy if exists).
-- Sécurité : RLS par exploitation, aucun droit pour anon, audit des modifications et suppressions. prendre_demande en
--   security invoker (les politiques s'appliquent), search_path vide.
-- Retour arrière : revenir au code précédent suffit ; la table peut rester en place.

-- 1. Messages ------------------------------------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  texte text not null check (length(btrim(texte)) between 1 and 1000),
  ruche_id uuid references public.ruches(id) on delete set null,
  pour text not null default '',
  parent_id uuid references public.messages(id) on delete cascade,
  tache_id uuid references public.taches(id) on delete set null,
  pris_par text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists messages_exploitation_idx on public.messages (exploitation_id, created_at desc);
create index if not exists messages_parent_idx on public.messages (parent_id);

-- 2. Accès ---------------------------------------------------------------------------------------------------------------
revoke all on public.messages from anon;
grant select, insert, update, delete on public.messages to authenticated;
alter table public.messages enable row level security;
drop policy if exists lire on public.messages;
drop policy if exists ajouter on public.messages;
drop policy if exists modifier on public.messages;
drop policy if exists supprimer on public.messages;
create policy lire on public.messages for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ajouter on public.messages for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture())
              and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
create policy modifier on public.messages for update to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()))
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy supprimer on public.messages for delete to authenticated
  using (exploitation_id = (select public.exploitation_ecriture())
         and auteur = coalesce((select auth.jwt()) ->> 'email', ''));
drop trigger if exists audit on public.messages;
create trigger audit after update or delete on public.messages for each row execute function public.auditer();

-- 3. Prendre une demande -------------------------------------------------------------------------------------------------
create or replace function public.prendre_demande(p_id uuid, p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  m public.messages%rowtype;
  t uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
begin
  select * into m from public.messages where id = p_id for update;
  if m.id is null then raise exception 'Demande introuvable'; end if;
  if m.tache_id is not null then return m.tache_id; end if;
  if length(btrim(coalesce(p->>'titre', ''))) = 0 then raise exception 'Donne un titre à la tâche.'; end if;
  insert into public.taches (id, titre, echeance, ruche_id, assigne)
  values (t, left(btrim(p->>'titre'), 200), nullif(p->>'echeance', '')::date, m.ruche_id, btrim(coalesce(p->>'assigne', '')));
  update public.messages set tache_id = t, pris_par = coalesce((select auth.jwt()) ->> 'email', '') where id = m.id;
  return t;
end;
$$;
revoke all on function public.prendre_demande(uuid, jsonb) from public, anon;
grant execute on function public.prendre_demande(uuid, jsonb) to authenticated;
