-- Apiviz — migration 032 : d'autres produits que le miel (v5.64, maquettes « Produits de la ruche » du 18 nov. 2026,
-- demande de Pierre-Louis : « l'application doit être accessible au plus grand nombre et ne doit pas parler que de miel »).
--
-- Un lot devient le lot d'un produit : du miel en pots comme avant, ou de l'hydromel, de la cire, des bougies, de la
-- propolis, du pollen, un essaim… Les ventes, la caisse et les commandes en ligne passent par les mêmes lots : une vente
-- peut donc mélanger les produits sans rien changer à vente_lignes ni à creer_vente.
--
-- Contenu :
--   1. lots : categorie (« Miel » par défaut, texte libre court : Hydromel, Cire, Bougie…), unite (pot, bouteille,
--      pièce, flacon…), format_libelle (« 75 cl », « Pain de 250 g » : le format d'un produit autre que le miel), seuil
--      (alerte de stock bas, facultatif). format_g devient facultatif, sauf pour le miel (contrainte lots_miel_format).
--   2. lots_stock : les quatre colonnes ajoutées à la fin (les colonnes existantes ne bougent pas).
--   3. creer_produit(p) : crée le lot d'un produit qui n'est pas du miel en pots, sans rien retirer du stock. Relancer
--      le même id ne le double pas (file d'envoi hors ligne). Le miel passe toujours par mettre_en_pots (018).
--   4. Commandes en ligne (027) : les produits disponibles sont regroupés par catégorie, nom, format et prix ; une
--      commande garde la catégorie et le format de chaque ligne ; la livraison prend les lots du même produit. Les
--      commandes déjà passées (sans catégorie ni format_libelle) restent livrables.
-- Dépendances : 000 à 031 (exiger_ecriture() de 014, creer_vente() de 017, boutiques et commandes de 027).
-- Casse l'ancienne version : NON pour le miel. Une ancienne version ne crée que du miel ; si un produit d'un autre type
--   existe déjà, elle l'affiche avec un format vide (« null g ») mais peut le vendre. La page de commande publiée avant
--   cette version affiche de même un format vide pour ces produits.
-- Relançable : oui (if not exists, drop constraint if exists, create or replace, drop function if exists).
-- Sécurité : creer_produit en security invoker (RLS de lots), exécutable par authenticated seulement. Les fonctions de
--   la page publique gardent leurs droits (anon : boutique_publique et passer_commande ; rien d'autre).
-- Retour arrière : revenir au code précédent suffit. Les colonnes peuvent rester ; pour revenir à format_g obligatoire,
--   supprimer d'abord les lots qui ne sont pas du miel.

-- 1. Lots de produits ----------------------------------------------------------------------------------------------------
alter table public.lots add column if not exists categorie text not null default 'Miel';
alter table public.lots add column if not exists unite text not null default 'pot';
alter table public.lots add column if not exists format_libelle text not null default '';
alter table public.lots add column if not exists seuil int;
alter table public.lots alter column format_g drop not null;
alter table public.lots drop constraint if exists lots_format_g_check;
alter table public.lots add constraint lots_format_g_check check (format_g is null or format_g > 0);
alter table public.lots drop constraint if exists lots_miel_format;
alter table public.lots add constraint lots_miel_format check (categorie <> 'Miel' or format_g is not null);
alter table public.lots drop constraint if exists lots_categorie_check;
alter table public.lots add constraint lots_categorie_check check (length(btrim(categorie)) between 1 and 40);
alter table public.lots drop constraint if exists lots_unite_check;
alter table public.lots add constraint lots_unite_check check (length(btrim(unite)) between 1 and 20);
alter table public.lots drop constraint if exists lots_format_libelle_check;
alter table public.lots add constraint lots_format_libelle_check check (length(format_libelle) <= 40);
alter table public.lots drop constraint if exists lots_seuil_check;
alter table public.lots add constraint lots_seuil_check check (seuil is null or seuil >= 0);
create index if not exists lots_categorie_idx on public.lots (exploitation_id, categorie);

-- 2. Stock des lots : mêmes colonnes qu'en 008, puis les nouvelles ---------------------------------------------------------
create or replace view public.lots_stock with (security_invoker = true) as
  select l.id, l.code, l.miel, l.format_g, l.prix, l.pots_initiaux, l.date_mise_en_pot, l.ddm, l.created_at,
         coalesce(sum(vl.quantite), 0::bigint)::int as pots_vendus,
         l.pots_initiaux - coalesce(sum(vl.quantite), 0::bigint)::int as pots_restants,
         l.extraction, l.exploitation_id, l.categorie, l.unite, l.format_libelle, l.seuil
  from public.lots l left join public.vente_lignes vl on vl.lot_id = l.id
  group by l.id;
grant select on public.lots_stock to authenticated;

-- 3. Créer le lot d'un produit -------------------------------------------------------------------------------------------
-- p = { id, code, categorie, nom, unite, format_libelle?, format_g?, prix, quantite, date?, ddm?, seuil? }
create or replace function public.creer_produit(p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_cat text := btrim(coalesce(p->>'categorie', ''));
  v_nom text := btrim(coalesce(p->>'nom', ''));
  v_q int := nullif(p->>'quantite', '')::int;
  e uuid;
begin
  if v_id is null then raise exception 'Identifiant de lot manquant'; end if;
  if exists (select 1 from public.lots where id = v_id) then return v_id; end if;
  e := public.exiger_ecriture();
  if v_cat = '' then raise exception 'Choisis le type de produit'; end if;
  if v_cat = 'Miel' then raise exception 'Le miel passe par la mise en pots'; end if;
  if v_nom = '' then raise exception 'Indique le nom du produit'; end if;
  if v_q is null or v_q < 0 then raise exception 'Indique la quantité en stock'; end if;
  if coalesce(nullif(p->>'prix', '')::numeric, 0) < 0 then raise exception 'Le prix ne peut pas être négatif'; end if;
  if coalesce(btrim(p->>'code'), '') = '' then raise exception 'Indique le numéro de lot'; end if;
  if exists (select 1 from public.lots where exploitation_id = e and code = btrim(p->>'code')) then
    raise exception 'Le lot % existe déjà : choisis un autre numéro.', btrim(p->>'code');
  end if;
  insert into public.lots (id, code, categorie, miel, unite, format_libelle, format_g, prix, pots_initiaux,
                           date_mise_en_pot, ddm, seuil)
  values (v_id, btrim(p->>'code'), v_cat, v_nom, coalesce(nullif(btrim(p->>'unite'), ''), 'pièce'),
          left(btrim(coalesce(p->>'format_libelle', '')), 40), nullif(p->>'format_g', '')::int,
          coalesce(nullif(p->>'prix', '')::numeric, 0), v_q, coalesce(nullif(p->>'date', '')::date, current_date),
          nullif(p->>'ddm', '')::date, nullif(p->>'seuil', '')::int);
  return v_id;
end;
$$;
revoke all on function public.creer_produit(jsonb) from public, anon;
grant execute on function public.creer_produit(jsonb) to authenticated;

-- 4. Commandes en ligne : tous les produits ------------------------------------------------------------------------------
-- La liste rendue change (colonnes ajoutées) : on la recrée. Ses appelants (plpgsql) la retrouvent par son nom.
drop function if exists public.boutique_disponibles(uuid);
create function public.boutique_disponibles(p_ex uuid)
returns table (miel text, format_g int, prix numeric, disponibles int, categorie text, format_libelle text, unite text)
language sql stable security definer set search_path = '' as $$
  with stock as (
    select l.categorie, l.miel, l.format_g, l.format_libelle, l.prix, min(l.unite) as unite,
           sum(l.pots_initiaux - coalesce((select sum(vl.quantite) from public.vente_lignes vl where vl.lot_id = l.id), 0))::int as restants
    from public.lots l
    where l.exploitation_id = p_ex
    group by l.categorie, l.miel, l.format_g, l.format_libelle, l.prix
  ), reserve as (
    select coalesce(x->>'categorie', 'Miel') as categorie, x->>'miel' as miel, nullif(x->>'format_g', '')::int as format_g,
           coalesce(x->>'format_libelle', '') as format_libelle, (x->>'prix')::numeric as prix,
           sum((x->>'quantite')::int)::int as pots
    from public.commandes c, jsonb_array_elements(c.lignes) x
    where c.exploitation_id = p_ex and c.statut = 'nouvelle'
    group by 1, 2, 3, 4, 5
  )
  select s.miel, s.format_g, s.prix, greatest(s.restants - coalesce(r.pots, 0), 0), s.categorie, s.format_libelle, s.unite
  from stock s left join reserve r
    on r.categorie = s.categorie and r.miel = s.miel and r.format_g is not distinct from s.format_g
       and r.format_libelle = s.format_libelle and r.prix = s.prix
  where s.restants - coalesce(r.pots, 0) > 0
  order by s.categorie <> 'Miel', s.categorie, s.miel, s.format_g nulls last, s.format_libelle;
$$;
revoke all on function public.boutique_disponibles(uuid) from public, anon, authenticated;

create or replace function public.boutique_publique(p_jeton text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b public.boutiques%rowtype;
begin
  select * into b from public.boutiques where jeton = p_jeton and ouverte;
  if b.exploitation_id is null then return jsonb_build_object('ouverte', false); end if;
  return jsonb_build_object(
    'ouverte', true,
    'nom', (select e.nom from public.exploitations e where e.id = b.exploitation_id),
    'message', b.message,
    'retraits', b.retraits,
    'produits', coalesce((select jsonb_agg(jsonb_build_object('categorie', d.categorie, 'miel', d.miel, 'format_g', d.format_g,
                                                               'format_libelle', d.format_libelle, 'unite', d.unite, 'prix', d.prix,
                                                               'disponibles', least(d.disponibles, 50)))
                          from public.boutique_disponibles(b.exploitation_id) d), '[]'::jsonb));
end;
$$;

create or replace function public.passer_commande(p_jeton text, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b public.boutiques%rowtype;
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  l jsonb;
  lignes jsonb := '[]'::jsonb;
  total numeric := 0;
  pots int := 0;
  q int;
  d record;
  retrait text := btrim(coalesce(p->>'retrait', ''));
begin
  select * into b from public.boutiques where jeton = p_jeton and ouverte;
  if b.exploitation_id is null then raise exception 'Cette page de commande est fermée.'; end if;
  if exists (select 1 from public.commandes where id = v_id) then return v_id; end if;
  if (select count(*) from public.commandes where exploitation_id = b.exploitation_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de commandes en ce moment : réessaie dans une heure.';
  end if;
  if length(btrim(coalesce(p->>'nom', ''))) not between 2 and 80 then raise exception 'Indique ton nom.'; end if;
  if coalesce(p->>'telephone', '') !~ '^[0-9+ .()-]{6,20}$' then raise exception 'Indique un numéro de téléphone valide.'; end if;
  if jsonb_array_length(b.retraits) > 0 and not exists (select 1 from jsonb_array_elements(b.retraits) r where r->>'nom' = retrait) then
    raise exception 'Choisis un lieu de retrait.';
  end if;
  if jsonb_typeof(p->'lignes') <> 'array' or jsonb_array_length(p->'lignes') not between 1 and 10 then
    raise exception 'Choisis au moins un produit.';
  end if;
  for l in select * from jsonb_array_elements(p->'lignes') loop
    q := coalesce((l->>'quantite')::int, 0);
    if q not between 1 and 20 then raise exception 'Entre 1 et 20 par produit.'; end if;
    select * into d from public.boutique_disponibles(b.exploitation_id) x
      where x.categorie = coalesce(l->>'categorie', 'Miel') and x.miel = l->>'miel'
        and x.format_g is not distinct from nullif(l->>'format_g', '')::int
        and x.format_libelle = coalesce(l->>'format_libelle', '') and x.prix = (l->>'prix')::numeric;
    if d.miel is null then raise exception 'Ce produit n''est plus disponible.'; end if;
    if d.disponibles < q then
      raise exception 'Il ne reste que % × % (%).', d.disponibles, d.miel,
        coalesce(nullif(d.format_libelle, ''), d.format_g || ' g', d.unite);
    end if;
    lignes := lignes || jsonb_build_object('categorie', d.categorie, 'miel', d.miel, 'format_g', d.format_g,
                                           'format_libelle', d.format_libelle, 'prix', d.prix, 'quantite', q);
    total := total + d.prix * q;
    pots := pots + q;
  end loop;
  if pots > 40 then raise exception 'Au plus 40 articles par commande : contacte-nous pour davantage.'; end if;
  insert into public.commandes (id, exploitation_id, nom, telephone, retrait, note, lignes, total)
  values (v_id, b.exploitation_id, btrim(p->>'nom'), btrim(p->>'telephone'), retrait, left(btrim(coalesce(p->>'note', '')), 300), lignes, total);
  return v_id;
end;
$$;
revoke all on function public.boutique_publique(text), public.passer_commande(text, jsonb) from public;
grant execute on function public.boutique_publique(text), public.passer_commande(text, jsonb) to anon, authenticated;

create or replace function public.livrer_commande(p_id uuid, p jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  c public.commandes%rowtype;
  e uuid := public.exiger_ecriture();
  client uuid;
  tel text;
  l jsonb;
  reste int;
  prendre int;
  lot record;
  lignes jsonb := '[]'::jsonb;
  vente uuid;
begin
  select * into c from public.commandes where id = p_id for update;
  if c.id is null then raise exception 'Commande introuvable'; end if;
  if c.statut = 'livree' then return c.vente_id; end if;
  if c.statut <> 'nouvelle' then raise exception 'Cette commande est annulée.'; end if;
  tel := regexp_replace(c.telephone, '[^0-9]', '', 'g');
  select id into client from public.clients
    where tel <> '' and regexp_replace(telephone, '[^0-9]', '', 'g') = tel order by created_at limit 1;
  if client is null then
    insert into public.clients (nom, telephone, cercle, notes) values (c.nom, c.telephone, 'Commande en ligne', '') returning id into client;
  end if;
  for l in select * from jsonb_array_elements(c.lignes) loop
    reste := (l->>'quantite')::int;
    for lot in
      select x.id, x.pots_initiaux - coalesce((select sum(vl.quantite) from public.vente_lignes vl where vl.lot_id = x.id), 0) as restants
      from public.lots x
      where x.categorie = coalesce(l->>'categorie', 'Miel') and x.miel = l->>'miel'
        and x.format_g is not distinct from nullif(l->>'format_g', '')::int
        and x.format_libelle = coalesce(l->>'format_libelle', '') and x.prix = (l->>'prix')::numeric
      order by x.date_mise_en_pot nulls last, x.created_at
    loop
      exit when reste = 0;
      prendre := least(reste, lot.restants);
      if prendre > 0 then
        lignes := lignes || jsonb_build_object('lot_id', lot.id, 'quantite', prendre);
        reste := reste - prendre;
      end if;
    end loop;
    if reste > 0 then
      raise exception 'Plus assez de % (%) pour cette commande.', l->>'miel',
        coalesce(nullif(l->>'format_libelle', ''), (l->>'format_g') || ' g', '');
    end if;
  end loop;
  vente := public.creer_vente(jsonb_build_object(
    'id', coalesce(nullif(p->>'vente_id', ''), gen_random_uuid()::text), 'client_id', client, 'lignes', lignes,
    'paye', coalesce((p->>'paye')::boolean, true), 'mode', coalesce(p->>'mode', ''), 'livre', true,
    'livraison', c.retrait, 'vendu_par', coalesce(p->>'vendu_par', ''), 'encaisse_par', coalesce(p->>'encaisse_par', '')));
  update public.commandes set statut = 'livree', vente_id = vente, traitee_le = now() where id = c.id;
  return vente;
end;
$$;
revoke all on function public.livrer_commande(uuid, jsonb) from public, anon;
grant execute on function public.livrer_commande(uuid, jsonb) to authenticated;
