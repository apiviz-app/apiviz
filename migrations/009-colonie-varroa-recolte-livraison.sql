-- Apidoo — migration 009 : colonie, varroa, récolte, livraison
-- Uniquement des ajouts (aucune suppression). Peut être relancée sans risque.

-- 1. Colonie : reine, hausses, équipement en place.
alter table public.ruches
  add column if not exists reine_origine text not null default '',
  add column if not exists reine_introduite date,
  add column if not exists hausses int not null default 0 check (hausses >= 0),
  add column if not exists equipement text[] not null default '{}';

-- 2. Événements de la vie d'une colonie (division, essaimage, réunion, nouvelle reine, sortie…).
create table if not exists public.ruche_evenements (
  id uuid primary key default gen_random_uuid(),
  ruche_id uuid not null references public.ruches(id) on delete cascade,
  type text not null check (type in ('installation', 'division', 'essaimage', 'reunion', 'reine', 'sortie', 'reactivation')),
  date_evenement date not null default current_date,
  detail text not null default '',
  autre_ruche_id uuid references public.ruches(id) on delete set null,
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists ruche_evenements_ruche_idx on public.ruche_evenements (ruche_id, date_evenement desc);
grant select, insert, update, delete on public.ruche_evenements to authenticated;
alter table public.ruche_evenements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ruche_evenements' and policyname = 'membres_tout') then
    create policy membres_tout on public.ruche_evenements for all to authenticated
      using ((select public.est_membre())) with check ((select public.est_membre()));
  end if;
end $$;

-- 3. Varroa : méthode de comptage et nombre d'abeilles prélevées (pour un taux pour 100 abeilles).
alter table public.visites
  add column if not exists varroa_methode text not null default '',
  add column if not exists varroa_abeilles int check (varroa_abeilles is null or varroa_abeilles > 0);

-- 4. Récolte : hausses, humidité, miel, et code d'extraction qui relie récoltes et lots (traçabilité).
alter table public.recoltes
  add column if not exists hausses int check (hausses is null or hausses >= 0),
  add column if not exists humidite numeric(4,1),
  add column if not exists miel text not null default '',
  add column if not exists extraction text not null default '';
alter table public.lots add column if not exists extraction text not null default '';

create or replace view public.lots_stock with (security_invoker = true) as
  select l.id, l.code, l.miel, l.format_g, l.prix, l.pots_initiaux, l.date_mise_en_pot, l.ddm, l.created_at,
         coalesce(sum(vl.quantite), 0::bigint)::int as pots_vendus,
         l.pots_initiaux - coalesce(sum(vl.quantite), 0::bigint)::int as pots_restants,
         l.extraction
  from public.lots l left join public.vente_lignes vl on vl.lot_id = l.id
  group by l.id;

-- 5. Livraison : où et quand remettre une commande.
alter table public.ventes add column if not exists livraison text not null default '';

-- 6. Les fonctions de création enregistrent les nouveaux champs.
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
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0 then
    raise exception 'Ajoutez au moins un pot';
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
