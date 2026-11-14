-- 022 · Supprimer son compte depuis l'application (14 nov. 2026)
--
-- Pourquoi : depuis la v5.38, on crée son compte dans l'app. Le RGPD (droit à l'effacement, art. 17) et les règles des
-- boutiques (App Store 5.1.1 (v), Google Play) demandent qu'on puisse aussi le supprimer soi-même, sans écrire à
-- quelqu'un. Jusqu'ici, l'écran « Supprimer mon compte » renvoyait vers une adresse e-mail.
--
-- Ce que fait la suppression, pour la personne connectée (adresse e-mail vérifiée) :
--   1. Chaque exploitation dont elle est la seule personne inscrite est effacée, avec toutes ses données (suppression
--      en cascade, comme partout depuis 008). Les fichiers des photos sont effacés avant par l'application (le stockage
--      ne s'efface pas en SQL) : compte_a_supprimer() lui en donne la liste.
--   2. Dans chaque exploitation partagée, elle est retirée des membres ; les données restent à l'exploitation. Si elle
--      en était la dernière responsable, la personne inscrite depuis le plus longtemps le devient (un membre avant un
--      lecteur). Son adresse est retirée des traces (auteur du journal d'audit, créateur des liens d'invitation).
--   3. Son profil (021), son ancienne ligne d'accès (membres_v1) et son compte de connexion (auth.users) sont effacés.
--
-- Fonctions :
--   - compte_a_supprimer() : ce qui sera effacé ou quitté, et les chemins des photos à effacer. Ne change rien.
--   - supprimer_mon_compte(p_confirmation text) : fait la suppression. p_confirmation doit valoir « SUPPRIMER »,
--     pour qu'un appel par erreur ne puisse rien effacer.
--
-- Compatibilité : additive (deux fonctions), ne casse pas l'ancienne version, qui ne les appelle pas. Relançable.
-- Sécurité : security definer, search_path vide, n'agit que sur l'adresse vérifiée de la personne connectée (mon_email())
--   et son identifiant (auth.uid()) ; exécutables seulement par un compte connecté. Le propriétaire (postgres) peut
--   effacer dans auth.users (vérifié sur apidoo-test le 14 nov. 2026) ; aucune table de l'application n'y est liée.

create or replace function public.compte_a_supprimer()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  return jsonb_build_object(
    'effacees', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'nom', e.nom,
               'colonies', (select count(*) from public.ruches r where r.exploitation_id = e.id)) order by e.nom)
      from public.exploitations e
      where exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email = v_email)
        and not exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email <> v_email)), '[]'::jsonb),
    'quittees', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'nom', e.nom) order by e.nom)
      from public.exploitations e
      where exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email = v_email)
        and exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email <> v_email)), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(p.chemin)
      from public.visite_photos p
      where p.exploitation_id in (
        select m.exploitation_id from public.membres m where m.email = v_email
        except
        select m.exploitation_id from public.membres m where m.email <> v_email)), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.compte_a_supprimer() from public, anon;
grant execute on function public.compte_a_supprimer() to authenticated;

create or replace function public.supprimer_mon_compte(p_confirmation text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_uid uuid := auth.uid();
  v_effacees int := 0;
  v_quittees int := 0;
  e record;
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if coalesce(p_confirmation, '') <> 'SUPPRIMER' then
    raise exception 'Confirmation manquante : écris SUPPRIMER' using errcode = '22023';
  end if;

  for e in select m.exploitation_id as id, m.role from public.membres m where m.email = v_email loop
    if not exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email <> v_email) then
      -- 1. Seule personne inscrite : l'exploitation et toutes ses données partent (cascade).
      delete from public.exploitations x where x.id = e.id;
      v_effacees := v_effacees + 1;
    else
      -- 2. Exploitation partagée : on la quitte, sans la laisser sans responsable.
      delete from public.membres m where m.exploitation_id = e.id and m.email = v_email;
      if not exists (select 1 from public.membres m where m.exploitation_id = e.id and m.role = 'responsable') then
        update public.membres m set role = 'responsable'
        where (m.exploitation_id, m.email) = (
          select m2.exploitation_id, m2.email from public.membres m2 where m2.exploitation_id = e.id
          order by (m2.role = 'membre') desc, m2.created_at, m2.email limit 1);
      end if;
      update public.journal_audit a set auteur = '' where a.exploitation_id = e.id and a.auteur = v_email;
      update public.invitations i set cree_par = '' where i.exploitation_id = e.id and i.cree_par = v_email;
      v_quittees := v_quittees + 1;
    end if;
  end loop;

  -- 3. Profil, ancienne liste d'accès, compte de connexion.
  delete from public.profils p where p.email = v_email;
  delete from public.membres_v1 m where m.email = v_email;
  if v_uid is not null then delete from auth.users u where u.id = v_uid; end if;

  return jsonb_build_object('effacees', v_effacees, 'quittees', v_quittees);
end;
$$;
revoke execute on function public.supprimer_mon_compte(text) from public, anon;
grant execute on function public.supprimer_mon_compte(text) to authenticated;
