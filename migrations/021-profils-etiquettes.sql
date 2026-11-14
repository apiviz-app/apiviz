-- Apiviz — migration 021 : profil de chaque personne, noms des membres, étiquettes des clients (v5.38, maquettes du
-- 13 nov. 2026 validées le 14 nov. 2026 par Pierre-Louis).
--
-- Contenu :
--   1. profils : une ligne par personne (clé : son adresse e-mail, comme membres). Prénom et nom, demandés une fois à
--      la première connexion et qui suivent le compte (plus de prénom gardé par appareil). Réponses facultatives de
--      l'inscription, pour des statistiques d'ensemble sur les utilisateurs : tranche d'âge, sexe, code postal (et le
--      département qui s'en déduit), ancienneté apicole, « comment as-tu connu Apiviz », activité (loisir,
--      pluriactif, professionnel), tranche de colonies ; choix : utiliser ces réponses dans les statistiques
--      (stats_ok), nouveautés par e-mail (newsletter) ; plateforme (web, ios, android) ; date de fin de l'inscription.
--      Chacun ne lit et n'écrit que sa propre ligne. Personne d'autre (ni associé, ni responsable) ne lit ces réponses.
--   2. noms_membres() : prénom et nom des membres de l'exploitation courante (rien d'autre du profil), pour l'écran
--      Membres et les listes « Acheté par », « Vendu par ». Réservée aux membres de cette exploitation.
--   3. stats_profils : vue d'ensemble pour l'équipe Apiviz (tableau de bord Supabase, rôle de service). Seules les
--      personnes qui l'acceptent (stats_ok) ; aucun groupe de moins de 5 personnes n'est montré. Fermée à l'application
--      (ni anon ni authenticated).
--   4. clients.etiquettes : étiquettes libres d'un client (remplacent les « cercles » à tenir dans les réglages). Les
--      clients existants reçoivent leur cercle comme première étiquette. clients.cercle reste rempli (la première
--      étiquette) pour l'ancienne version.
-- Dépendances : 000, 004 à 020 (mon_email() et est_membre(e) de 008, exploitation_courante()).
-- Casse l'ancienne version : NON.
--   - profils et noms_membres sont nouveaux : l'ancienne version ne les lit pas.
--   - clients.etiquettes est facultative (vide par défaut) ; l'ancienne version continue d'écrire clients.cercle.
-- Relançable : oui (if not exists, create or replace, drop … if exists). Seule la recopie des cercles modifie des
--   lignes existantes, et seulement celles dont les étiquettes sont encore vides.
-- Sécurité : RLS sur profils (propre ligne seulement) ; noms_membres en security definer, search_path vide, ne renvoie
--   que prénom, nom et rôle des membres de l'exploitation courante ; stats_profils sans droit pour l'application.
-- Données personnelles : réponses facultatives, finalité affichée à l'écran (statistiques d'ensemble), modifiables et
--   effaçables dans Mon profil (docs/CONFIDENTIALITE.md, confidentialite.html).
-- Retour arrière : revenir au code précédent suffit ; table, fonction, vue et colonne peuvent rester en place.

-- 1. Profils -----------------------------------------------------------------------------------------------------------
create table if not exists public.profils (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  prenom text not null default '' check (length(prenom) <= 60),
  nom text not null default '' check (length(nom) <= 60),
  tranche_age text not null default '' check (tranche_age in ('', '15-24', '25-34', '35-49', '50-64', '65+')),
  sexe text not null default '' check (sexe in ('', 'femme', 'homme', 'autre', 'nr')),
  code_postal text not null default '' check (code_postal ~ '^([0-9]{5})?$'),
  departement text not null default '' check (length(departement) <= 3),
  pays text not null default 'FR' check (length(pays) = 2),
  anciennete text not null default '' check (anciennete in ('', '0', '1-3', '4-10', '10+')),
  source text not null default '' check (source in ('', 'bouche', 'syndicat', 'rucher-ecole', 'salon', 'reseaux', 'recherche', 'store', 'autre')),
  activite text not null default '' check (activite in ('', 'loisir', 'pluriactif', 'professionnel')),
  colonies text not null default '' check (colonies in ('', '1-10', '11-50', '51-150', '150+')),
  stats_ok boolean not null default true,
  newsletter boolean not null default false,
  plateforme text not null default '' check (plateforme in ('', 'web', 'ios', 'android')),
  inscription_finie timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profils enable row level security;

drop policy if exists profils_lire on public.profils;
create policy profils_lire on public.profils for select to authenticated
  using (email = public.mon_email() and email <> '');
drop policy if exists profils_ajouter on public.profils;
create policy profils_ajouter on public.profils for insert to authenticated
  with check (email = public.mon_email() and email <> '');
drop policy if exists profils_modifier on public.profils;
create policy profils_modifier on public.profils for update to authenticated
  using (email = public.mon_email() and email <> '') with check (email = public.mon_email());
drop policy if exists profils_effacer on public.profils;
create policy profils_effacer on public.profils for delete to authenticated
  using (email = public.mon_email() and email <> '');

revoke all on public.profils from anon;
grant select, insert, update, delete on public.profils to authenticated;

-- Le département se déduit du code postal (Corse : 2A ou 2B ; outre-mer : trois chiffres) ; updated_at suit.
create or replace function public.profils_avant() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.code_postal = '' then
    new.departement := '';
  elsif new.code_postal ~ '^97' then
    new.departement := left(new.code_postal, 3);
  elsif new.code_postal ~ '^20' then
    new.departement := case when new.code_postal < '20200' then '2A' else '2B' end;
  else
    new.departement := left(new.code_postal, 2);
  end if;
  return new;
end;
$$;
drop trigger if exists profils_avant on public.profils;
create trigger profils_avant before insert or update on public.profils
  for each row execute function public.profils_avant();

-- 2. Noms des membres de l'exploitation courante -------------------------------------------------------------------------
create or replace function public.noms_membres()
returns table (email text, prenom text, nom text, role text)
language sql stable security definer set search_path = '' as $$
  select m.email, coalesce(p.prenom, ''), coalesce(p.nom, ''), m.role
  from public.membres m
  left join public.profils p on p.email = m.email
  where m.exploitation_id = public.exploitation_courante()
    and public.exploitation_courante() is not null
  order by m.created_at;
$$;
revoke execute on function public.noms_membres() from public, anon;
grant execute on function public.noms_membres() to authenticated;

-- 3. Statistiques d'ensemble (équipe Apiviz seulement) ------------------------------------------------------------------
create or replace view public.stats_profils as
  with p as (select * from public.profils where stats_ok)
  select 'age' as question, tranche_age as reponse, count(*)::int as personnes from p where tranche_age <> '' group by tranche_age having count(*) >= 5
  union all select 'sexe', sexe, count(*)::int from p where sexe <> '' group by sexe having count(*) >= 5
  union all select 'departement', departement, count(*)::int from p where departement <> '' group by departement having count(*) >= 5
  union all select 'anciennete', anciennete, count(*)::int from p where anciennete <> '' group by anciennete having count(*) >= 5
  union all select 'source', source, count(*)::int from p where source <> '' group by source having count(*) >= 5
  union all select 'activite', activite, count(*)::int from p where activite <> '' group by activite having count(*) >= 5
  union all select 'colonies', colonies, count(*)::int from p where colonies <> '' group by colonies having count(*) >= 5
  union all select 'plateforme', plateforme, count(*)::int from p where plateforme <> '' group by plateforme having count(*) >= 5
  union all select 'mois_inscription', to_char(created_at, 'YYYY-MM'), count(*)::int from p group by 2 having count(*) >= 5;
revoke all on public.stats_profils from public, anon, authenticated;

-- 4. Étiquettes des clients ---------------------------------------------------------------------------------------------
alter table public.clients add column if not exists etiquettes text[] not null default '{}';
update public.clients set etiquettes = array[cercle]
  where etiquettes = '{}' and coalesce(cercle, '') <> '';
