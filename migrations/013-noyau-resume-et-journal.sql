-- Apidoo — migration 013 : résumé des colonies et journal des erreurs (IT-03).
--
-- Contenu :
--   1. Vue colonies_resume : pour chaque ruche (colonie), la dernière visite, le dernier poids et le dernier comptage
--      varroa, et le nombre de visites. Sert au chargement léger de l'accueil (AP-FEAT-014, AP-TECH-025).
--   2. Table journal_erreurs : erreurs rencontrées dans l'application (version, écran, message), regroupées par
--      empreinte et par minute avec un compteur ; sans e-mail ni donnée métier (AP-FEAT-016, AP-TECH-050).
--   3. Fonction journaliser_erreur(p) : seul moyen d'y écrire ; regroupe, masque les adresses e-mail,
--      et purge les lignes de plus de 90 jours (AP-TECH-053, sans pg_cron).
-- Dépendances : 000, 004 à 012 (ruches.sortie et visites.varroa_* de 009, exploitation_courante() de 008).
-- Casse l'ancienne version : NON. Uniquement des ajouts (une vue, une table, une fonction) ; l'ancienne application
--   ne les utilise pas. La nouvelle application fonctionne aussi sans 013 : sans la vue, elle garde la lecture
--   complète ; sans la fonction, les erreurs restent dans la console du navigateur.
-- Relançable : oui (create or replace, if not exists, drop policy if exists).
-- Sécurité :
--   - colonies_resume est en security_invoker : la RLS des tables ruches et visites (exploitation_courante())
--     s'applique à qui la lit, comme une lecture directe.
--   - journal_erreurs : RLS activée et AUCUNE politique, aucun droit pour anon et authenticated : personne ne la lit
--     ni ne l'écrit par l'API. Lecture par le responsable technique dans l'éditeur SQL de Supabase (décision du
--     6 nov. 2026 ; l'écran de lecture réservé, AP-TECH-052, est reporté).
--   - journaliser_erreur est en security definer : nécessaire, puisque les utilisateurs n'ont aucun droit sur la
--     table (ils ne doivent ni lire les erreurs des autres ni modifier les compteurs). Elle n'écrit que dans
--     journal_erreurs, borne chaque champ, exige une session connectée et a un search_path vide.

-- 1. Résumé des colonies -------------------------------------------------------------------------------------
-- Les sous-requêtes « dernière » s'appuient sur l'index visites (ruche_id, date_visite) de 000.
create or replace view public.colonies_resume with (security_invoker = true) as
select
  r.id as ruche_id,
  r.exploitation_id,
  dv.id as derniere_visite_id,
  dv.date_visite as derniere_visite,
  dv.provisions as dernieres_provisions,
  dp.poids_kg as dernier_poids,
  dp.date_visite as date_dernier_poids,
  dm.varroa as dernier_varroa,
  dm.varroa_abeilles as dernier_varroa_abeilles,
  dm.varroa_methode as dernier_varroa_methode,
  dm.date_visite as date_dernier_varroa,
  (select count(*) from public.visites v where v.ruche_id = r.id) as nb_visites
from public.ruches r
left join lateral (
  select v.id, v.date_visite, v.provisions from public.visites v
  where v.ruche_id = r.id order by v.date_visite desc, v.created_at desc limit 1) dv on true
left join lateral (
  select v.poids_kg, v.date_visite from public.visites v
  where v.ruche_id = r.id and v.poids_kg is not null order by v.date_visite desc, v.created_at desc limit 1) dp on true
left join lateral (
  select v.varroa, v.varroa_abeilles, v.varroa_methode, v.date_visite from public.visites v
  where v.ruche_id = r.id and v.varroa is not null order by v.date_visite desc, v.created_at desc limit 1) dm on true;

-- Lecture seule, membres connectés seulement (Supabase donne par défaut tous les droits à anon et authenticated).
revoke all on public.colonies_resume from anon, authenticated;
grant select on public.colonies_resume to authenticated;

-- 2. Journal des erreurs -------------------------------------------------------------------------------------
create table if not exists public.journal_erreurs (
  id bigint generated always as identity primary key,
  exploitation_id uuid references public.exploitations(id) on delete cascade, -- facultatif : erreur avant le choix
  empreinte text not null,                 -- calculée par l'application : version + écran + message
  minute timestamptz not null,             -- regroupement : une ligne par empreinte et par minute
  version text not null default '',        -- version de l'application (celle du service worker)
  ecran text not null default '',          -- route au moment de l'erreur
  message text not null,                   -- 500 caractères au plus, e-mails masqués
  source text not null default '',         -- fichier:ligne:colonne
  compteur int not null default 1,
  premiere_fois timestamptz not null default now(),
  derniere_fois timestamptz not null default now(),
  unique (empreinte, minute)
);
create index if not exists journal_erreurs_derniere_idx on public.journal_erreurs (derniere_fois);

alter table public.journal_erreurs enable row level security;
revoke all on public.journal_erreurs from anon, authenticated;
-- Aucune politique : sans droit ni politique, l'API ne peut ni lire ni écrire cette table.

-- 3. Écriture regroupée ---------------------------------------------------------------------------------------
-- p : { empreinte, version, ecran, message, source, nombre } ; « nombre » = occurrences regroupées par le téléphone.
create or replace function public.journaliser_erreur(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  courriel constant text := '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}';
  nombre int := least(greatest(coalesce((p ->> 'nombre')::int, 1), 1), 1000);
  e uuid;
begin
  if auth.uid() is null and coalesce(auth.jwt() ->> 'email', '') = '' then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  begin e := public.exploitation_courante(); exception when others then e := null; end;
  insert into public.journal_erreurs as j (exploitation_id, empreinte, minute, version, ecran, message, source, compteur)
  values (
    e,
    left(coalesce(nullif(p ->> 'empreinte', ''), md5(coalesce(p ->> 'message', ''))), 64),
    date_trunc('minute', now()),
    left(coalesce(p ->> 'version', ''), 60),
    left(coalesce(p ->> 'ecran', ''), 40),
    left(regexp_replace(coalesce(nullif(p ->> 'message', ''), '(sans message)'), courriel, '[e-mail]', 'g'), 500),
    left(regexp_replace(coalesce(p ->> 'source', ''), courriel, '[e-mail]', 'g'), 200),
    nombre)
  on conflict (empreinte, minute) do update
    set compteur = least(j.compteur + excluded.compteur, 1000000), derniere_fois = now();
  -- Purge à 90 jours, au fil de l'eau (index sur derniere_fois) : pas de tâche planifiée à entretenir.
  delete from public.journal_erreurs where derniere_fois < now() - interval '90 days';
end;
$$;
revoke all on function public.journaliser_erreur(jsonb) from public, anon;
grant execute on function public.journaliser_erreur(jsonb) to authenticated;
