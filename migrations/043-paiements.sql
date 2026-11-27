-- Apiviz — migration 043 : paiement des offres par carte (Stripe), en attendant l'achat intégré des stores
-- (IT-27, deuxième partie, décisions D-13 et D-14).
--
-- Principe :
--   - l'application ne touche jamais au paiement : la fonction serveur « paiement » ouvre la page de paiement Stripe
--     (Checkout) ou l'espace client Stripe (gérer la carte, les factures, résilier) ;
--   - Stripe prévient la fonction serveur « stripe-webhook », qui relit l'abonnement chez Stripe puis l'écrit ici avec
--     appliquer_abonnement_externe() (canal « web »). Les mêmes colonnes et la même fonction serviront aux achats
--     Apple et Google (canaux « apple » et « google ») ;
--   - un abonnement payé se gère là où il a été pris : resilier_abonnement() le refuse et renvoie vers Stripe ou le store.
--
-- Contenu :
--   1. abonnements.periode : « mois » ou « an » (rien pour les abonnements manuels et les essais sans carte) ;
--   2. paiements_clients : le client Stripe (ou l'identifiant du store) de chaque exploitation, pour ne pas en créer un
--      à chaque passage ;
--   3. paiements_evenements : les notifications déjà traitées (Stripe peut renvoyer la même plusieurs fois) ;
--   4. appliquer_abonnement_externe(jsonb) : écrit l'abonnement d'une exploitation, appelée par les fonctions serveur ;
--   5. resilier_abonnement() : refuse les abonnements web, Apple et Google ;
--   6. crediter_gouttes_payees() : ajoute les gouttes d'une recharge payée, une seule fois par paiement.
-- Dépendances : 029 (offres, abonnements, mon_offre, est_responsable).
-- Casse l'ancienne version : NON. Colonne, tables et fonction nouvelles ; resilier_abonnement garde sa signature et son
--   comportement pour les abonnements manuels et les essais. L'ancienne version n'affiche aucun bouton de paiement.
-- Relançable : oui (if not exists, create or replace, drop ... if exists).
-- Sécurité :
--   - paiements_clients et paiements_evenements : RLS sans politique, aucun droit pour anon ni authenticated ;
--   - appliquer_abonnement_externe et crediter_gouttes_payees : security definer, search_path vide, exécutable par service_role seulement.

-- 1. Période de paiement --------------------------------------------------------------------------------------------
alter table public.abonnements add column if not exists periode text;
alter table public.abonnements drop constraint if exists abonnements_periode_check;
alter table public.abonnements add constraint abonnements_periode_check check (periode is null or periode in ('mois', 'an'));

-- 2. Clients chez le prestataire de paiement --------------------------------------------------------------------------
create table if not exists public.paiements_clients (
  exploitation_id uuid not null references public.exploitations(id) on delete cascade,
  source text not null check (source in ('stripe', 'apple', 'google')),
  client text not null check (length(client) between 3 and 200),
  cree_le timestamptz not null default now(),
  primary key (exploitation_id, source)
);
comment on table public.paiements_clients is 'Client Stripe (ou du store) de chaque exploitation. Écrit par les fonctions serveur. Migration 043.';
alter table public.paiements_clients enable row level security;
revoke all on public.paiements_clients from anon, authenticated;

-- 3. Notifications déjà traitées --------------------------------------------------------------------------------------
create table if not exists public.paiements_evenements (
  id text primary key check (length(id) between 3 and 200),
  source text not null check (source in ('stripe', 'apple', 'google')),
  type text not null default '',
  exploitation_id uuid references public.exploitations(id) on delete set null,
  recu_le timestamptz not null default now()
);
comment on table public.paiements_evenements is 'Notifications de paiement déjà traitées (idempotence). Écrit par les fonctions serveur. Migration 043.';
create index if not exists paiements_evenements_exploitation on public.paiements_evenements (exploitation_id);
alter table public.paiements_evenements enable row level security;
revoke all on public.paiements_evenements from anon, authenticated;

-- 4. Écrire un abonnement venu de Stripe ou d'un store ----------------------------------------------------------------
-- p : { exploitation_id, canal (web|apple|google), offre, statut (essai|actif|resilie), fin (date ISO ou null),
--       externe (identifiant de l'abonnement chez le prestataire), periode (mois|an|null) }.
-- Un abonnement résilié qui n'est pas celui en place (ancien abonnement, autre canal) ne change rien : il ne doit pas
-- couper l'abonnement actuel. Renvoie l'offre en vigueur après écriture, ou null si rien n'a changé.
create or replace function public.appliquer_abonnement_externe(p jsonb) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  e uuid := nullif(p ->> 'exploitation_id', '')::uuid;
  v_canal text := p ->> 'canal';
  v_offre text := p ->> 'offre';
  v_statut text := p ->> 'statut';
  v_fin timestamptz := nullif(p ->> 'fin', '')::timestamptz;
  v_externe text := nullif(p ->> 'externe', '');
  v_periode text := nullif(p ->> 'periode', '');
  a public.abonnements;
begin
  if e is null or not exists (select 1 from public.exploitations where id = e) then raise exception 'Exploitation introuvable.' using errcode = '22023'; end if;
  if v_canal is null or v_canal not in ('web', 'apple', 'google') then raise exception 'Canal invalide.' using errcode = '22023'; end if;
  if v_statut is null or v_statut not in ('essai', 'actif', 'resilie') then raise exception 'Statut invalide.' using errcode = '22023'; end if;
  if v_offre is null or not exists (select 1 from public.offres where id = v_offre) then raise exception 'Offre inconnue.' using errcode = '22023'; end if;
  if v_externe is null then raise exception 'Identifiant d''abonnement manquant.' using errcode = '22023'; end if;
  if v_periode is not null and v_periode not in ('mois', 'an') then v_periode := null; end if;

  select * into a from public.abonnements where exploitation_id = e for update;
  if v_statut = 'resilie' and a.exploitation_id is not null
     and (a.canal <> v_canal or a.externe is distinct from v_externe) then
    return null;
  end if;

  insert into public.abonnements as x (exploitation_id, offre, statut, canal, debut, fin, essai_utilise, externe, periode, maj_le, maj_par)
  values (e, v_offre, v_statut, v_canal, now(), v_fin, v_statut = 'essai', v_externe, v_periode, now(), v_canal)
  on conflict (exploitation_id) do update set
    offre = excluded.offre, statut = excluded.statut, canal = excluded.canal,
    debut = case when x.externe is distinct from excluded.externe or x.canal <> excluded.canal then now() else x.debut end,
    fin = excluded.fin, essai_utilise = x.essai_utilise or excluded.essai_utilise,
    externe = excluded.externe, periode = excluded.periode, maj_le = now(), maj_par = excluded.maj_par;
  return public.offre_en_vigueur(e);
end;
$$;
revoke execute on function public.appliquer_abonnement_externe(jsonb) from public, anon, authenticated;
grant execute on function public.appliquer_abonnement_externe(jsonb) to service_role;

-- 5. Résilier : seulement les abonnements manuels et les essais sans carte -------------------------------------------
create or replace function public.resilier_abonnement() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante(); a public.abonnements;
begin
  if e is null or not public.est_responsable(e) then raise exception 'Seul un responsable de l''exploitation peut résilier.' using errcode = '42501'; end if;
  select * into a from public.abonnements where exploitation_id = e;
  if a.canal = 'web' and a.statut <> 'resilie' then
    raise exception 'Cet abonnement se gère dans l''espace de paiement : « Gérer mon abonnement ».' using errcode = '42501';
  end if;
  if a.canal in ('apple', 'google') and a.statut <> 'resilie' then
    raise exception 'Cet abonnement a été pris sur % : il se résilie depuis les réglages du téléphone.',
      case a.canal when 'apple' then 'iPhone' else 'Android' end using errcode = '42501';
  end if;
  update public.abonnements set statut = 'resilie',
    fin = case when statut = 'essai' or fin is null or fin < now() then now() else fin end,
    maj_le = now(), maj_par = lower(public.mon_email())
  where exploitation_id = e and statut <> 'resilie';
  return public.mon_offre();
end;
$$;
revoke execute on function public.resilier_abonnement() from public, anon;
grant execute on function public.resilier_abonnement() to authenticated;

-- 6. Recharge payée : gouttes ajoutées une seule fois par paiement (référence = identifiant du paiement) ------------
-- Renvoie vrai si les gouttes ont été ajoutées, faux si ce paiement l'avait déjà été.
create or replace function public.crediter_gouttes_payees(p_exploitation uuid, p_quantite integer, p_reference text, p_source text default 'stripe', p_email text default '') returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_exploitation is null or not exists (select 1 from public.exploitations where id = p_exploitation) then raise exception 'Exploitation introuvable.' using errcode = '22023'; end if;
  if p_quantite is null or p_quantite <= 0 or p_quantite > 100000 then raise exception 'Quantité de gouttes invalide.' using errcode = '22023'; end if;
  if coalesce(p_reference, '') = '' or p_source not in ('stripe', 'apple', 'google') then raise exception 'Référence de paiement invalide.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('gouttes:' || p_reference));
  if exists (select 1 from public.gouttes_mouvements where exploitation_id = p_exploitation and nature = 'recharge'
             and detail ->> 'paiement' = p_reference) then
    return false;
  end if;
  insert into public.gouttes_mouvements (exploitation_id, nature, reserve, quantite, email, detail)
  values (p_exploitation, 'recharge', 'recharge', p_quantite, lower(coalesce(p_email, '')),
          jsonb_build_object('paiement', p_reference, 'source', p_source));
  return true;
end;
$$;
revoke execute on function public.crediter_gouttes_payees(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.crediter_gouttes_payees(uuid, integer, text, text, text) to service_role;
