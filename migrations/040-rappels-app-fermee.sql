-- Apiviz — migration 040 : rappels même quand Apiviz est fermée (v5.87, maquette « apiviz — Onboarding irréprochable »,
-- écran 9, validé par Pierre-Louis le 24 nov. 2026 : « Ok pour les notifications »).
--
-- Contenu :
--   1. abonnements_push : un appareil abonné aux notifications (Web Push) d'une personne, avec les types choisis
--      (ruches à visiter, créneau météo, gestes de saison). Chacun ne voit et n'efface que ses propres appareils.
--   2. abonner_push(p) / desabonner_push(p_endpoint) : enregistrer, mettre à jour ou retirer un appareil.
--   3. notifications_envoyees : ce qui a été envoyé à qui (type, clé), pour ne jamais dépasser deux rappels par semaine
--      ni répéter le même. Écrite et lue seulement par la fonction serveur « rappels » (rôle de service).
-- Dépendances : 008 (mon_email).
-- Casse l'ancienne version : NON (tables et fonctions nouvelles).
-- Relançable : oui (if not exists, create or replace, drop … if exists).
-- Sécurité : RLS ; l'adresse d'un abonnement est toujours celle de la personne connectée (jamais fournie par
--   l'application) ; notifications_envoyees sans droit pour l'application ; fonctions security definer, search_path vide.
-- Données personnelles : l'adresse technique de l'appareil (endpoint et clés, fournies par le navigateur) ; effacée en
--   retirant les rappels, en se déconnectant de l'appareil ou avec le compte.
-- Retour arrière : revenir au code précédent suffit ; les tables peuvent rester.

-- 1. Appareils abonnés --------------------------------------------------------------------------------------------------
create table if not exists public.abonnements_push (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email <> ''),
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  types jsonb not null default '{"visites": true, "meteo": true, "saison": true}'::jsonb,
  plateforme text not null default '' check (length(plateforme) <= 20),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists abonnements_push_email_idx on public.abonnements_push (email);
alter table public.abonnements_push enable row level security;
drop policy if exists abonnements_push_lire on public.abonnements_push;
create policy abonnements_push_lire on public.abonnements_push for select to authenticated
  using (email = public.mon_email() and email <> '');
drop policy if exists abonnements_push_effacer on public.abonnements_push;
create policy abonnements_push_effacer on public.abonnements_push for delete to authenticated
  using (email = public.mon_email() and email <> '');
revoke all on public.abonnements_push from public, anon;
grant select, delete on public.abonnements_push to authenticated;

-- 2. S'abonner, se désabonner --------------------------------------------------------------------------------------------
-- p = { endpoint, p256dh, auth, types: { visites, meteo, saison }, plateforme }
create or replace function public.abonner_push(p jsonb)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_types jsonb := jsonb_build_object(
    'visites', coalesce((p->'types'->>'visites')::boolean, true),
    'meteo', coalesce((p->'types'->>'meteo')::boolean, true),
    'saison', coalesce((p->'types'->>'saison')::boolean, true));
  v_id uuid;
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  insert into public.abonnements_push as a (email, endpoint, p256dh, auth, types, plateforme)
  values (v_email, p->>'endpoint', p->>'p256dh', p->>'auth', v_types, left(coalesce(p->>'plateforme', ''), 20))
  on conflict (endpoint) do update
    set email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth, types = excluded.types,
        plateforme = excluded.plateforme, maj_le = now()
  returning a.id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.abonner_push(jsonb) from public, anon;
grant execute on function public.abonner_push(jsonb) to authenticated;

create or replace function public.desabonner_push(p_endpoint text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.abonnements_push a where a.endpoint = p_endpoint and a.email = public.mon_email() and public.mon_email() <> '';
$$;
revoke execute on function public.desabonner_push(text) from public, anon;
grant execute on function public.desabonner_push(text) to authenticated;

-- 3. Rappels envoyés ------------------------------------------------------------------------------------------------------
create table if not exists public.notifications_envoyees (
  id bigint generated always as identity primary key,
  email text not null,
  type text not null check (type in ('visites', 'meteo', 'saison')),
  cle text not null default '',
  envoye_le timestamptz not null default now()
);
create index if not exists notifications_envoyees_email_idx on public.notifications_envoyees (email, envoye_le desc);
alter table public.notifications_envoyees enable row level security;
revoke all on public.notifications_envoyees from public, anon, authenticated;
comment on table public.notifications_envoyees is 'Rappels envoyés (fonction « rappels », rôle de service) : deux par semaine au plus, jamais deux fois le même. Migration 040.';
