-- Apiviz — migration 029 : offres, abonnements et gouttes d'API (IT-27, première partie, AP-FEAT-117 et 119).
--
-- Décisions du 18 nov. 2026 (Pierre-Louis, maquette « Apiviz — Offres et IA ») :
--   - trois offres : Découverte (0 €, 30 gouttes par mois), Rucher (39 € par an, 200), Exploitation (119 € par an, 600) ;
--   - l'IA se paie en gouttes : 1 goutte = 1 centime d'euro de ce que l'IA coûte vraiment. Chaque réponse retire son coût
--     réel, calculé par la fonction serveur à partir des jetons consommés ; une réponse en échec ne retire rien ;
--   - les gouttes sont partagées par toute l'exploitation (détail par membre) ;
--   - pas encore de vrai paiement : un responsable peut démarrer un essai de 30 jours, une fois ; le reste (offre payée,
--     recharge) est activé par l'équipe Apiviz (table administrateurs_apiviz). Le paiement web et les stores viendront
--     dans la deuxième partie d'IT-27 (décisions D-13 et D-14).
--
-- Contenu :
--   1. offres : le catalogue (prix, gouttes du mois, limites indicatives). Lisible par tous, modifiable seulement par
--      l'éditeur SQL : changer un prix ou un nombre de gouttes ne demande pas de nouvelle version.
--   2. abonnements : une ligne par exploitation (offre, statut, échéance, canal). Sans ligne : Découverte.
--   3. gouttes_mouvements : chaque dépense (question, facture), recharge ou ajustement, avec sa réserve (forfait ou
--      recharge). Les gouttes du forfait se renouvellent chaque mois (heure de Paris) sans écriture : le solde du forfait
--      est l'allocation de l'offre moins les dépenses du mois. Les recharges ne se perdent pas d'un mois à l'autre.
--   4. administrateurs_apiviz : adresses de l'équipe Apiviz. Remplie à la main, jamais par l'application.
--   5. Fonctions : mon_offre(), gouttes_disponibles(), gouttes_debiter(), demarrer_essai(), resilier_abonnement(),
--      admin_definir_offre(), admin_crediter_gouttes().
-- Limites (ruches, membres) : affichées seulement. Aucune ne bloque une saisie ni la lecture (AP-US-130).
-- Dépendances : 008 (exploitations, est_membre, est_responsable, exploitation_courante, mon_email), 016 (ruches.statut).
-- Casse l'ancienne version : NON. Tables et fonctions nouvelles ; l'ancienne version ne les utilise pas, et la fonction
--   serveur « assistant » garde son ancien comportement tant que cette migration manque.
-- Relançable : oui (if not exists, create or replace, on conflict do nothing, drop policy if exists).
-- Sécurité :
--   - RLS sur les quatre tables ; aucune écriture directe pour authenticated ni anon.
--   - Les fonctions qui écrivent sont en security definer, search_path vide, et contrôlent elles-mêmes qui appelle :
--     gouttes_debiter n'accepte qu'une quantité positive (on ne peut que dépenser ses propres gouttes) ; demarrer_essai et
--     resilier_abonnement demandent d'être responsable ; admin_* demandent d'être dans administrateurs_apiviz.

-- 1. Catalogue ---------------------------------------------------------------------------------------------------------
create table if not exists public.offres (
  id text primary key check (id ~ '^[a-z]{2,30}$'),
  nom text not null,
  ordre integer not null default 0,
  prix_mois_cts integer not null default 0 check (prix_mois_cts >= 0),
  prix_an_cts integer not null default 0 check (prix_an_cts >= 0),
  gouttes_mois integer not null default 0 check (gouttes_mois >= 0),
  ruches_max integer check (ruches_max is null or ruches_max > 0),
  membres_max integer check (membres_max is null or membres_max > 0),
  essai_jours integer not null default 0 check (essai_jours >= 0),
  avantages text[] not null default '{}',
  active boolean not null default true
);
comment on table public.offres is 'Catalogue des offres Apiviz (prix TTC en centimes, gouttes d''API par mois, limites indicatives). Migration 029.';
alter table public.offres enable row level security;
drop policy if exists lire_offres on public.offres;
create policy lire_offres on public.offres for select to anon, authenticated using (true);
revoke all on public.offres from anon, authenticated;
grant select on public.offres to anon, authenticated;

insert into public.offres (id, nom, ordre, prix_mois_cts, prix_an_cts, gouttes_mois, ruches_max, membres_max, essai_jours, avantages) values
  ('decouverte', 'Découverte', 1, 0, 0, 30, 10, 2, 0,
   array['Visites, stock de miel, ventes, comptes', 'Hors ligne au rucher']),
  ('rucher', 'Rucher', 2, 390, 3900, 200, 50, 5, 30,
   array['API lit tes factures et remplit tes achats', 'Étiquettes de pots, commandes en ligne', 'Export comptable']),
  ('exploitation', 'Exploitation', 3, 1190, 11900, 600, null, null, 30,
   array['Plusieurs exploitations, rôles et journal d''audit', 'Registre d''élevage et traçabilité complète', 'Réponse sous 48 h au support'])
on conflict (id) do nothing;

-- 2. Abonnements -------------------------------------------------------------------------------------------------------
create table if not exists public.abonnements (
  exploitation_id uuid primary key references public.exploitations(id) on delete cascade,
  offre text not null references public.offres(id),
  statut text not null check (statut in ('essai', 'actif', 'resilie')),
  canal text not null default 'manuel' check (canal in ('manuel', 'web', 'apple', 'google')),
  debut timestamptz not null default now(),
  fin timestamptz,
  essai_utilise boolean not null default false,
  externe text,
  maj_le timestamptz not null default now(),
  maj_par text not null default ''
);
comment on table public.abonnements is 'Offre de chaque exploitation. Sans ligne, ou échue : Découverte. fin = fin d''essai ou échéance ; null = sans fin. Migration 029.';
alter table public.abonnements enable row level security;
drop policy if exists voir_abonnement on public.abonnements;
create policy voir_abonnement on public.abonnements for select to authenticated using (public.est_membre(exploitation_id));
revoke all on public.abonnements from anon, authenticated;
grant select on public.abonnements to authenticated;

-- 3. Gouttes -----------------------------------------------------------------------------------------------------------
create table if not exists public.gouttes_mouvements (
  id bigint generated always as identity primary key,
  exploitation_id uuid not null references public.exploitations(id) on delete cascade,
  le timestamptz not null default now(),
  mois date not null default (date_trunc('month', now() at time zone 'Europe/Paris'))::date,
  nature text not null check (nature in ('question', 'facture', 'recharge', 'ajustement')),
  reserve text not null check (reserve in ('forfait', 'recharge')),
  quantite numeric(12, 2) not null check (quantite <> 0),
  email text not null default '',
  detail jsonb not null default '{}'::jsonb
);
comment on table public.gouttes_mouvements is 'Gouttes d''API : dépenses (négatives) et recharges (positives). 1 goutte = 1 centime de coût IA réel. Aucun contenu de question conservé. Migration 029.';
create index if not exists gouttes_mouvements_mois on public.gouttes_mouvements (exploitation_id, mois);
alter table public.gouttes_mouvements enable row level security;
drop policy if exists voir_gouttes on public.gouttes_mouvements;
create policy voir_gouttes on public.gouttes_mouvements for select to authenticated using (public.est_membre(exploitation_id));
revoke all on public.gouttes_mouvements from anon, authenticated;
grant select on public.gouttes_mouvements to authenticated;

-- 4. Équipe Apiviz -----------------------------------------------------------------------------------------------------
create table if not exists public.administrateurs_apiviz (email text primary key check (email = lower(email) and email <> ''));
comment on table public.administrateurs_apiviz is 'Équipe Apiviz : peut changer l''offre et créditer des gouttes, en attendant le paiement. Remplie à la main. Migration 029.';
alter table public.administrateurs_apiviz enable row level security;
revoke all on public.administrateurs_apiviz from anon, authenticated;

create or replace function public.est_admin_apiviz() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administrateurs_apiviz a where a.email = lower(public.mon_email()) and public.mon_email() <> '');
$$;
revoke execute on function public.est_admin_apiviz() from public, anon;
grant execute on function public.est_admin_apiviz() to authenticated;

-- 5. Calculs -----------------------------------------------------------------------------------------------------------
-- Offre en vigueur : l'abonnement s'il n'est pas échu (un abonnement résilié court jusqu'à sa fin), sinon Découverte.
create or replace function public.offre_en_vigueur(e uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select a.offre from public.abonnements a
                   where a.exploitation_id = e and ((a.fin is null and a.statut <> 'resilie') or a.fin > now())), 'decouverte');
$$;
revoke execute on function public.offre_en_vigueur(uuid) from public, anon, authenticated;

create or replace function public.gouttes_solde(e uuid, out forfait integer, out forfait_restant numeric, out recharge numeric)
language sql stable security definer set search_path = '' as $$
  select o.gouttes_mois,
         greatest(0, o.gouttes_mois + coalesce((select sum(g.quantite) from public.gouttes_mouvements g
           where g.exploitation_id = e and g.reserve = 'forfait'
             and g.mois = (date_trunc('month', now() at time zone 'Europe/Paris'))::date), 0)),
         coalesce((select sum(g.quantite) from public.gouttes_mouvements g where g.exploitation_id = e and g.reserve = 'recharge'), 0)
  from public.offres o where o.id = public.offre_en_vigueur(e);
$$;
revoke execute on function public.gouttes_solde(uuid) from public, anon, authenticated;

-- Gouttes disponibles pour l'exploitation choisie (forfait du mois + recharges) ; null si on n'en est pas membre.
create or replace function public.gouttes_disponibles() returns numeric
language plpgsql stable security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante(); s record;
begin
  if e is null then return null; end if;
  select * into s from public.gouttes_solde(e);
  return coalesce(s.forfait_restant, 0) + coalesce(s.recharge, 0);
end;
$$;
revoke execute on function public.gouttes_disponibles() from public, anon;
grant execute on function public.gouttes_disponibles() to authenticated;

-- Dépense : d'abord le forfait du mois, puis les recharges (qui peuvent passer un peu sous zéro sur la dernière
-- réponse : elle a déjà été servie). Renvoie les gouttes restantes. Appelée par les fonctions serveur après une réponse.
create or replace function public.gouttes_debiter(p_quantite numeric, p_nature text, p_detail jsonb default '{}'::jsonb) returns numeric
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante(); s record; q numeric; f numeric;
begin
  if e is null then raise exception 'Choisis une exploitation dont tu es membre.' using errcode = '42501'; end if;
  if p_quantite is null or p_quantite <= 0 or p_quantite > 1000 then raise exception 'Quantité de gouttes invalide.' using errcode = '22023'; end if;
  if p_nature not in ('question', 'facture') then raise exception 'Nature de dépense invalide.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('gouttes:' || e::text));
  q := round(p_quantite, 2);
  if q = 0 then q := 0.01; end if;
  select * into s from public.gouttes_solde(e);
  f := least(q, coalesce(s.forfait_restant, 0));
  if f > 0 then
    insert into public.gouttes_mouvements (exploitation_id, nature, reserve, quantite, email, detail)
    values (e, p_nature, 'forfait', -f, lower(public.mon_email()), coalesce(p_detail, '{}'::jsonb));
  end if;
  if q - f > 0 then
    insert into public.gouttes_mouvements (exploitation_id, nature, reserve, quantite, email, detail)
    values (e, p_nature, 'recharge', -(q - f), lower(public.mon_email()), coalesce(p_detail, '{}'::jsonb));
  end if;
  return coalesce(s.forfait_restant, 0) + coalesce(s.recharge, 0) - q;
end;
$$;
revoke execute on function public.gouttes_debiter(numeric, text, jsonb) from public, anon;
grant execute on function public.gouttes_debiter(numeric, text, jsonb) to authenticated;

-- Tout l'écran « Mon offre » en un appel, pour l'exploitation choisie.
create or replace function public.mon_offre() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante(); s record; a public.abonnements; m date := (date_trunc('month', now() at time zone 'Europe/Paris'))::date;
begin
  if e is null then raise exception 'Choisis une exploitation dont tu es membre.' using errcode = '42501'; end if;
  select * into s from public.gouttes_solde(e);
  select * into a from public.abonnements where exploitation_id = e;
  return jsonb_build_object(
    'offre', public.offre_en_vigueur(e),
    'abonnement', case when a.exploitation_id is null then null else jsonb_build_object(
      'offre', a.offre, 'statut', a.statut, 'canal', a.canal, 'debut', a.debut, 'fin', a.fin, 'essai_utilise', a.essai_utilise) end,
    'gouttes', jsonb_build_object('forfait', s.forfait, 'forfait_restant', s.forfait_restant, 'recharge', s.recharge,
      'total', coalesce(s.forfait_restant, 0) + coalesce(s.recharge, 0),
      'renouvellement', (m + interval '1 month')::date),
    'mois', jsonb_build_object(
      'par_nature', coalesce((select jsonb_agg(jsonb_build_object('nature', nature, 'nb', nb, 'gouttes', g) order by nature)
        from (select nature, count(distinct le) nb, -sum(quantite) g from public.gouttes_mouvements
              where exploitation_id = e and mois = m and quantite < 0 and nature in ('question', 'facture') group by nature) x), '[]'::jsonb),
      'par_membre', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'gouttes', g) order by g desc)
        from (select email, -sum(quantite) g from public.gouttes_mouvements
              where exploitation_id = e and mois = m and quantite < 0 and nature in ('question', 'facture') group by email) x), '[]'::jsonb)),
    'usage', jsonb_build_object(
      'ruches', (select count(*) from public.ruches r where r.exploitation_id = e and coalesce(r.statut, 'active') = 'active'),
      'membres', (select count(*) from public.membres mb where mb.exploitation_id = e)),
    'responsable', public.est_responsable(e),
    'admin', public.est_admin_apiviz());
end;
$$;
revoke execute on function public.mon_offre() from public, anon;
grant execute on function public.mon_offre() to authenticated;

-- 6. Changements d'offre -------------------------------------------------------------------------------------------------
-- Essai gratuit : une fois par exploitation, par un responsable, sur une offre qui en propose un.
create or replace function public.demarrer_essai(p_offre text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante(); o public.offres; a public.abonnements;
begin
  if e is null or not public.est_responsable(e) then raise exception 'Seul un responsable de l''exploitation peut changer d''offre.' using errcode = '42501'; end if;
  select * into o from public.offres where id = p_offre and active;
  if o.id is null or o.essai_jours = 0 then raise exception 'Cette offre ne propose pas d''essai.' using errcode = '22023'; end if;
  select * into a from public.abonnements where exploitation_id = e for update;
  if a.essai_utilise then raise exception 'L''essai gratuit a déjà été utilisé pour cette exploitation.' using errcode = '22023'; end if;
  if public.offre_en_vigueur(e) <> 'decouverte' then raise exception 'Une offre est déjà en cours.' using errcode = '22023'; end if;
  insert into public.abonnements as x (exploitation_id, offre, statut, canal, debut, fin, essai_utilise, maj_le, maj_par)
  values (e, o.id, 'essai', 'manuel', now(), now() + make_interval(days => o.essai_jours), true, now(), lower(public.mon_email()))
  on conflict (exploitation_id) do update set offre = excluded.offre, statut = 'essai', canal = 'manuel', debut = now(),
    fin = excluded.fin, essai_utilise = true, maj_le = now(), maj_par = excluded.maj_par;
  return public.mon_offre();
end;
$$;
revoke execute on function public.demarrer_essai(text) from public, anon;
grant execute on function public.demarrer_essai(text) to authenticated;

-- Résiliation : un essai s'arrête tout de suite ; une offre payée court jusqu'à son échéance (sans échéance : tout de suite).
create or replace function public.resilier_abonnement() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := public.exploitation_courante();
begin
  if e is null or not public.est_responsable(e) then raise exception 'Seul un responsable de l''exploitation peut résilier.' using errcode = '42501'; end if;
  update public.abonnements set statut = 'resilie',
    fin = case when statut = 'essai' or fin is null or fin < now() then now() else fin end,
    maj_le = now(), maj_par = lower(public.mon_email())
  where exploitation_id = e and statut <> 'resilie';
  return public.mon_offre();
end;
$$;
revoke execute on function public.resilier_abonnement() from public, anon;
grant execute on function public.resilier_abonnement() to authenticated;

-- Équipe Apiviz : poser une offre (statut actif ou essai, échéance libre) sur l'exploitation choisie ou une autre.
create or replace function public.admin_definir_offre(p_offre text, p_statut text default 'actif', p_fin timestamptz default null, p_exploitation uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := coalesce(p_exploitation, public.exploitation_courante());
begin
  if not public.est_admin_apiviz() then raise exception 'Réservé à l''équipe Apiviz.' using errcode = '42501'; end if;
  if e is null or not exists (select 1 from public.exploitations where id = e) then raise exception 'Exploitation introuvable.' using errcode = '22023'; end if;
  if not exists (select 1 from public.offres where id = p_offre) then raise exception 'Offre inconnue.' using errcode = '22023'; end if;
  if p_statut not in ('essai', 'actif', 'resilie') then raise exception 'Statut invalide.' using errcode = '22023'; end if;
  insert into public.abonnements as x (exploitation_id, offre, statut, canal, debut, fin, maj_le, maj_par)
  values (e, p_offre, p_statut, 'manuel', now(), p_fin, now(), lower(public.mon_email()))
  on conflict (exploitation_id) do update set offre = excluded.offre, statut = excluded.statut, canal = 'manuel',
    debut = now(), fin = excluded.fin, maj_le = now(), maj_par = excluded.maj_par;
  return case when public.est_membre(e) and e = public.exploitation_courante() then public.mon_offre() else jsonb_build_object('offre', public.offre_en_vigueur(e)) end;
end;
$$;
revoke execute on function public.admin_definir_offre(text, text, timestamptz, uuid) from public, anon;
grant execute on function public.admin_definir_offre(text, text, timestamptz, uuid) to authenticated;

-- Équipe Apiviz : créditer (recharge) ou retirer (ajustement) des gouttes.
create or replace function public.admin_crediter_gouttes(p_quantite numeric, p_motif text default '', p_exploitation uuid default null) returns numeric
language plpgsql volatile security definer set search_path = '' as $$
declare e uuid := coalesce(p_exploitation, public.exploitation_courante()); s record;
begin
  if not public.est_admin_apiviz() then raise exception 'Réservé à l''équipe Apiviz.' using errcode = '42501'; end if;
  if e is null or not exists (select 1 from public.exploitations where id = e) then raise exception 'Exploitation introuvable.' using errcode = '22023'; end if;
  if p_quantite is null or p_quantite = 0 or abs(p_quantite) > 100000 then raise exception 'Quantité de gouttes invalide.' using errcode = '22023'; end if;
  insert into public.gouttes_mouvements (exploitation_id, nature, reserve, quantite, email, detail)
  values (e, case when p_quantite > 0 then 'recharge' else 'ajustement' end, 'recharge', round(p_quantite, 2), lower(public.mon_email()),
          jsonb_build_object('motif', left(coalesce(p_motif, ''), 200), 'canal', 'manuel'));
  select * into s from public.gouttes_solde(e);
  return coalesce(s.forfait_restant, 0) + coalesce(s.recharge, 0);
end;
$$;
revoke execute on function public.admin_crediter_gouttes(numeric, text, uuid) from public, anon;
grant execute on function public.admin_crediter_gouttes(numeric, text, uuid) to authenticated;
