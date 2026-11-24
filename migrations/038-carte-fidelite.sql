-- Apiviz — migration 038 : carte de fidélité (v5.78, maquette « apiviz — Idées pour vendre plus », idée 1, validée par
-- Pierre-Louis le 24 nov. 2026 : « Ok pour l'idée de la carte de fidélité »).
--
-- La carte elle-même ne demande pas de table : les tampons d'un client se comptent à partir de ses ventes (un tampon par
-- article acheté depuis le début de la carte, réglage `fidelite` de la table reglages) et les cartes déjà utilisées
-- sont les ventes où une récompense a été donnée. Il faut seulement garder cette récompense à part.
--
-- Contenu :
--   1. ventes.remise_fidelite : euros offerts par la carte dans cette vente (un article, le moins cher du panier).
--   2. creer_vente(p) : reçoit remise_fidelite ; le total des remises des lignes doit égaler offre + remise ponctuelle +
--      fidélité. Le reste est celui de 037, inchangé.
-- Dépendances : 037 (promotions, colonnes de remise, creer_vente).
-- Sécurité : inchangée (security invoker, search_path vide, exiger_ecriture()).
-- Casse l'ancienne version : NON. Colonne avec une valeur par défaut (0). La v5.77 enregistre ses ventes comme avant ;
--   elle affiche une vente avec récompense au prix payé (les lignes portent la remise) mais sans la ligne « Carte ».
-- Relançable : oui (if not exists, drop constraint if exists, create or replace).
-- Retour arrière : revenir au code précédent suffit ; la colonne peut rester.

-- 1. Récompense de la carte ----------------------------------------------------------------------------------------------
alter table public.ventes add column if not exists remise_fidelite numeric(8,2) not null default 0;
alter table public.ventes drop constraint if exists ventes_remise_fidelite_check;
alter table public.ventes add constraint ventes_remise_fidelite_check check (remise_fidelite >= 0);

-- 2. Enregistrer une vente (037, plus remise_fidelite) -----------------------------------------------------------------------------------------------
-- p = { id, client_id, date_vente, paye, mode, livre, encaisse_par, livraison, vendu_par,
--       lignes: [{ lot_id, quantite, remise? }],
--       promotion_id?, promotion_nom?, remise_offre?, remise_manuelle?, remise_motif?, remise_libelle?, remise_fidelite? }
create or replace function public.creer_vente(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  i jsonb;
  lot public.lots%rowtype;
  vendus int;
  v_remise numeric(8,2);
  v_total_remise numeric(10,2) := 0;
  v_offre numeric(8,2) := round(coalesce(nullif(p->>'remise_offre', '')::numeric, 0), 2);
  v_manuelle numeric(8,2) := round(coalesce(nullif(p->>'remise_manuelle', '')::numeric, 0), 2);
  v_fidelite numeric(8,2) := round(coalesce(nullif(p->>'remise_fidelite', '')::numeric, 0), 2);
  v_promo uuid := nullif(p->>'promotion_id', '')::uuid;
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
  if v_offre < 0 or v_manuelle < 0 or v_fidelite < 0 then
    raise exception 'Une remise ne peut pas être négative';
  end if;
  if v_offre = 0 or (v_promo is not null and not exists (select 1 from public.promotions where id = v_promo)) then
    v_promo := null;
  end if;
  insert into public.ventes (id, client_id, date_vente, auteur, paye, mode, livre, encaisse_par, livraison, vendu_par,
                             promotion_id, promotion_nom, remise_offre, remise_manuelle, remise_motif, remise_libelle, remise_fidelite)
  values (v_id, (p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''), coalesce((p->>'paye')::boolean, true), coalesce(p->>'mode', ''),
          coalesce((p->>'livre')::boolean, true), coalesce(p->>'encaisse_par', ''), coalesce(p->>'livraison', ''),
          coalesce(p->>'vendu_par', ''),
          v_promo, case when v_offre > 0 then left(coalesce(p->>'promotion_nom', ''), 80) else '' end, v_offre, v_manuelle,
          case when v_manuelle > 0 then left(coalesce(p->>'remise_motif', ''), 60) else '' end,
          case when v_manuelle > 0 then left(coalesce(p->>'remise_libelle', ''), 60) else '' end, v_fidelite);
  for i in select * from jsonb_array_elements(p->'lignes') loop
    select * into lot from public.lots where id = (i->>'lot_id')::uuid for update;
    if lot.id is null then raise exception 'Lot introuvable'; end if;
    select coalesce(sum(quantite), 0) into vendus from public.vente_lignes where lot_id = lot.id;
    if lot.pots_initiaux - vendus < (i->>'quantite')::int then
      raise exception 'Stock insuffisant pour le lot % (reste % pots)', lot.code, lot.pots_initiaux - vendus;
    end if;
    v_remise := round(coalesce(nullif(i->>'remise', '')::numeric, 0), 2);
    if v_remise < 0 or v_remise > (i->>'quantite')::int * lot.prix then
      raise exception 'Remise impossible sur le lot % : plus forte que la ligne', lot.code;
    end if;
    v_total_remise := v_total_remise + v_remise;
    insert into public.vente_lignes (vente_id, lot_id, quantite, prix_unitaire, remise)
    values (v_id, lot.id, (i->>'quantite')::int, lot.prix, v_remise);
  end loop;
  if abs(v_total_remise - (v_offre + v_manuelle + v_fidelite)) > 0.005 then
    raise exception 'Remise incohérente : % € sur les lignes, % € annoncés', v_total_remise, v_offre + v_manuelle + v_fidelite;
  end if;
  return v_id;
end;
$$;
