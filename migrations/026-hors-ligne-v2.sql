-- Apiviz — migration 026 : hors ligne v2 (IT-09, AP-FEAT-043, AP-FEAT-044, v5.56).
--
-- Contenu :
--   1. Colonne modifie_le (AP-TECH-150) sur les tables terrain : visites, ruches, recoltes, depenses, taches, ventes,
--      reines. Elle vaut l'heure de la migration pour les lignes existantes (l'heure de création pour les nouvelles),
--      puis l'heure de chaque modification, posée par le déclencheur modifie_le (fonction toucher_modifie_le). Une mise
--      à jour qui ne change rien ne la déplace pas.
--   2. colonnes_modifiables(table) : la liste blanche des tables et des champs qu'une modification faite sans réseau
--      peut toucher. Les champs qui relient la saisie à autre chose (ruche_id, rucher, rucher_id, achat_id, article_id,
--      exploitation_id…) n'y sont jamais : ils changent par leurs propres fonctions (deplacer_colonies, etc.).
--      La même liste est dans l'application (src/donnees/file.js) ; un test unitaire vérifie qu'elles sont identiques.
--   3. modifier_saisie(p) (AP-TECH-147, AP-TECH-151) : applique une modification gardée sur le téléphone.
--        p = { table, id, champs: {…nouvelles valeurs}, avant: {…valeurs vues au moment de la modification},
--              version: modifie_le vu à ce moment, forcer: booléen }
--      Si la ligne n'a pas bougé depuis (modifie_le = version), la modification passe. Sinon, seuls les champs qu'un
--      autre membre a changés ET que la modification change autrement sont en conflit : la fonction n'écrit rien et
--      renvoie { statut: "conflit", champs, serveur, version } pour que l'application montre les deux versions.
--      forcer = vrai (choix fait par l'utilisateur sur l'écran de conflit) écrit sans contrôle.
--      Idempotente : renvoyer la même modification après une coupure ne crée pas de conflit (la valeur en base est
--      déjà la sienne) et ne change rien.
--   4. supprimer_saisie(p) (AP-FEAT-043) : suppression gardée sur le téléphone. p = { table, id, version, forcer }.
--      Ligne déjà absente : « ok » (idempotente). Ligne modifiée par un autre depuis : « conflit », rien n'est supprimé.
--      Tables : visites, recoltes, depenses, taches, ventes. Mêmes effets qu'une suppression directe (stock rétabli
--      par les déclencheurs existants, registre, photos détachées par l'application).
-- Pas de fonction creer_colonie : une colonie créée sans réseau part comme aujourd'hui une ligne de la file
--   (insertion directe, idempotente par l'identifiant choisi par le téléphone, ON CONFLICT DO NOTHING).
-- Dépendances : 000, 004 à 025 (exiger_ecriture() de 014 ; tables reines de 019 ; colonnes de 020 et 023 dans les listes).
--   Le contenu ne dépend pas de 025 : seule la numérotation la place après.
-- Casse l'ancienne version : NON.
--   - Colonne ajoutée avec une valeur par défaut : l'ancienne version ne l'envoie pas et ne la lit pas.
--   - Deux fonctions nouvelles, que l'ancienne version n'appelle pas.
-- Relançable : oui (add column if not exists, drop trigger if exists, create or replace). Aucune donnée modifiée.
-- Sécurité : aucune nouvelle table. Fonctions en security invoker (les règles d'accès des tables s'appliquent : une
--   ligne d'une autre exploitation est « introuvable »), search_path vide, exécutables par les seuls comptes connectés ;
--   lecteur refusé par exiger_ecriture(). Les noms de table et de colonne viennent de la liste blanche, jamais du client
--   sans contrôle (format %I).
-- Retour arrière : revenir au code précédent suffit ; la colonne, le déclencheur et les fonctions peuvent rester.

-- 1. modifie_le et son déclencheur -------------------------------------------------------------------------------------
create or replace function public.toucher_modifie_le() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.modifie_le := clock_timestamp();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['visites', 'ruches', 'recoltes', 'depenses', 'taches', 'ventes', 'reines'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists modifie_le timestamptz not null default now()', t);
    execute format('drop trigger if exists modifie_le on public.%I', t);
    execute format('create trigger modifie_le before update on public.%I for each row '
                   'when (old.* is distinct from new.*) execute function public.toucher_modifie_le()', t);
  end loop;
end;
$$;

-- 2. Liste blanche ----------------------------------------------------------------------------------------------------
create or replace function public.colonnes_modifiables(p_table text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_table
    when 'visites' then array['date_visite', 'activite', 'provisions', 'reine', 'couvain', 'poids_kg', 'force', 'oeufs_vus',
      'cellules_royales', 'varroa', 'varroa_methode', 'varroa_abeilles', 'traitement', 'lot_produit', 'traitement_dose',
      'retrait_prevu', 'ordonnance', 'note']
    when 'ruches' then array['nom', 'type_ruche', 'etat', 'notes', 'hausses', 'equipement', 'annee_reine', 'code', 'origine']
    when 'recoltes' then array['date_recolte', 'kg', 'hausses', 'humidite', 'miel', 'extraction']
    when 'depenses' then array['date_depense', 'categorie', 'libelle', 'montant', 'nature', 'duree_amort', 'piece']
    when 'taches' then array['titre', 'echeance', 'assigne', 'faite', 'faite_le']
  end
$$;

-- 3. modifier_saisie --------------------------------------------------------------------------------------------------
create or replace function public.modifier_saisie(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_table text := p->>'table';
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_champs jsonb := coalesce(p->'champs', '{}'::jsonb);
  v_cols text[];
  v_actuel jsonb;
  v_mien jsonb;
  v_avant jsonb;
  v_conflits text[] := '{}';
  v_set text;
  k text;
begin
  perform public.exiger_ecriture();
  v_cols := public.colonnes_modifiables(v_table);
  if v_cols is null then raise exception 'Cette saisie ne se modifie pas sans réseau'; end if;
  if v_id is null then raise exception 'Saisie introuvable'; end if;
  if jsonb_typeof(v_champs) <> 'object' then raise exception 'Modification mal formée'; end if;
  for k in select jsonb_object_keys(v_champs) loop
    if not k = any(v_cols) then raise exception 'Le champ « % » ne se modifie pas ici', k; end if;
  end loop;

  execute format('select to_jsonb(t) from public.%I t where t.id = $1 for update', v_table) into v_actuel using v_id;
  if v_actuel is null then
    raise exception 'Cette saisie n’existe plus : un autre membre l’a peut-être supprimée.';
  end if;
  -- Valeurs ramenées au type des colonnes (« 12.5 » texte ou 12.5 nombre donnent la même chose).
  execute format('select to_jsonb(r) from jsonb_populate_record(null::public.%I, $1) r', v_table) into v_mien using v_champs;
  if jsonb_typeof(p->'avant') = 'object' then
    execute format('select to_jsonb(r) from jsonb_populate_record(null::public.%I, $1) r', v_table) into v_avant using p->'avant';
  end if;

  if not coalesce((p->>'forcer')::boolean, false)
     and nullif(p->>'version', '') is not null
     and (v_actuel->>'modifie_le')::timestamptz is distinct from (p->>'version')::timestamptz then
    for k in select jsonb_object_keys(v_champs) loop
      if v_actuel->k is distinct from v_mien->k and (v_avant is null or v_actuel->k is distinct from v_avant->k) then
        v_conflits := v_conflits || k;
      end if;
    end loop;
    if cardinality(v_conflits) > 0 then
      return jsonb_build_object('statut', 'conflit', 'champs', to_jsonb(v_conflits), 'serveur', v_actuel,
                                'version', v_actuel->'modifie_le');
    end if;
  end if;

  select string_agg(format('%I = r.%I', c, c), ', ') into v_set from jsonb_object_keys(v_champs) c;
  if v_set is not null then
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.id = $2',
                   v_table, v_set, v_table) using v_champs, v_id;
    execute format('select to_jsonb(t) from public.%I t where t.id = $1', v_table) into v_actuel using v_id;
  end if;
  return jsonb_build_object('statut', 'ok', 'version', v_actuel->'modifie_le');
end;
$$;

-- 4. supprimer_saisie -------------------------------------------------------------------------------------------------
create or replace function public.supprimer_saisie(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_table text := p->>'table';
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_actuel jsonb;
begin
  perform public.exiger_ecriture();
  if v_table is null or v_table not in ('visites', 'recoltes', 'depenses', 'taches', 'ventes') then
    raise exception 'Cette saisie ne se supprime pas sans réseau';
  end if;
  if v_id is null then raise exception 'Saisie introuvable'; end if;
  execute format('select to_jsonb(t) from public.%I t where t.id = $1 for update', v_table) into v_actuel using v_id;
  if v_actuel is null then
    return jsonb_build_object('statut', 'ok', 'deja', true); -- déjà supprimée (renvoi après une coupure, ou un autre membre)
  end if;
  if not coalesce((p->>'forcer')::boolean, false)
     and nullif(p->>'version', '') is not null
     and (v_actuel->>'modifie_le')::timestamptz is distinct from (p->>'version')::timestamptz then
    return jsonb_build_object('statut', 'conflit', 'champs', '[]'::jsonb, 'serveur', v_actuel, 'version', v_actuel->'modifie_le');
  end if;
  execute format('delete from public.%I t where t.id = $1', v_table) using v_id;
  return jsonb_build_object('statut', 'ok');
end;
$$;

revoke all on function public.toucher_modifie_le(), public.colonnes_modifiables(text), public.modifier_saisie(jsonb),
  public.supprimer_saisie(jsonb) from public, anon;
grant execute on function public.colonnes_modifiables(text), public.modifier_saisie(jsonb), public.supprimer_saisie(jsonb)
  to authenticated;
