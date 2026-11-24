-- Apiviz — migration 037 : remises et offres de vente (v5.77, maquette « apiviz — Remises et offres » du 24 nov. 2026,
-- validée par Pierre-Louis : deux offres ne s'additionnent pas ; le motif d'une remise est facultatif).
--
-- Contenu :
--   1. promotions : les offres préparées, appliquées toutes seules pendant la vente. Le nom « offres » est déjà pris par
--      le catalogue des abonnements (029). Quatre modèles :
--        xy      X achetés, Y offerts (achetes, offerts) : les moins chers sont offerts ;
--        lot     N produits pour un prix rond (quantite, prix_lot) ;
--        remise  remise en % ou en € (mode, valeur), avec un minimum d'achat facultatif ;
--        client  prix d'un client ou d'un cercle (mode, valeur, clients ou cercles obligatoires).
--      produits : familles concernées (« Miel|250 g », « Hydromel|75 cl ») ; vide = tous les produits. clients, cercles :
--      pour qui (vide = tout le monde). debut, fin : période facultative. actif : l'interrupteur de la liste.
--   2. vente_lignes.remise : euros retirés de la ligne (offre et remise ponctuelle réparties par l'application). Le
--      montant d'une ligne devient quantite × prix_unitaire − remise ; prix_unitaire reste le prix du lot. Un article
--      offert sort du stock comme les autres.
--   3. ventes : promotion_id et promotion_nom (l'offre appliquée, une seule : les offres ne s'additionnent pas),
--      remise_offre, remise_manuelle (la remise ponctuelle), remise_motif (facultatif), remise_libelle (« −10 % »).
--   4. creer_vente(p) : reçoit la remise de chaque ligne et le détail de la vente ; refuse une remise négative, plus forte
--      que la ligne, ou dont le total ne correspond pas au détail. Le reste est celui de 017, inchangé.
-- Dépendances : 000 à 036 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture() de 014 ; creer_vente de
--   017 ; categorie et format_libelle des lots de 032).
-- Sécurité : RLS sur promotions (lecture : exploitation courante ; écriture : personne qui peut écrire dans
--   l'exploitation). creer_vente reste en security invoker (droits et RLS de la personne connectée) ; une offre citée
--   qu'elle ne voit pas est ignorée.
-- Casse l'ancienne version : NON. Colonnes avec une valeur par défaut (0, vide) et table nouvelle. Une ancienne version
--   enregistre ses ventes sans remise comme avant ; elle affiche une vente remisée au prix plein (elle ne lit pas la
--   colonne remise).
-- Relançable : oui (if not exists, drop constraint if exists, drop policy if exists, create or replace).
-- Retour arrière : revenir au code précédent suffit ; les colonnes et la table peuvent rester.

-- 1. Offres préparées --------------------------------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  nom text not null check (length(btrim(nom)) between 1 and 80),
  type text not null check (type in ('xy', 'lot', 'remise', 'client')),
  produits text[] not null default '{}',
  achetes int check (achetes is null or achetes between 1 and 99),
  offerts int check (offerts is null or offerts between 1 and 99),
  quantite int check (quantite is null or quantite between 2 and 99),
  prix_lot numeric(8,2) check (prix_lot is null or prix_lot > 0),
  mode text not null default '' check (mode in ('', 'pct', 'eur')),
  valeur numeric(8,2) check (valeur is null or valeur > 0),
  minimum numeric(8,2) not null default 0 check (minimum >= 0),
  clients uuid[] not null default '{}',
  cercles text[] not null default '{}',
  debut date,
  fin date,
  actif boolean not null default true,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists promotions_exploitation_idx on public.promotions (exploitation_id, actif);

alter table public.promotions drop constraint if exists promotions_parametres;
alter table public.promotions add constraint promotions_parametres check (
  case type
    when 'xy' then achetes is not null and offerts is not null
    when 'lot' then quantite is not null and prix_lot is not null
    else mode in ('pct', 'eur') and valeur is not null and (mode <> 'pct' or valeur <= 100)
  end);
alter table public.promotions drop constraint if exists promotions_client_cible;
alter table public.promotions add constraint promotions_client_cible
  check (type <> 'client' or cardinality(clients) + cardinality(cercles) > 0);
alter table public.promotions drop constraint if exists promotions_periode;
alter table public.promotions add constraint promotions_periode check (debut is null or fin is null or fin >= debut);
alter table public.promotions drop constraint if exists promotions_listes;
alter table public.promotions add constraint promotions_listes
  check (cardinality(produits) <= 40 and cardinality(clients) <= 200 and cardinality(cercles) <= 20
         and coalesce(length(array_to_string(produits, '')), 0) <= 40 * 80
         and coalesce(length(array_to_string(cercles, '')), 0) <= 20 * 60);

alter table public.promotions enable row level security;
drop policy if exists lire on public.promotions;
drop policy if exists ecrire on public.promotions;
create policy lire on public.promotions for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ecrire on public.promotions for all to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()))
  with check (exploitation_id = (select public.exploitation_ecriture()));
revoke all on public.promotions from anon;
grant select, insert, update, delete on public.promotions to authenticated;

-- 2 et 3. Remise des lignes, détail de la vente ------------------------------------------------------------------------
alter table public.vente_lignes add column if not exists remise numeric(8,2) not null default 0;
alter table public.vente_lignes drop constraint if exists vente_lignes_remise_check;
alter table public.vente_lignes add constraint vente_lignes_remise_check check (remise >= 0 and remise <= quantite * prix_unitaire);

alter table public.ventes add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.ventes add column if not exists promotion_nom text not null default '';
alter table public.ventes add column if not exists remise_offre numeric(8,2) not null default 0;
alter table public.ventes add column if not exists remise_manuelle numeric(8,2) not null default 0;
alter table public.ventes add column if not exists remise_motif text not null default '';
alter table public.ventes add column if not exists remise_libelle text not null default '';
alter table public.ventes drop constraint if exists ventes_remises_check;
alter table public.ventes add constraint ventes_remises_check check (remise_offre >= 0 and remise_manuelle >= 0
  and length(promotion_nom) <= 80 and length(remise_motif) <= 60 and length(remise_libelle) <= 60);
create index if not exists ventes_promotion_idx on public.ventes (promotion_id) where promotion_id is not null;

-- 4. Enregistrer une vente -----------------------------------------------------------------------------------------------
-- p = { id, client_id, date_vente, paye, mode, livre, encaisse_par, livraison, vendu_par,
--       lignes: [{ lot_id, quantite, remise? }],
--       promotion_id?, promotion_nom?, remise_offre?, remise_manuelle?, remise_motif?, remise_libelle? }
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
  if v_offre < 0 or v_manuelle < 0 then
    raise exception 'Une remise ne peut pas être négative';
  end if;
  if v_offre = 0 or (v_promo is not null and not exists (select 1 from public.promotions where id = v_promo)) then
    v_promo := null;
  end if;
  insert into public.ventes (id, client_id, date_vente, auteur, paye, mode, livre, encaisse_par, livraison, vendu_par,
                             promotion_id, promotion_nom, remise_offre, remise_manuelle, remise_motif, remise_libelle)
  values (v_id, (p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''), coalesce((p->>'paye')::boolean, true), coalesce(p->>'mode', ''),
          coalesce((p->>'livre')::boolean, true), coalesce(p->>'encaisse_par', ''), coalesce(p->>'livraison', ''),
          coalesce(p->>'vendu_par', ''),
          v_promo, case when v_offre > 0 then left(coalesce(p->>'promotion_nom', ''), 80) else '' end, v_offre, v_manuelle,
          case when v_manuelle > 0 then left(coalesce(p->>'remise_motif', ''), 60) else '' end,
          case when v_manuelle > 0 then left(coalesce(p->>'remise_libelle', ''), 60) else '' end);
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
  if abs(v_total_remise - (v_offre + v_manuelle)) > 0.005 then
    raise exception 'Remise incohérente : % € sur les lignes, % € annoncés', v_total_remise, v_offre + v_manuelle;
  end if;
  return v_id;
end;
$$;
