-- Apidoo — migration 014 : rôles, invitations maîtrisées, intégrité entre exploitations, journal d'audit (IT-04).
--
-- Contenu :
--   1. Rôle « lecteur » : lit tout, n'écrit rien. Politiques séparées lecture / ajout / modification / suppression sur
--      les 16 tables métier et sur l'espace photos ; peut_ecrire() et exploitation_ecriture() (AP-FEAT-011).
--   2. Invitations : rôle donné par le lien, nombre d'usages, révocation ; rejoindre() et invitation_info() les
--      vérifient. Liens existants : usages_max null = illimité jusqu'à l'expiration (AP-FEAT-010).
--   3. Intégrité : creer_visite et creer_vente vérifient que la ruche, le client, les articles et les lots appartiennent
--      à l'exploitation courante ; clés étrangères composites (même exploitation) sur les 14 rattachements existants,
--      posées « not valid » puis validées si les données sont saines ; incoherences_exploitation() pour l'administrateur
--      (AP-FEAT-009). Les fonctions d'écriture refusent un lecteur avec un message clair.
--   4. Journal d'audit : ancienne valeur, auteur et date de chaque suppression ou modification des tables métier ;
--      lecture par les responsables ; restaurer() pour les visites, ventes et dépenses supprimées ; purge à 1 an
--      (AP-FEAT-019).
--   5. Démonstration : exploitations.demo, creer_exploitation_demo(), indicateurs_usage() sans les démos (AP-FEAT-018).
--   6. empreinte_structure() : empreintes de la structure, comparées avant chaque mise en production (AP-TECH-042).
-- Dépendances : 000, 004 à 013 (exploitation_courante(), est_membre(uuid), est_responsable(uuid), membres, invitations,
--   creer_visite/creer_vente de 009, regler/ajouter_stock de 012, numeroter_facture de 010).
-- Casse l'ancienne version : NON.
--   - Les membres et responsables gardent exactement les mêmes droits ; seul le nouveau rôle « lecteur » est limité.
--   - Les liens d'invitation existants restent valables jusqu'à leur expiration, sans limite d'usages.
--   - invitation_info() renvoie deux colonnes de plus (etat, role) : l'ancienne version lit nom et valide, inchangés.
--   - L'ancienne version supprime un lien pour le désactiver : toujours permis.
--   - Les clés composites n'acceptent que ce que l'application fait déjà (rattacher dans la même exploitation).
-- Relançable : oui (if not exists, create or replace, drop … if exists, contraintes ajoutées seulement si absentes).
-- Sécurité :
--   - Nouvelle table journal_audit : RLS, lecture par les responsables de l'exploitation courante, aucune écriture par
--     l'API. Le déclencheur auditer() est en security definer : nécessaire, personne n'a le droit d'écrire dans la
--     table (comme journaliser_erreur en 013). Il n'écrit que dans journal_audit, avec un search_path vide.
--   - peut_ecrire() et peut_photo_ecrire() sont en security definer pour la même raison que est_responsable() (008) :
--     lire la table membres sans dépendre de ses propres politiques.
--   - empreinte_structure() est en security definer et exécutable sans connexion : elle ne renvoie que des empreintes
--     md5 du catalogue (aucune donnée, aucun nom de table en clair).
--   - incoherences_exploitation() et indicateurs_usage() ne sont exécutables par personne via l'API (éditeur SQL seulement).

-- 1. Rôle lecteur ------------------------------------------------------------------------------------------------
alter table public.membres drop constraint if exists membres_role_check;
alter table public.membres add constraint membres_role_check check (role in ('responsable', 'membre', 'lecteur'));

-- Vrai si la personne connectée peut écrire dans cette exploitation (responsable ou membre).
create or replace function public.peut_ecrire(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m
                 where m.exploitation_id = e and m.email = public.mon_email() and m.email <> ''
                   and m.role in ('responsable', 'membre'));
$$;

-- L'exploitation courante, si on peut y écrire ; sinon null (aucune ligne ne correspond, l'écriture est refusée).
create or replace function public.exploitation_ecriture() returns uuid
language sql stable set search_path = '' as $$
  select case when public.peut_ecrire(x.e) then x.e end from (select public.exploitation_courante() as e) x;
$$;

do $$
declare
  t text;
  tables text[] := array['ruches', 'articles', 'visites', 'visite_intrants', 'recoltes', 'lots', 'clients', 'ventes',
                         'vente_lignes', 'depenses', 'reglages', 'fournisseurs', 'taches', 'budgets', 'visite_photos',
                         'ruche_evenements'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists exploitation_courante on public.%I', t);
    execute format('drop policy if exists lire on public.%I', t);
    execute format('drop policy if exists ajouter on public.%I', t);
    execute format('drop policy if exists modifier on public.%I', t);
    execute format('drop policy if exists supprimer on public.%I', t);
    execute format('create policy lire on public.%I for select to authenticated
                      using (exploitation_id = (select public.exploitation_courante()))', t);
    execute format('create policy ajouter on public.%I for insert to authenticated
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy modifier on public.%I for update to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy supprimer on public.%I for delete to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))', t);
  end loop;
end $$;

-- Membres : un responsable peut ajouter un membre ou un lecteur ; un membre ou un lecteur peut se retirer lui-même.
drop policy if exists ajouter on public.membres;
create policy ajouter on public.membres for insert to authenticated
  with check (public.est_responsable(exploitation_id) and role in ('membre', 'lecteur'));
drop policy if exists retirer on public.membres;
create policy retirer on public.membres for delete to authenticated
  using ((public.est_responsable(exploitation_id) and email <> public.mon_email())
         or (email = public.mon_email() and role in ('membre', 'lecteur')));

-- Photos : un lecteur voit les fichiers, il n'en ajoute ni n'en supprime.
create or replace function public.peut_photo_ecrire(p_nom text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres m
                 where m.email = public.mon_email() and m.email <> '' and m.role in ('responsable', 'membre')
                   and (m.exploitation_id::text = split_part(p_nom, '/', 1)
                        or exists (select 1 from public.visite_photos p
                                   where p.chemin = p_nom and p.exploitation_id = m.exploitation_id)));
$$;
drop policy if exists photos_visites_ajouter on storage.objects;
drop policy if exists photos_visites_modifier on storage.objects;
drop policy if exists photos_visites_supprimer on storage.objects;
create policy photos_visites_ajouter on storage.objects for insert to authenticated
  with check (bucket_id = 'photos-visites' and public.peut_photo_ecrire(name));
create policy photos_visites_modifier on storage.objects for update to authenticated
  using (bucket_id = 'photos-visites' and public.peut_photo_ecrire(name))
  with check (bucket_id = 'photos-visites' and public.peut_photo_ecrire(name));
create policy photos_visites_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'photos-visites' and public.peut_photo_ecrire(name));

-- Message unique des fonctions d'écriture, pour un lecteur ou hors de ses exploitations.
create or replace function public.exiger_ecriture() returns uuid
language plpgsql stable set search_path = '' as $$
declare e uuid := public.exploitation_courante();
begin
  if e is null then raise exception 'Aucune exploitation ouverte' using errcode = '42501'; end if;
  if not public.peut_ecrire(e) then
    raise exception 'Tu as un accès en lecture seule à cette exploitation : demande à un responsable.';
  end if;
  return e;
end;
$$;

-- 2. Invitations -------------------------------------------------------------------------------------------------
alter table public.invitations add column if not exists role text not null default 'membre';
alter table public.invitations add column if not exists usages_max int;
alter table public.invitations add column if not exists usages int not null default 0;
alter table public.invitations add column if not exists revoque_le timestamptz;
alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check check (role in ('membre', 'lecteur'));
alter table public.invitations drop constraint if exists invitations_usages_check;
alter table public.invitations add constraint invitations_usages_check
  check (usages >= 0 and (usages_max is null or usages_max >= 1));
grant update (revoque_le) on public.invitations to authenticated;

-- État d'un lien : valide, expire, revoque ou epuise.
create or replace function public.etat_invitation(i public.invitations) returns text
language sql stable set search_path = '' as $$
  select case when i.revoque_le is not null then 'revoque'
              when i.expire_le < now() then 'expire'
              when i.usages_max is not null and i.usages >= i.usages_max then 'epuise'
              else 'valide' end;
$$;

-- Ajoute deux colonnes au résultat : le type de retour change, la fonction est recréée (droits remis plus bas).
drop function if exists public.invitation_info(text);
create function public.invitation_info(p_code text) returns table (nom text, valide boolean, etat text, role text)
language sql stable security definer set search_path = '' as $$
  select e.nom, public.etat_invitation(i) = 'valide', public.etat_invitation(i), i.role
  from public.invitations i join public.exploitations e on e.id = i.exploitation_id
  where i.code = p_code;
$$;

create or replace function public.rejoindre(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.invitations%rowtype; moi text := public.mon_email(); etat text;
begin
  if moi = '' then raise exception 'Confirme d''abord ton adresse e-mail'; end if;
  select * into i from public.invitations where code = p_code for update;
  if i.code is null then raise exception 'Ce lien d''invitation n''existe pas ou plus : demandes-en un nouveau.'; end if;
  -- Déjà membre : le lien ne sert pas une deuxième fois et n'est pas consommé.
  if exists (select 1 from public.membres where exploitation_id = i.exploitation_id and email = moi) then
    return i.exploitation_id;
  end if;
  etat := public.etat_invitation(i);
  if etat = 'revoque' then raise exception 'Ce lien d''invitation a été révoqué : demandes-en un nouveau.'; end if;
  if etat = 'expire' then raise exception 'Ce lien d''invitation n''est plus valable : demandes-en un nouveau.'; end if;
  if etat = 'epuise' then raise exception 'Ce lien a déjà servi : demandes-en un nouveau.'; end if;
  insert into public.membres (exploitation_id, email, role, ajoute_par)
  values (i.exploitation_id, moi, i.role, i.cree_par);
  update public.invitations set usages = usages + 1 where code = i.code;
  return i.exploitation_id;
end;
$$;

-- 3. Intégrité entre exploitations -------------------------------------------------------------------------------
-- creer_visite et creer_vente : mêmes champs que 009 ; en plus, refus d'un lecteur et contrôle, sous RLS, que la
-- ruche, le client, les articles et les lots appartiennent à l'exploitation courante (AP-TECH-074).
create or replace function public.creer_visite(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  i jsonb;
  dispo numeric;
  nom_article text;
begin
  if exists (select 1 from public.visites where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  if not exists (select 1 from public.ruches where id = nullif(p->>'ruche_id', '')::uuid) then
    raise exception 'Ruche introuvable';
  end if;
  insert into public.visites (id, ruche_id, date_visite, activite, provisions, reine, poids_kg, note, auteur, couvain, varroa,
                              traitement, lot_produit, traitement_dose, retrait_prevu, ordonnance, varroa_methode, varroa_abeilles)
  values (v_id, (p->>'ruche_id')::uuid, coalesce((p->>'date_visite')::date, current_date), p->>'activite',
          p->>'provisions', p->>'reine', nullif(p->>'poids_kg', '')::numeric,
          coalesce(p->>'note', ''), coalesce(auth.jwt() ->> 'email', ''),
          coalesce(p->>'couvain', ''), nullif(p->>'varroa', '')::int,
          coalesce(p->>'traitement', ''), coalesce(p->>'lot_produit', ''),
          coalesce(p->>'traitement_dose', ''), nullif(p->>'retrait_prevu', '')::date,
          coalesce((p->>'ordonnance')::boolean, false),
          coalesce(p->>'varroa_methode', ''), nullif(p->>'varroa_abeilles', '')::int);
  for i in select * from jsonb_array_elements(coalesce(p->'intrants', '[]'::jsonb)) loop
    select stock, nom into dispo, nom_article from public.articles
      where id = (i->>'article_id')::uuid for update;
    if dispo is null then raise exception 'Article introuvable'; end if;
    if dispo < (i->>'quantite')::numeric then
      raise exception 'Stock insuffisant pour % (reste %)', nom_article, dispo;
    end if;
    insert into public.visite_intrants (visite_id, article_id, quantite)
    values (v_id, (i->>'article_id')::uuid, (i->>'quantite')::numeric);
  end loop;
  if coalesce(p->>'etat', '') <> '' then
    update public.ruches set etat = p->>'etat' where id = (p->>'ruche_id')::uuid;
  end if;
  return v_id;
end;
$$;

create or replace function public.creer_vente(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  i jsonb;
  lot public.lots%rowtype;
  vendus int;
begin
  if exists (select 1 from public.ventes where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0 then
    raise exception 'Ajoutez au moins un pot';
  end if;
  if not exists (select 1 from public.clients where id = nullif(p->>'client_id', '')::uuid) then
    raise exception 'Client introuvable';
  end if;
  insert into public.ventes (id, client_id, date_vente, auteur, paye, mode, livre, encaisse_par, livraison)
  values (v_id, (p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''), coalesce((p->>'paye')::boolean, true), coalesce(p->>'mode', ''),
          coalesce((p->>'livre')::boolean, true), coalesce(p->>'encaisse_par', ''), coalesce(p->>'livraison', ''));
  for i in select * from jsonb_array_elements(p->'lignes') loop
    select * into lot from public.lots where id = (i->>'lot_id')::uuid for update;
    if lot.id is null then raise exception 'Lot introuvable'; end if;
    select coalesce(sum(quantite), 0) into vendus from public.vente_lignes where lot_id = lot.id;
    if lot.pots_initiaux - vendus < (i->>'quantite')::int then
      raise exception 'Stock insuffisant pour le lot % (reste % pots)', lot.code, lot.pots_initiaux - vendus;
    end if;
    insert into public.vente_lignes (vente_id, lot_id, quantite, prix_unitaire)
    values (v_id, lot.id, (i->>'quantite')::int, lot.prix);
  end loop;
  return v_id;
end;
$$;

-- regler, ajouter_stock (012) et numeroter_facture (010) : même comportement, refus clair d'un lecteur.
create or replace function public.regler(p_modifs jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  resultat jsonb;
begin
  if jsonb_typeof(coalesce(p_modifs, '{}'::jsonb)) <> 'object' then raise exception 'Réglages invalides'; end if;
  insert into public.reglages (exploitation_id, id, data) values (e, 1, '{}'::jsonb) on conflict (exploitation_id) do nothing;
  update public.reglages r
     set data = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
                   from jsonb_each(r.data || coalesce(p_modifs, '{}'::jsonb)) as x(k, v)
                  where v <> 'null'::jsonb)
   where r.exploitation_id = e
  returning r.data into resultat;
  return resultat;
end;
$$;

create or replace function public.ajouter_stock(p jsonb)
returns numeric language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  a public.articles%rowtype;
  q numeric := (p->>'quantite')::numeric;
  d jsonb := p->'depense';
  d_id uuid;
begin
  if q is null or q <= 0 then raise exception 'Indique une quantité supérieure à zéro'; end if;
  select * into a from public.articles where id = (p->>'article_id')::uuid and exploitation_id = e for update;
  if a.id is null then raise exception 'Article introuvable dans cette exploitation'; end if;
  if d is null or jsonb_typeof(d) <> 'object' then
    update public.articles set stock = stock + q where id = a.id;
  else
    d_id := coalesce(nullif(d->>'id', '')::uuid, gen_random_uuid());
    if not exists (select 1 from public.depenses where id = d_id) then
      if nullif(d->>'fournisseur_id', '') is not null and not exists (
           select 1 from public.fournisseurs where id = (d->>'fournisseur_id')::uuid and exploitation_id = e) then
        raise exception 'Fournisseur introuvable dans cette exploitation';
      end if;
      insert into public.depenses (id, libelle, categorie, montant, date_depense, fournisseur_id, article_id, quantite)
      values (d_id, coalesce(nullif(d->>'libelle', ''), a.nom), coalesce(nullif(d->>'categorie', ''), 'Autre'),
              (d->>'montant')::numeric, coalesce((d->>'date_depense')::date, current_date),
              nullif(d->>'fournisseur_id', '')::uuid, a.id, q);
    end if;
  end if;
  return (select stock from public.articles where id = a.id);
end;
$$;

create or replace function public.numeroter_facture(p_vente uuid)
returns public.ventes language plpgsql set search_path = '' as $$
declare
  v public.ventes%rowtype;
  an int := extract(year from current_date)::int;
begin
  -- Facture déjà numérotée : on la renvoie, même à un lecteur (réimpression).
  select * into v from public.ventes where id = p_vente;
  if v.id is null then raise exception 'Vente introuvable'; end if;
  if v.facture_num is not null then return v; end if;
  -- Par l'API seulement : l'éditeur SQL (scripts d'essai de tests/production) garde le comportement de 010.
  if current_user in ('authenticated', 'anon') then perform public.exiger_ecriture(); end if;
  select * into v from public.ventes where id = p_vente for update;
  if v.facture_num is not null then return v; end if;
  perform pg_advisory_xact_lock(hashtextextended(v.exploitation_id::text, an));
  update public.ventes set facture_annee = an, facture_date = current_date,
    facture_num = (select coalesce(max(facture_num), 0) + 1 from public.ventes
                   where exploitation_id = v.exploitation_id and facture_annee = an)
  where id = p_vente returning * into v;
  return v;
end;
$$;

-- Clés étrangères composites : un objet ne peut être rattaché qu'à un objet de la même exploitation, y compris par
-- l'API REST (les clés simples ignorent la RLS). Les clés simples existantes sont gardées (leur action à la
-- suppression reste la même). Posées « not valid » (seules les nouvelles lignes sont contrôlées), puis validées :
-- si des données anciennes sont incohérentes, la validation est abandonnée avec un avertissement, la migration
-- continue, et incoherences_exploitation() les montre.
create unique index if not exists ruches_id_exploitation_uidx on public.ruches (id, exploitation_id);
create unique index if not exists fournisseurs_id_exploitation_uidx on public.fournisseurs (id, exploitation_id);
create unique index if not exists articles_id_exploitation_uidx on public.articles (id, exploitation_id);
create unique index if not exists clients_id_exploitation_uidx on public.clients (id, exploitation_id);
create unique index if not exists ventes_id_exploitation_uidx on public.ventes (id, exploitation_id);
create unique index if not exists lots_id_exploitation_uidx on public.lots (id, exploitation_id);
create unique index if not exists visites_id_exploitation_uidx on public.visites (id, exploitation_id);

create or replace function public.rattachements() returns table (enfant text, colonne text, parent text)
language sql immutable set search_path = '' as $$
  values ('articles', 'fournisseur_id', 'fournisseurs'), ('depenses', 'article_id', 'articles'),
         ('depenses', 'fournisseur_id', 'fournisseurs'), ('recoltes', 'ruche_id', 'ruches'),
         ('taches', 'ruche_id', 'ruches'), ('ventes', 'client_id', 'clients'),
         ('vente_lignes', 'vente_id', 'ventes'), ('vente_lignes', 'lot_id', 'lots'),
         ('visites', 'ruche_id', 'ruches'), ('visite_intrants', 'visite_id', 'visites'),
         ('visite_intrants', 'article_id', 'articles'), ('visite_photos', 'visite_id', 'visites'),
         ('ruche_evenements', 'ruche_id', 'ruches'), ('ruche_evenements', 'autre_ruche_id', 'ruches');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

do $$
declare r record; nom text;
begin
  for r in select * from public.rattachements() loop
    nom := r.enfant || '_' || r.colonne || '_meme_exploitation';
    if not exists (select 1 from pg_constraint where conname = nom and conrelid = ('public.' || r.enfant)::regclass) then
      execute format('alter table public.%I add constraint %I foreign key (%I, exploitation_id) references public.%I (id, exploitation_id) not valid',
                     r.enfant, nom, r.colonne, r.parent);
    end if;
    begin
      execute format('alter table public.%I validate constraint %I', r.enfant, nom);
    exception when foreign_key_violation then
      raise warning 'Données incohérentes dans %.% : contrainte % laissée non validée (voir incoherences_exploitation()).', r.enfant, r.colonne, nom;
    end;
  end loop;
end $$;

-- Détection des rattachements croisés existants (AP-TECH-075). Éditeur SQL seulement : sous la RLS, un utilisateur
-- ne verrait de toute façon que sa propre exploitation.
create or replace function public.incoherences_exploitation() returns table (enfant text, colonne text, nombre bigint)
language plpgsql stable set search_path = '' as $$
declare r record; n bigint;
begin
  for r in select * from public.rattachements() loop
    execute format('select count(*) from public.%I c join public.%I p on p.id = c.%I where p.exploitation_id <> c.exploitation_id',
                   r.enfant, r.parent, r.colonne) into n;
    enfant := r.enfant; colonne := r.colonne; nombre := n;
    return next;
  end loop;
end;
$$;
revoke all on function public.incoherences_exploitation() from public, anon, authenticated;

-- 4. Journal d'audit ---------------------------------------------------------------------------------------------
-- Pas de clé étrangère vers exploitations : sinon, supprimer une exploitation (cascade) échouerait sur les lignes
-- d'audit écrites pendant cette même suppression. Le ménage est fait par audit_exploitation_supprimee().
create table if not exists public.journal_audit (
  id bigint generated always as identity primary key,
  exploitation_id uuid not null,
  table_nom text not null,
  operation text not null check (operation in ('UPDATE', 'DELETE')),
  ligne_id text not null default '',
  avant jsonb not null,
  auteur text not null default '',
  transaction_id bigint not null default txid_current(),
  cree_le timestamptz not null default now(),
  restaure_le timestamptz,
  restaure_par text
);
create index if not exists journal_audit_exploitation_idx on public.journal_audit (exploitation_id, cree_le desc);
create index if not exists journal_audit_transaction_idx on public.journal_audit (transaction_id);
create index if not exists journal_audit_cree_le_idx on public.journal_audit (cree_le);

alter table public.journal_audit enable row level security;
revoke all on public.journal_audit from anon, authenticated;
grant select on public.journal_audit to authenticated;
drop policy if exists responsables_lire on public.journal_audit;
create policy responsables_lire on public.journal_audit for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()) and public.est_responsable(exploitation_id));

create or replace function public.auditer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare avant jsonb := to_jsonb(old);
begin
  if tg_op = 'UPDATE' then
    -- Rien de changé, ou seulement le stock d'un article (mis à jour à chaque visite et à chaque achat) : pas de trace.
    if avant = to_jsonb(new) then return new; end if;
    if tg_table_name = 'articles' and (avant - 'stock') = (to_jsonb(new) - 'stock') then return new; end if;
  end if;
  -- Suppression de toute l'exploitation (cascade) : rien à garder.
  if not exists (select 1 from public.exploitations x where x.id = (avant->>'exploitation_id')::uuid) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  insert into public.journal_audit (exploitation_id, table_nom, operation, ligne_id, avant, auteur)
  values ((avant->>'exploitation_id')::uuid, tg_table_name, tg_op,
          coalesce(avant->>'id', concat_ws('/', avant->>'annee', avant->>'poste'), ''),
          avant, lower(coalesce(auth.jwt() ->> 'email', '')));
  -- Purge à 1 an (AP-TECH-080), sans tâche planifiée : l'index sur cree_le rend ce ménage négligeable.
  delete from public.journal_audit where cree_le < now() - interval '1 year';
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.auditer() from public, anon, authenticated;

do $$
declare
  t text;
  tables text[] := array['ruches', 'articles', 'visites', 'visite_intrants', 'recoltes', 'lots', 'clients', 'ventes',
                         'vente_lignes', 'depenses', 'reglages', 'fournisseurs', 'taches', 'budgets', 'visite_photos',
                         'ruche_evenements'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after update or delete on public.%I for each row execute function public.auditer()', t);
  end loop;
end $$;

-- Exploitation supprimée : ses lignes d'audit partent avec elle.
create or replace function public.audit_exploitation_supprimee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.journal_audit where exploitation_id = old.id;
  return old;
end;
$$;
revoke all on function public.audit_exploitation_supprimee() from public, anon, authenticated;
drop trigger if exists zz_audit_menage on public.exploitations;
create trigger zz_audit_menage after delete on public.exploitations
  for each row execute function public.audit_exploitation_supprimee();

-- Restauration d'une visite (avec ses intrants), d'une vente (avec ses lignes) ou d'une dépense supprimée
-- (AP-TECH-079). Réservée aux responsables. Les photos d'une visite ne sont pas restaurées : leurs fichiers ont été
-- effacés du stockage au moment de la suppression.
create or replace function public.restaurer(p_id bigint) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exiger_ecriture();
  a public.journal_audit%rowtype;
  enfant text;
  lien text;
  c record;
  reste int;
  moi text := public.mon_email();
begin
  if not public.est_responsable(e) then raise exception 'Seul un responsable peut restaurer.'; end if;
  select * into a from public.journal_audit where id = p_id and exploitation_id = e;
  if a.id is null then raise exception 'Élément introuvable dans le journal.'; end if;
  if a.restaure_le is not null then raise exception 'Cet élément a déjà été restauré.'; end if;
  if a.operation <> 'DELETE' or a.table_nom not in ('visites', 'ventes', 'depenses') then
    raise exception 'Seules les visites, ventes et dépenses supprimées peuvent être restaurées.';
  end if;
  enfant := case a.table_nom when 'visites' then 'visite_intrants' when 'ventes' then 'vente_lignes' end;
  lien := case a.table_nom when 'visites' then 'visite_id' when 'ventes' then 'vente_id' end;
  -- Vente : les pots doivent être encore disponibles.
  if a.table_nom = 'ventes' then
    for c in select (j.avant->>'lot_id')::uuid lot, sum((j.avant->>'quantite')::int) q from public.journal_audit j
             where j.transaction_id = a.transaction_id and j.exploitation_id = e and j.table_nom = 'vente_lignes'
               and j.operation = 'DELETE' and j.avant->>'vente_id' = a.avant->>'id' group by 1 loop
      select pots_restants into reste from public.lots_stock where id = c.lot;
      if reste is null then raise exception 'Impossible : un lot de cette vente n''existe plus.'; end if;
      if reste < c.q then raise exception 'Impossible : il ne reste que % pots dans un lot de cette vente.', reste; end if;
    end loop;
  end if;
  begin
    execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', a.table_nom, a.table_nom)
      using a.avant;
    if enfant is not null then
      execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, j.avant)).*
                        from public.journal_audit j
                       where j.transaction_id = $1 and j.exploitation_id = $2 and j.table_nom = %L and j.operation = ''DELETE''
                         and j.avant->>%L = $3 and j.restaure_le is null', enfant, enfant, enfant, lien)
        using a.transaction_id, e, a.avant->>'id';
      update public.journal_audit j set restaure_le = now(), restaure_par = moi
       where j.transaction_id = a.transaction_id and j.exploitation_id = e and j.table_nom = enfant
         and j.operation = 'DELETE' and j.avant->>lien = a.avant->>'id';
    end if;
  exception
    when unique_violation then raise exception 'Cet élément existe déjà : rien n''a été restauré.';
    when foreign_key_violation then
      raise exception 'Impossible : la ruche, le client, un lot ou un article lié n''existe plus.';
  end;
  update public.journal_audit set restaure_le = now(), restaure_par = moi where id = a.id;
  return jsonb_build_object('table', a.table_nom, 'id', a.avant->>'id');
end;
$$;
-- La mise à jour de restaure_le passe par une politique dédiée (responsables, exploitation courante).
grant update (restaure_le, restaure_par) on public.journal_audit to authenticated;
drop policy if exists responsables_restaurer on public.journal_audit;
create policy responsables_restaurer on public.journal_audit for update to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()) and public.est_responsable(exploitation_id))
  with check (exploitation_id = (select public.exploitation_ecriture()) and public.est_responsable(exploitation_id));

-- 5. Démonstration -----------------------------------------------------------------------------------------------
alter table public.exploitations add column if not exists demo boolean not null default false;

-- Crée une exploitation marquée « démo » (même règles que creer_exploitation : compte confirmé, 5 au plus).
create or replace function public.creer_exploitation_demo(p_nom text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e uuid;
begin
  e := public.creer_exploitation(p_nom);
  update public.exploitations set demo = true where id = e;
  return e;
end;
$$;

-- Indicateurs d'usage réels, sans les exploitations de démonstration (éditeur SQL seulement).
create or replace function public.indicateurs_usage() returns table (exploitations bigint, colonies bigint, visites bigint, ventes bigint)
language sql stable set search_path = '' as $$
  select (select count(*) from public.exploitations x where not x.demo),
         (select count(*) from public.ruches r join public.exploitations x on x.id = r.exploitation_id where not x.demo),
         (select count(*) from public.visites v join public.exploitations x on x.id = v.exploitation_id where not x.demo),
         (select count(*) from public.ventes v join public.exploitations x on x.id = v.exploitation_id where not x.demo);
$$;
revoke all on function public.indicateurs_usage() from public, anon, authenticated;

-- 6. Empreinte de la structure -----------------------------------------------------------------------------------
-- Une empreinte md5 par rubrique ; la mise en ligne de production compare celles de la base à celles obtenues en
-- rejouant les fichiers de migrations (scripts/controler-structure.mjs). Fins de ligne Windows neutralisées (E3).
create or replace function public.empreinte_structure() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tables', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select c.relname || '.' || a.attname || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull as x
      from pg_catalog.pg_class c join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')) t),
    'contraintes', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select conrelid::regclass::text || '.' || conname || ':' || contype::text || ':' || convalidated as x
      from pg_catalog.pg_constraint where connamespace = 'public'::regnamespace) t),
    'fonctions', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || p.prosecdef || ':'
             || coalesce(array_to_string(p.proconfig, ','), '') || ':' || md5(replace(p.prosrc, E'\r', '')) as x
      from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace) t),
    'politiques', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || array_to_string(roles, ',') as x
      from pg_catalog.pg_policies where schemaname in ('public', 'storage')
        and (schemaname = 'public' or policyname like 'photos_visites_%')) t),
    'declencheurs', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select tgrelid::regclass::text || '.' || tgname as x from pg_catalog.pg_trigger
      where not tgisinternal and tgrelid in (select oid from pg_catalog.pg_class where relnamespace = 'public'::regnamespace)) t),
    'rls', (select md5(coalesce(string_agg(x, ';' order by x collate "C"), '')) from (
      select relname || ':' || relrowsecurity as x from pg_catalog.pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r') t));
$$;

-- 7. Droits sur les fonctions ------------------------------------------------------------------------------------
revoke all on function public.peut_ecrire(uuid), public.exploitation_ecriture(), public.peut_photo_ecrire(text),
  public.exiger_ecriture(), public.etat_invitation(public.invitations), public.invitation_info(text),
  public.rejoindre(text), public.creer_visite(jsonb), public.creer_vente(jsonb), public.regler(jsonb),
  public.ajouter_stock(jsonb), public.numeroter_facture(uuid), public.restaurer(bigint),
  public.creer_exploitation_demo(text), public.empreinte_structure() from public, anon;
grant execute on function public.peut_ecrire(uuid), public.exploitation_ecriture(), public.peut_photo_ecrire(text),
  public.exiger_ecriture(), public.etat_invitation(public.invitations), public.invitation_info(text),
  public.rejoindre(text), public.creer_visite(jsonb), public.creer_vente(jsonb), public.regler(jsonb),
  public.ajouter_stock(jsonb), public.numeroter_facture(uuid), public.restaurer(bigint),
  public.creer_exploitation_demo(text), public.empreinte_structure() to authenticated;
grant execute on function public.invitation_info(text), public.empreinte_structure() to anon;
