-- Apiviz — migration 039 : mieux connaître ses utilisateurs (v5.86, maquette « apiviz — Onboarding irréprochable »,
-- écran 11 et tableau de bord « Mes utilisateurs », validés par Pierre-Louis le 24 nov. 2026).
--
-- Contenu :
--   1. profils.attente : ce que la personne attend d'abord d'Apiviz (suivre ses colonies, vendre, traçabilité, être
--      conseillée). profils.mieux_connaitre_fin : date où la carte « Pour mieux te connaître » a été finie ou refusée
--      (« Ne plus demander »), pour ne pas la reposer sur un autre appareil.
--   2. Sexe : plus demandé (minimisation, recommandation validée le 24 nov. 2026). Les réponses déjà données sont
--      effacées ; la colonne reste (l'ancienne version l'écrit encore) et sort des statistiques.
--   3. activite_jours : une ligne par personne et par jour d'utilisation, avec les rubriques ouvertes et la plateforme.
--      Écrite seulement par noter_activite(), jamais lue par l'application ; rien pour qui a refusé les statistiques
--      (profils.stats_ok). Gardée 400 jours.
--   4. comparaison_departement() : visites du mois de la personne et moyenne des personnes de son département (celles
--      qui acceptent les statistiques), seulement à partir de 5 personnes.
--   5. admin_stats_utilisateurs(p_jours) : chiffres d'ensemble pour l'équipe Apiviz (est_admin_apiviz()) : inscrits,
--      actifs, parcours d'arrivée, sources et retour à 30 jours, colonies, départements, rubriques, taux de réponse.
--      Aucun e-mail ni nom ; tout groupe de moins de 5 personnes est masqué ou regroupé.
--   6. stats_profils (021) refaite : sans le sexe, avec l'attente.
-- Dépendances : 021 (profils), 029 (est_admin_apiviz), 008 (membres, mon_email).
-- Casse l'ancienne version : NON. Colonnes nouvelles avec valeur par défaut ; l'ancienne version peut encore écrire le
--   sexe (accepté, mais plus montré ni compté). Table et fonctions nouvelles.
-- Relançable : oui (if not exists, create or replace, drop … if exists). L'effacement des sexes ne touche que les
--   lignes encore remplies.
-- Sécurité : activite_jours sans aucun droit pour l'application (RLS, pas de politique) ; fonctions security definer,
--   search_path vide ; admin_stats_utilisateurs refuse toute personne hors administrateurs_apiviz.
-- Données personnelles : finalité écrite dans la politique de confidentialité (statistiques d'ensemble) ; chacun peut
--   refuser (stats_ok) : plus rien n'est noté, et ses jours déjà notés sont effacés.
-- Retour arrière : revenir au code précédent suffit ; colonnes, table et fonctions peuvent rester.

-- 1. Profil : attente, fin de la carte ----------------------------------------------------------------------------------
alter table public.profils add column if not exists attente text not null default '';
alter table public.profils drop constraint if exists profils_attente_check;
alter table public.profils add constraint profils_attente_check check (attente in ('', 'suivre', 'vendre', 'tracabilite', 'conseil'));
alter table public.profils add column if not exists mieux_connaitre_fin timestamptz;

-- 2. Sexe : plus demandé, réponses effacées -------------------------------------------------------------------------------
update public.profils set sexe = '' where sexe <> '';

-- 3. Jours d'utilisation ----------------------------------------------------------------------------------------------
create table if not exists public.activite_jours (
  email text not null check (email = lower(email) and email <> ''),
  jour date not null default current_date,
  plateforme text not null default '' check (plateforme in ('', 'web', 'ios', 'android')),
  rubriques text[] not null default '{}',
  primary key (email, jour)
);
alter table public.activite_jours enable row level security;
revoke all on public.activite_jours from public, anon, authenticated;
comment on table public.activite_jours is 'Un jour d''utilisation par personne (rubriques ouvertes), pour les statistiques d''ensemble. Écrite par noter_activite() seulement. Migration 039.';

create or replace function public.noter_activite(p_rubriques text[] default '{}', p_plateforme text default '')
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_ok boolean;
  v_rub text[];
  v_pl text := case when p_plateforme in ('web', 'ios', 'android') then p_plateforme else '' end;
begin
  if v_email = '' then return; end if;
  select p.stats_ok into v_ok from public.profils p where p.email = v_email;
  if v_ok is false then
    delete from public.activite_jours a where a.email = v_email;
    return;
  end if;
  -- Rubriques : mots courts seulement (au plus 20, 24 caractères chacun).
  select coalesce(array_agg(distinct r order by r), '{}') into v_rub
  from (select lower(x) as r from unnest(coalesce(p_rubriques, '{}')) x where x ~ '^[a-z0-9_-]{1,24}$' limit 20) t;
  insert into public.activite_jours as a (email, jour, plateforme, rubriques) values (v_email, current_date, v_pl, v_rub)
  on conflict (email, jour) do update
    set rubriques = (select coalesce(array_agg(distinct r order by r), '{}') from unnest(a.rubriques || excluded.rubriques) r),
        plateforme = coalesce(nullif(excluded.plateforme, ''), a.plateforme);
  delete from public.activite_jours a where a.email = v_email and a.jour < current_date - 400;
end;
$$;
revoke execute on function public.noter_activite(text[], text) from public, anon;
grant execute on function public.noter_activite(text[], text) to authenticated;

-- 4. Comparaison avec son département --------------------------------------------------------------------------------------
-- Visites du mois en cours dans les exploitations de chaque personne (une visite d'une exploitation partagée compte
-- pour chacun de ses membres).
create or replace function public.comparaison_departement()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_dep text;
  v_moi int;
  v_n int;
  v_moy numeric;
  v_debut date := date_trunc('month', current_date)::date;
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select p.departement into v_dep from public.profils p where p.email = v_email;
  if coalesce(v_dep, '') = '' then return jsonb_build_object('departement', '', 'assez', false); end if;
  select count(*) into v_moi from public.visites v
  where v.date_visite >= v_debut and v.exploitation_id in (select m.exploitation_id from public.membres m where m.email = v_email);
  with gens as (select p.email from public.profils p where p.stats_ok and p.departement = v_dep and p.email <> v_email
                  and exists (select 1 from public.membres m where m.email = p.email)),
       parpers as (select g.email, (select count(*) from public.visites v where v.date_visite >= v_debut
                     and v.exploitation_id in (select m.exploitation_id from public.membres m where m.email = g.email)) as n from gens g)
  select count(*), avg(n) into v_n, v_moy from parpers;
  if v_n < 5 then return jsonb_build_object('departement', v_dep, 'assez', false, 'moi', v_moi); end if;
  return jsonb_build_object('departement', v_dep, 'assez', true, 'moi', v_moi, 'moyenne', round(v_moy, 1), 'personnes', v_n);
end;
$$;
revoke execute on function public.comparaison_departement() from public, anon;
grant execute on function public.comparaison_departement() to authenticated;

-- 5. Tableau de bord de l'équipe ---------------------------------------------------------------------------------------------
create or replace function public.admin_stats_utilisateurs(p_jours int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  j int := greatest(1, least(coalesce(p_jours, 30), 3650));
  depuis timestamptz := now() - make_interval(days => j);
  r jsonb;
begin
  if not public.est_admin_apiviz() then raise exception 'Réservé à l''équipe Apiviz' using errcode = '42501'; end if;
  with
  p as (select * from public.profils),
  ok as (select * from p where stats_ok),
  -- Ce que chaque personne a fait : rucher (une ruche dans une de ses exploitations), visite, jours d'utilisation.
  faits as (
    select x.email, x.created_at, x.inscription_finie, x.source, x.stats_ok,
      exists (select 1 from public.membres m join public.ruches ru on ru.exploitation_id = m.exploitation_id where m.email = x.email) as rucher,
      exists (select 1 from public.membres m join public.visites v on v.exploitation_id = m.exploitation_id where m.email = x.email) as visite,
      exists (select 1 from public.activite_jours a where a.email = x.email and a.jour >= (x.created_at + interval '7 days')::date) as j7,
      exists (select 1 from public.activite_jours a where a.email = x.email and a.jour >= (x.created_at + interval '30 days')::date) as j30
    from ok x),
  recents as (select * from faits where created_at >= depuis),
  anciens as (select * from faits where created_at <= now() - interval '30 days'),
  actifs as (select distinct a.email from public.activite_jours a where a.jour >= (now() - make_interval(days => j))::date),
  rub as (select r0 as rubrique, count(distinct a.email) as n from public.activite_jours a, unnest(a.rubriques) r0
          where a.jour >= (now() - make_interval(days => j))::date group by r0),
  -- Groupes : au moins 5 personnes, sinon regroupés (« autres ») ou masqués.
  src as (select f.source as k, count(*) as n, count(*) filter (where f.j30) as revenus, count(*) filter (where f.created_at <= now() - interval '30 days') as mesurables
          from faits f where f.stats_ok and f.source <> '' group by f.source),
  dep as (select departement as k, count(*) as n from ok where departement <> '' group by departement),
  col as (select colonies as k, count(*) as n from ok where colonies <> '' group by colonies),
  att as (select attente as k, count(*) as n from ok where attente <> '' group by attente)
  select jsonb_build_object(
    'jours', j,
    'inscrits', (select count(*) from p),
    'nouveaux', (select count(*) from recents),
    'actifs_semaine', (select count(distinct a.email) from public.activite_jours a where a.jour >= current_date - 6),
    'actifs_periode', (select count(*) from actifs),
    'premiere_visite', (select case when count(*) >= 5 then round(100.0 * count(*) filter (where visite) / count(*)) end from recents),
    'retour_30', (select case when count(*) >= 5 then round(100.0 * count(*) filter (where j30) / count(*)) end from anciens),
    'parcours', (select case when count(*) >= 5 then jsonb_build_array(
        jsonb_build_object('k', 'compte', 'n', count(*)),
        jsonb_build_object('k', 'profil', 'n', count(*) filter (where inscription_finie is not null)),
        jsonb_build_object('k', 'rucher', 'n', count(*) filter (where rucher)),
        jsonb_build_object('k', 'visite', 'n', count(*) filter (where visite)),
        jsonb_build_object('k', 'j7', 'n', count(*) filter (where j7 and created_at <= now() - interval '7 days'))) end from recents),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n, 'retour', case when mesurables >= 5 then round(100.0 * revenus / mesurables) end) order by n desc)
                from src where n >= 5), '[]'::jsonb),
    'sources_autres', (select coalesce(sum(n), 0) from src where n < 5),
    'colonies', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n) order by k) from col where n >= 5), '[]'::jsonb),
    'attentes', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc) from att where n >= 5), '[]'::jsonb),
    'departements', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc, k) from (select * from dep where n >= 5 order by n desc, k limit 10) d), '[]'::jsonb),
    'departements_autres', (select coalesce(sum(n), 0) from dep) - (select coalesce(sum(n), 0) from (select n from dep where n >= 5 order by n desc, k limit 10) d),
    'rubriques', case when (select count(*) from actifs) >= 5 then coalesce((select jsonb_agg(jsonb_build_object('k', rubrique, 'n', n) order by n desc) from rub where n >= 5), '[]'::jsonb) else '[]'::jsonb end,
    'vendent', (select case when count(*) >= 5 then round(100.0 * count(*) filter (where exists (select 1 from public.ventes v where v.exploitation_id = e.id)) / count(*)) end from public.exploitations e),
    'reponses', (select case when count(*) >= 5 then jsonb_build_object(
        'colonies', round(100.0 * count(*) filter (where colonies <> '') / count(*)),
        'code_postal', round(100.0 * count(*) filter (where code_postal <> '') / count(*)),
        'source', round(100.0 * count(*) filter (where source <> '') / count(*)),
        'anciennete', round(100.0 * count(*) filter (where anciennete <> '') / count(*)),
        'activite', round(100.0 * count(*) filter (where activite <> '') / count(*)),
        'attente', round(100.0 * count(*) filter (where attente <> '') / count(*)),
        'tranche_age', round(100.0 * count(*) filter (where tranche_age <> '') / count(*))) end from ok),
    'refus_stats', (select case when count(*) >= 5 then round(100.0 * count(*) filter (where not stats_ok) / count(*)) end from p)
  ) into r;
  return r;
end;
$$;
revoke execute on function public.admin_stats_utilisateurs(int) from public, anon;
grant execute on function public.admin_stats_utilisateurs(int) to authenticated;

-- 6. Vue d'ensemble (021) : sans le sexe, avec l'attente ------------------------------------------------------------------------
create or replace view public.stats_profils as
  with p as (select * from public.profils where stats_ok)
  select 'age' as question, tranche_age as reponse, count(*)::int as personnes from p where tranche_age <> '' group by tranche_age having count(*) >= 5
  union all select 'departement', departement, count(*)::int from p where departement <> '' group by departement having count(*) >= 5
  union all select 'anciennete', anciennete, count(*)::int from p where anciennete <> '' group by anciennete having count(*) >= 5
  union all select 'source', source, count(*)::int from p where source <> '' group by source having count(*) >= 5
  union all select 'activite', activite, count(*)::int from p where activite <> '' group by activite having count(*) >= 5
  union all select 'colonies', colonies, count(*)::int from p where colonies <> '' group by colonies having count(*) >= 5
  union all select 'attente', attente, count(*)::int from p where attente <> '' group by attente having count(*) >= 5
  union all select 'plateforme', plateforme, count(*)::int from p where plateforme <> '' group by plateforme having count(*) >= 5
  union all select 'mois_inscription', to_char(created_at, 'YYYY-MM'), count(*)::int from p group by 2 having count(*) >= 5;
revoke all on public.stats_profils from public, anon, authenticated;
