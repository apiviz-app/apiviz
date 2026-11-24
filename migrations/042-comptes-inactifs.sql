-- Apiviz — migration 042 : comptes inactifs et e-mails (v5.90). Décision de Pierre-Louis du 24 nov. 2026 :
-- « 3 ans, avec préavis » (suppression d'un compte sans activité depuis 3 ans, un mois après un préavis) et « Oui, service
-- européen » (e-mails envoyés par Brevo). Recommandation n° 3 de l'analyse « mise sur le marché » (RGPD : durée de
-- conservation ; CGV : confirmations par e-mail).
--
-- Contenu :
--   1. comptes_a_supprimer.motif : « demande » (041, la personne l'a demandé) ou « inactivite » (préavis envoyé).
--   2. derniere_activite : un jour par personne, la dernière fois qu'Apiviz a été ouverte (pas de rubrique, pas d'heure).
--      Nécessaire à la durée de conservation : noté même si la personne refuse les statistiques (039).
--      signaler_activite() (personne connectée) : note le jour et annule un préavis d'inactivité en cours.
--   3. ma_suppression() (041) : rend aussi le motif.
--   4. Pour la fonction « supprimer-comptes » (rôle de service seulement) :
--      inactifs_a_prevenir(p_limite) : comptes sans activité depuis 3 ans, sans demande en cours (équipe Apiviz exclue) ;
--      prevenir_inactif(p_email) : enregistre le préavis (effacement 30 jours plus tard, exploitations partagées laissées
--      aux autres membres) ; retirer_preavis(p_email) : l'annule si l'e-mail n'a pas pu partir ;
--      suppressions_dues() (041) : écarte un préavis d'inactivité si la personne est revenue entre-temps ;
--      entretien_comptes() : retire ces préavis caducs et les traces de 042 des comptes qui n'existent plus.
--   5. courriels_envoyes : journal des e-mails envoyés (nature, date ; jamais le contenu), preuve du préavis et garde
--      contre les envois répétés ; courriel_a_envoyer(p_email, p_nature, p_delai) pour les fonctions serveur.
-- Dépendances : 008 (mon_email), 021 (profils), 029 (administrateurs_apiviz), 041 (comptes_a_supprimer).
-- Casse l'ancienne version : NON. ma_suppression garde ses clés (une de plus) ; le reste est nouveau.
-- Relançable : oui (if not exists, create or replace, drop … if exists).
-- Sécurité : security definer, search_path vide ; une personne ne touche que sa propre ligne (mon_email()) ; tout le
--   reste n'est exécutable que par le rôle de service. Tables fermées à l'application (protection par ligne sans règle).
-- Retour arrière : revenir au code précédent suffit (les préavis ne partent que par la fonction serveur, avec Brevo
--   configuré) ; un préavis s'annule à la main : delete from public.comptes_a_supprimer where motif = 'inactivite' and email = '…'.

-- 1. Motif d'une demande de suppression ----------------------------------------------------------------------------------
alter table public.comptes_a_supprimer add column if not exists motif text not null default 'demande';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'comptes_a_supprimer_motif_check') then
    alter table public.comptes_a_supprimer add constraint comptes_a_supprimer_motif_check check (motif in ('demande', 'inactivite'));
  end if;
end $$;

-- 2. Dernière activité ------------------------------------------------------------------------------------------------------
create table if not exists public.derniere_activite (
  email text primary key check (email = lower(email) and email <> ''),
  jour date not null default ((now() at time zone 'Europe/Paris')::date)
);
alter table public.derniere_activite enable row level security;
revoke all on public.derniere_activite from public, anon, authenticated;

-- Rend vrai si un préavis d'inactivité vient d'être annulé (l'application le dit à la personne).
create or replace function public.signaler_activite()
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_annule int;
begin
  if v_email = '' then return false; end if;
  insert into public.derniere_activite as d (email, jour) values (v_email, v_jour)
  on conflict (email) do update set jour = excluded.jour where d.jour < excluded.jour;
  delete from public.comptes_a_supprimer c where c.email = v_email and c.motif = 'inactivite';
  get diagnostics v_annule = row_count;
  return v_annule > 0;
end;
$$;
revoke execute on function public.signaler_activite() from public, anon;
grant execute on function public.signaler_activite() to authenticated;

-- 3. ma_suppression (041), avec le motif -----------------------------------------------------------------------------------
create or replace function public.ma_suppression()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('demande_le', c.demande_le, 'effacement_le', c.effacement_le, 'choix', c.choix, 'motif', c.motif)
  from public.comptes_a_supprimer c where c.email = public.mon_email() and public.mon_email() <> '';
$$;
revoke execute on function public.ma_suppression() from public, anon;
grant execute on function public.ma_suppression() to authenticated;

-- 4. Pour la fonction « supprimer-comptes » ----------------------------------------------------------------------------------
-- Dernière trace d'une personne : jour noté par l'application, dernière connexion, création du compte.
-- plpgsql : les colonnes de auth.users ne sont lues qu'à l'appel.
create or replace function public.inactifs_a_prevenir(p_limite integer default 50)
returns table (email text, prenom text, derniere date)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
  select x.email, x.prenom, x.derniere from (
    select lower(u.email) as email, coalesce(nullif(btrim(p.prenom), ''), '') as prenom,
           greatest(coalesce(u.last_sign_in_at, u.created_at)::date, d.jour) as derniere
    from auth.users u
    left join public.derniere_activite d on d.email = lower(u.email)
    left join public.profils p on p.email = lower(u.email)
    where coalesce(u.email, '') <> ''
      and not exists (select 1 from public.comptes_a_supprimer c where c.email = lower(u.email))
      and not exists (select 1 from public.administrateurs_apiviz a where lower(a.email) = lower(u.email))
  ) x
  where x.derniere < (now() at time zone 'Europe/Paris')::date - interval '3 years'
  order by x.derniere
  limit greatest(0, least(coalesce(p_limite, 50), 200));
end;
$$;
revoke execute on function public.inactifs_a_prevenir(integer) from public, anon, authenticated;
grant execute on function public.inactifs_a_prevenir(integer) to service_role;

create or replace function public.prevenir_inactif(p_email text)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_uid uuid;
  v_quand timestamptz;
begin
  if v_email = '' then return null; end if;
  select u.id into v_uid from auth.users u where lower(u.email) = v_email limit 1;
  if v_uid is null then return null; end if;
  insert into public.comptes_a_supprimer (email, uid, motif, choix) values (v_email, v_uid, 'inactivite', '{}'::jsonb)
  on conflict (email) do nothing
  returning effacement_le into v_quand;
  return v_quand;
end;
$$;
revoke execute on function public.prevenir_inactif(text) from public, anon, authenticated;
grant execute on function public.prevenir_inactif(text) to service_role;

create or replace function public.retirer_preavis(p_email text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.comptes_a_supprimer c where c.email = lower(btrim(coalesce(p_email, ''))) and c.motif = 'inactivite';
$$;
revoke execute on function public.retirer_preavis(text) from public, anon, authenticated;
grant execute on function public.retirer_preavis(text) to service_role;

-- Une personne revenue depuis le préavis (jour noté ou connexion) n'est jamais effacée pour inactivité.
create or replace function public.revenu_depuis(p_email text, p_depuis timestamptz)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r boolean;
begin
  select exists (select 1 from public.derniere_activite d where d.email = p_email and d.jour > (p_depuis at time zone 'Europe/Paris')::date)
      or exists (select 1 from auth.users u where lower(u.email) = p_email and u.last_sign_in_at > p_depuis)
    into r;
  return r;
end;
$$;
revoke execute on function public.revenu_depuis(text, timestamptz) from public, anon, authenticated;
grant execute on function public.revenu_depuis(text, timestamptz) to service_role;

create or replace function public.suppressions_dues()
returns table (email text, effacees uuid[])
language sql stable security definer set search_path = '' as $$
  select c.email, coalesce(array_agg(m.exploitation_id) filter (where
           not exists (select 1 from public.membres m2 where m2.exploitation_id = m.exploitation_id and m2.email <> c.email)
           or coalesce(c.choix ->> m.exploitation_id::text, '') = 'tout'), '{}')
  from public.comptes_a_supprimer c left join public.membres m on m.email = c.email
  where c.effacement_le <= now()
    and not (c.motif = 'inactivite' and public.revenu_depuis(c.email, c.demande_le))
  group by c.email;
$$;
revoke execute on function public.suppressions_dues() from public, anon, authenticated;
grant execute on function public.suppressions_dues() to service_role;

-- 5. Journal des e-mails -------------------------------------------------------------------------------------------------
create table if not exists public.courriels_envoyes (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(email) and email <> ''),
  nature text not null check (nature in ('preavis-inactivite', 'suppression-demandee', 'resiliation')),
  envoye_le timestamptz not null default now()
);
create index if not exists courriels_envoyes_email on public.courriels_envoyes (email, nature, envoye_le desc);
alter table public.courriels_envoyes enable row level security;
revoke all on public.courriels_envoyes from public, anon, authenticated;

-- Vrai (et noté) si aucun e-mail de cette nature n'est parti vers cette adresse depuis p_delai ; faux sinon.
create or replace function public.courriel_a_envoyer(p_email text, p_nature text, p_delai interval default interval '1 hour')
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email = '' then return false; end if;
  if exists (select 1 from public.courriels_envoyes c where c.email = v_email and c.nature = p_nature and c.envoye_le > now() - p_delai) then
    return false;
  end if;
  insert into public.courriels_envoyes (email, nature) values (v_email, p_nature);
  return true;
end;
$$;
revoke execute on function public.courriel_a_envoyer(text, text, interval) from public, anon, authenticated;
grant execute on function public.courriel_a_envoyer(text, text, interval) to service_role;

-- Entretien de nuit : préavis caducs (personne revenue) et traces de comptes qui n'existent plus.
create or replace function public.entretien_comptes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare a int; b int; c int;
begin
  delete from public.comptes_a_supprimer x where x.motif = 'inactivite' and public.revenu_depuis(x.email, x.demande_le);
  get diagnostics a = row_count;
  delete from public.derniere_activite d where not exists (select 1 from auth.users u where lower(u.email) = d.email);
  get diagnostics b = row_count;
  delete from public.courriels_envoyes e where not exists (select 1 from auth.users u where lower(u.email) = e.email)
    or e.envoye_le < now() - interval '2 years';
  get diagnostics c = row_count;
  return jsonb_build_object('preavis_caducs', a, 'activites_orphelines', b, 'courriels_effaces', c);
end;
$$;
revoke execute on function public.entretien_comptes() from public, anon, authenticated;
grant execute on function public.entretien_comptes() to service_role;
