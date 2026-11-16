-- Apiviz — migration 023 : visite rapide (IT-08 réduite, v5.49, maquette validée le 15 nov. 2026).
--
-- Contenu :
--   1. Trois observations de plus dans visites (AP-FEAT-038, AP-TECH-129), toutes facultatives :
--        force             1 à 5 (force de la colonie, notée par l'apiculteur)
--        oeufs_vus         oui / non (vide : pas regardé)
--        cellules_royales  « Aucune », « Ouvertes » ou « Operculées » (vide : pas regardé)
--      Des cellules operculées font apparaître l'alerte « Essaimage » dans l'application (aucun seuil ni délai
--      réglementaire : c'est un repère d'observation, la tâche proposée a une échéance modifiable).
--   2. creer_visite(p) (AP-TECH-130) : celle de 020, inchangée, plus ces trois champs. Une valeur hors liste est refusée
--      avec un message en français.
-- Hors périmètre (reporté, décision du 15 nov. 2026) : table modeles_visite, notes de caractère, météo enregistrée.
--   Le modèle « Hiver » de la tournée est fixe, dans l'application ; il n'a besoin de rien en base (observes de 020
--   dit ce qui a été vu).
-- Dépendances : 000, 004 à 022 (creer_visite et visites.observes / duree_s de 020, exiger_ecriture() de 014).
-- Casse l'ancienne version : NON.
--   - Trois colonnes facultatives : l'ancienne version ne les envoie pas, elles restent vides.
--   - creer_visite garde sa signature (jsonb) et accepte toujours une charge sans ces champs.
-- Relançable : oui (add column if not exists, drop constraint if exists, create or replace). Aucune ligne modifiée.
-- Sécurité : aucune nouvelle table ; creer_visite reste en security invoker (RLS de visites et de ruches), search_path
--   vide, exécutable par les seuls comptes connectés ; lecteur refusé par exiger_ecriture().
-- Retour arrière : revenir au code précédent suffit ; les colonnes peuvent rester en place.

-- 1. Observations ------------------------------------------------------------------------------------------------------
alter table public.visites add column if not exists force smallint;
alter table public.visites add column if not exists oeufs_vus boolean;
alter table public.visites add column if not exists cellules_royales text;
alter table public.visites drop constraint if exists visites_force_1_5;
alter table public.visites add constraint visites_force_1_5 check (force is null or force between 1 and 5);
alter table public.visites drop constraint if exists visites_cellules_royales_liste;
alter table public.visites add constraint visites_cellules_royales_liste
  check (cellules_royales is null or cellules_royales in ('Aucune', 'Ouvertes', 'Operculées'));

-- 2. creer_visite ------------------------------------------------------------------------------------------------------
create or replace function public.creer_visite(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  i jsonb;
  dispo numeric;
  nom_article text;
  v_observes text[];
  v_force smallint;
  v_cellules text := nullif(p->>'cellules_royales', '');
  v_oeufs boolean := case when jsonb_typeof(p->'oeufs_vus') = 'boolean' then (p->>'oeufs_vus')::boolean end;
begin
  if exists (select 1 from public.visites where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  if not exists (select 1 from public.ruches where id = nullif(p->>'ruche_id', '')::uuid) then
    raise exception 'Ruche introuvable';
  end if;
  if coalesce(p->>'force', '') <> '' and (p->>'force') !~ '^[0-9]+$' then
    raise exception 'La force se note de 1 à 5';
  end if;
  v_force := nullif(p->>'force', '')::int;
  if v_force is not null and v_force not between 1 and 5 then
    raise exception 'La force se note de 1 à 5';
  end if;
  if v_cellules is not null and v_cellules not in ('Aucune', 'Ouvertes', 'Operculées') then
    raise exception 'Cellules royales : « Aucune », « Ouvertes » ou « Operculées »';
  end if;
  -- observes : absent ou null = visite complète ; sinon la liste des champs touchés (peut être vide).
  if jsonb_typeof(p->'observes') = 'array' then
    select coalesce(array_agg(x), '{}') into v_observes from jsonb_array_elements_text(p->'observes') x;
  end if;
  insert into public.visites (id, ruche_id, date_visite, activite, provisions, reine, poids_kg, note, auteur, couvain, varroa,
                              traitement, lot_produit, traitement_dose, retrait_prevu, ordonnance, varroa_methode, varroa_abeilles,
                              observes, duree_s, force, oeufs_vus, cellules_royales)
  values (v_id, (p->>'ruche_id')::uuid, coalesce((p->>'date_visite')::date, current_date), p->>'activite',
          p->>'provisions', p->>'reine', nullif(p->>'poids_kg', '')::numeric,
          coalesce(p->>'note', ''), coalesce(auth.jwt() ->> 'email', ''),
          coalesce(p->>'couvain', ''), nullif(p->>'varroa', '')::int,
          coalesce(p->>'traitement', ''), coalesce(p->>'lot_produit', ''),
          coalesce(p->>'traitement_dose', ''), nullif(p->>'retrait_prevu', '')::date,
          coalesce((p->>'ordonnance')::boolean, false),
          coalesce(p->>'varroa_methode', ''), nullif(p->>'varroa_abeilles', '')::int,
          v_observes, case when nullif(p->>'duree_s', '') is null then null else greatest((p->>'duree_s')::int, 0) end,
          v_force, v_oeufs, v_cellules);
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
revoke all on function public.creer_visite(jsonb) from public, anon;
grant execute on function public.creer_visite(jsonb) to authenticated;
