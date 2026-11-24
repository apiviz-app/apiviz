-- Apiviz — migration 041 : supprimer toutes mes données, en 30 jours annulables (v5.88, maquette « apiviz —
-- Onboarding irréprochable », écrans 12 à 14, demandée et validée par Pierre-Louis le 24 nov. 2026 : « Je veux aussi
-- avoir la possibilité en tant qu'utilisateur de supprimer toutes mes données »).
--
-- Ce qui change par rapport à 022 (suppression immédiate, gardée pour l'ancienne version) :
--   - La demande désactive le compte tout de suite ; l'effacement a lieu 30 jours plus tard (fonction serveur
--     « supprimer-comptes », chaque nuit). Se reconnecter pendant ces 30 jours permet d'annuler.
--   - Pour chaque exploitation partagée, la personne choisit : la laisser aux autres membres (ses traces deviennent
--     « Ancien membre ») ou, si elle en est responsable, la supprimer pour tout le monde (les autres membres voient un
--     bandeau avec la date, pour télécharger les données d'ici là).
--   - Tout ce qui la concerne part aussi : jours d'utilisation (039), appareils abonnés et rappels envoyés (040),
--     échanges avec API (031).
--
-- Contenu :
--   1. comptes_a_supprimer : une demande par personne (date d'effacement, choix par exploitation partagée).
--   2. demander_suppression(p_choix, p_confirmation), annuler_suppression(), ma_suppression() : pour la personne connectée.
--   3. suppressions_annoncees() : exploitations ouvertes à la personne connectée qu'un autre membre a demandé de supprimer
--      pour tout le monde (bandeau).
--   4. compte_a_supprimer() (022) complétée : rôle et autres membres de chaque exploitation partagée.
--   5. effacer_compte(p_email, p_uid, p_choix) : l'effacement lui-même (interne : ni anon ni authenticated).
--      supprimer_mon_compte(p_confirmation) (022) l'appelle désormais : l'ancienne version efface aussi les tables de
--      039 à 041.
--   6. Pour la fonction « supprimer-comptes » (rôle de service seulement) : suppressions_dues(), fichiers_exploitations(),
--      effacer_compte_du(p_email).
-- Dépendances : 022, 031, 039, 040 (tables effacées), 008 (membres, mon_email).
-- Casse l'ancienne version : NON. supprimer_mon_compte et compte_a_supprimer gardent leurs paramètres et les clés
--   qu'elle lit (effacees, quittees, photos) ; le reste est nouveau.
-- Relançable : oui (if not exists, create or replace, drop … if exists).
-- Sécurité : security definer, search_path vide ; une personne n'agit que sur sa propre demande (mon_email(),
--   auth.uid()) ; « supprimer pour tous » demande d'être responsable ; l'effacement n'est exécutable que par le rôle de
--   service. Le propriétaire (postgres) peut effacer dans auth.users (vérifié pour 022 le 14 nov. 2026).
-- Retour arrière : revenir au code précédent suffit ; une demande en cours peut être annulée par la personne, ou à la main
--   (delete from public.comptes_a_supprimer where email = '…').

-- 1. Demandes ------------------------------------------------------------------------------------------------------------
create table if not exists public.comptes_a_supprimer (
  email text primary key check (email = lower(email) and email <> ''),
  uid uuid,
  demande_le timestamptz not null default now(),
  effacement_le timestamptz not null default now() + interval '30 days',
  choix jsonb not null default '{}'::jsonb
);
alter table public.comptes_a_supprimer enable row level security;
drop policy if exists comptes_a_supprimer_lire on public.comptes_a_supprimer;
create policy comptes_a_supprimer_lire on public.comptes_a_supprimer for select to authenticated
  using (email = public.mon_email() and email <> '');
revoke all on public.comptes_a_supprimer from public, anon, authenticated;
grant select on public.comptes_a_supprimer to authenticated;

-- 2. Demander, annuler, voir ----------------------------------------------------------------------------------------------
-- p_choix = { "<exploitation_id>": "laisser" | "tout" } pour les exploitations partagées ; absent = « laisser ».
create or replace function public.demander_suppression(p_choix jsonb default '{}', p_confirmation text default '')
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
  v_choix jsonb := '{}'::jsonb;
  k text;
  v text;
  v_quand timestamptz;
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if coalesce(p_confirmation, '') <> 'SUPPRIMER' then raise exception 'Confirmation manquante' using errcode = '22023'; end if;
  for k, v in select * from jsonb_each_text(coalesce(p_choix, '{}'::jsonb)) loop
    if v not in ('laisser', 'tout') then raise exception 'Choix inconnu : %', v using errcode = '22023'; end if;
    if not exists (select 1 from public.membres m where m.exploitation_id::text = k and m.email = v_email) then
      raise exception 'Tu n''es pas membre de cette exploitation' using errcode = '42501';
    end if;
    if v = 'tout' and not exists (select 1 from public.membres m where m.exploitation_id::text = k and m.email = v_email and m.role = 'responsable') then
      raise exception 'Seul un responsable peut supprimer l''exploitation pour tout le monde' using errcode = '42501';
    end if;
    v_choix := v_choix || jsonb_build_object(k, v);
  end loop;
  insert into public.comptes_a_supprimer as c (email, uid, choix) values (v_email, auth.uid(), v_choix)
  on conflict (email) do update set choix = excluded.choix, uid = coalesce(excluded.uid, c.uid)
  returning c.effacement_le into v_quand;
  return jsonb_build_object('effacement_le', v_quand);
end;
$$;
revoke execute on function public.demander_suppression(jsonb, text) from public, anon;
grant execute on function public.demander_suppression(jsonb, text) to authenticated;

create or replace function public.annuler_suppression()
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.comptes_a_supprimer c where c.email = public.mon_email() and public.mon_email() <> '';
$$;
revoke execute on function public.annuler_suppression() from public, anon;
grant execute on function public.annuler_suppression() to authenticated;

create or replace function public.ma_suppression()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('demande_le', c.demande_le, 'effacement_le', c.effacement_le, 'choix', c.choix)
  from public.comptes_a_supprimer c where c.email = public.mon_email() and public.mon_email() <> '';
$$;
revoke execute on function public.ma_suppression() from public, anon;
grant execute on function public.ma_suppression() to authenticated;

-- 3. Bandeau des autres membres ---------------------------------------------------------------------------------------------
create or replace function public.suppressions_annoncees()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('exploitation_id', e.id, 'nom', e.nom, 'effacement_le', c.effacement_le,
           'par', coalesce(nullif(btrim(p.prenom), ''), 'Un responsable')) order by c.effacement_le), '[]'::jsonb)
  from public.comptes_a_supprimer c
  join public.exploitations e on c.choix ->> e.id::text = 'tout'
  left join public.profils p on p.email = c.email
  where c.email <> public.mon_email()
    and exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email = public.mon_email() and public.mon_email() <> '');
$$;
revoke execute on function public.suppressions_annoncees() from public, anon;
grant execute on function public.suppressions_annoncees() to authenticated;

-- 4. Aperçu (022, complété) ------------------------------------------------------------------------------------------------
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
      select jsonb_agg(jsonb_build_object('id', e.id, 'nom', e.nom,
               'role', (select m.role from public.membres m where m.exploitation_id = e.id and m.email = v_email),
               'colonies', (select count(*) from public.ruches r where r.exploitation_id = e.id),
               'autres', (select jsonb_agg(coalesce(nullif(btrim(p.prenom), ''), split_part(m.email, '@', 1)) order by m.created_at)
                          from public.membres m left join public.profils p on p.email = m.email
                          where m.exploitation_id = e.id and m.email <> v_email)) order by e.nom)
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

-- 5. L'effacement --------------------------------------------------------------------------------------------------------
create or replace function public.effacer_compte(p_email text, p_uid uuid, p_choix jsonb default '{}')
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce(p_email, ''));
  v_effacees int := 0;
  v_quittees int := 0;
  e record;
  t record;
begin
  if v_email = '' then raise exception 'Adresse manquante' using errcode = '22023'; end if;
  -- Échanges avec API : visibles d'elle seule (031), effacés avant d'anonymiser le reste.
  delete from public.api_echanges a where a.auteur = v_email;
  for e in select m.exploitation_id as id from public.membres m where m.email = v_email loop
    if not exists (select 1 from public.membres m where m.exploitation_id = e.id and m.email <> v_email)
       or coalesce(p_choix ->> e.id::text, '') = 'tout' then
      -- Seule personne inscrite, ou suppression pour tout le monde : l'exploitation et toutes ses données (cascade).
      delete from public.exploitations x where x.id = e.id;
      v_effacees := v_effacees + 1;
    else
      -- Exploitation laissée aux autres : on la quitte, sans la laisser sans responsable ; ses traces deviennent anonymes.
      delete from public.membres m where m.exploitation_id = e.id and m.email = v_email;
      if not exists (select 1 from public.membres m where m.exploitation_id = e.id and m.role = 'responsable') then
        update public.membres m set role = 'responsable'
        where (m.exploitation_id, m.email) = (
          select m2.exploitation_id, m2.email from public.membres m2 where m2.exploitation_id = e.id
          order by (m2.role = 'membre') desc, m2.created_at, m2.email limit 1);
      end if;
      update public.journal_audit a set auteur = '' where a.exploitation_id = e.id and a.auteur = v_email;
      update public.invitations i set cree_par = '' where i.exploitation_id = e.id and i.cree_par = v_email;
      update public.membres m set ajoute_par = '' where m.exploitation_id = e.id and m.ajoute_par = v_email;
      -- Toutes les tables de l'exploitation qui gardent l'auteur (adresse e-mail) : « Ancien membre ».
      for t in select c.table_name from information_schema.columns c
               where c.table_schema = 'public' and c.column_name = 'auteur' and c.table_name <> 'journal_audit'
                 and exists (select 1 from information_schema.columns c2 where c2.table_schema = 'public' and c2.table_name = c.table_name and c2.column_name = 'exploitation_id')
                 and exists (select 1 from information_schema.tables tb where tb.table_schema = 'public' and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE') loop
        execute format('update public.%I set auteur = %L where exploitation_id = $1 and auteur = $2', t.table_name, 'Ancien membre') using e.id, v_email;
      end loop;
      v_quittees := v_quittees + 1;
    end if;
  end loop;
  -- Ce qui n'appartient qu'à elle.
  delete from public.activite_jours a where a.email = v_email;
  delete from public.abonnements_push a where a.email = v_email;
  delete from public.notifications_envoyees n where n.email = v_email;
  delete from public.profils p where p.email = v_email;
  delete from public.membres_v1 m where m.email = v_email;
  delete from public.comptes_a_supprimer c where c.email = v_email;
  if p_uid is not null then delete from auth.users u where u.id = p_uid; end if;
  delete from auth.users u where lower(u.email) = v_email;
  return jsonb_build_object('effacees', v_effacees, 'quittees', v_quittees);
end;
$$;
revoke execute on function public.effacer_compte(text, uuid, jsonb) from public, anon, authenticated;

-- 022, même signature : la suppression immédiate de l'ancienne version passe par effacer_compte.
create or replace function public.supprimer_mon_compte(p_confirmation text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text := public.mon_email();
begin
  if v_email = '' then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if coalesce(p_confirmation, '') <> 'SUPPRIMER' then
    raise exception 'Confirmation manquante : écris SUPPRIMER' using errcode = '22023';
  end if;
  return public.effacer_compte(v_email, auth.uid(), '{}'::jsonb);
end;
$$;
revoke execute on function public.supprimer_mon_compte(text) from public, anon;
grant execute on function public.supprimer_mon_compte(text) to authenticated;

-- 6. Pour la fonction « supprimer-comptes » (rôle de service) ------------------------------------------------------------
-- Demandes échues, avec les exploitations qui seront effacées (leurs fichiers partent avant, par l'API du stockage).
create or replace function public.suppressions_dues()
returns table (email text, effacees uuid[])
language sql stable security definer set search_path = '' as $$
  select c.email, coalesce(array_agg(m.exploitation_id) filter (where
           not exists (select 1 from public.membres m2 where m2.exploitation_id = m.exploitation_id and m2.email <> c.email)
           or coalesce(c.choix ->> m.exploitation_id::text, '') = 'tout'), '{}')
  from public.comptes_a_supprimer c left join public.membres m on m.email = c.email
  where c.effacement_le <= now()
  group by c.email;
$$;
revoke execute on function public.suppressions_dues() from public, anon, authenticated;
grant execute on function public.suppressions_dues() to service_role;

create or replace function public.fichiers_exploitations(p_ids uuid[])
returns table (bucket_id text, name text)
language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name from storage.objects o
  where o.bucket_id in ('photos-visites', 'factures') and split_part(o.name, '/', 1) = any (select x::text from unnest(p_ids) x);
$$;
revoke execute on function public.fichiers_exploitations(uuid[]) from public, anon, authenticated;
grant execute on function public.fichiers_exploitations(uuid[]) to service_role;

create or replace function public.effacer_compte_du(p_email text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare c public.comptes_a_supprimer%rowtype;
begin
  select * into c from public.comptes_a_supprimer x where x.email = lower(p_email) and x.effacement_le <= now();
  if not found then return null; end if;
  return public.effacer_compte(c.email, c.uid, c.choix);
end;
$$;
revoke execute on function public.effacer_compte_du(text) from public, anon, authenticated;
grant execute on function public.effacer_compte_du(text) to service_role;
