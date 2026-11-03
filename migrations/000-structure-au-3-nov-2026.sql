-- Apidoo — structure de la base au 3 novembre 2026 (après la migration 007), relevée sur la base réelle.
-- Sert à recréer une base vide identique (projet de test) avant d'appliquer la migration 008.
-- Ne pas lancer sur la base réelle.

create table public.membres (email text primary key check (email = lower(email)));

create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce((auth.jwt() ->> 'email_verified')::boolean,
                   (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
                   false)
  );
$$;
revoke execute on function public.est_membre() from public, anon;
grant execute on function public.est_membre() to authenticated;

create table public.fournisseurs (
  id uuid primary key default gen_random_uuid(), nom text not null, produits text not null default '',
  contact text not null default '', telephone text not null default '', email text not null default '',
  notes text not null default '', created_at timestamptz not null default now());

create table public.articles (
  id uuid primary key default gen_random_uuid(), nom text not null unique, unite text not null default 'unité',
  stock numeric(10,2) not null default 0, seuil numeric(10,2) not null default 0, created_at timestamptz not null default now(),
  type text not null default 'Consommable' check (type in ('Consommable', 'Équipement')), valeur numeric(10,2),
  fournisseur_id uuid references public.fournisseurs(id) on delete set null);

create table public.budgets (annee int not null, poste text not null, montant numeric(10,2) not null default 0, primary key (annee, poste));

create table public.clients (
  id uuid primary key default gen_random_uuid(), nom text not null, cercle text not null default 'Amis',
  telephone text not null default '', email text not null default '', notes text not null default '',
  created_at timestamptz not null default now());

create table public.depenses (
  id uuid primary key default gen_random_uuid(), date_depense date not null default current_date, categorie text not null,
  libelle text not null, montant numeric(10,2) not null check (montant >= 0), created_at timestamptz not null default now(),
  fournisseur_id uuid references public.fournisseurs(id) on delete set null,
  nature text not null default 'Consommable' check (nature in ('Consommable', 'Immobilisation', 'Service', 'Autre')),
  duree_amort int check (duree_amort is null or duree_amort > 0),
  article_id uuid references public.articles(id) on delete set null,
  quantite numeric(10,2) check (quantite is null or quantite > 0), paye_par text not null default '');

create table public.lots (
  id uuid primary key default gen_random_uuid(), code text not null unique, miel text not null default 'Toutes fleurs',
  format_g int not null check (format_g > 0), prix numeric(8,2) not null check (prix >= 0),
  pots_initiaux int not null check (pots_initiaux >= 0), date_mise_en_pot date, ddm date, created_at timestamptz not null default now());

create table public.ruches (
  id uuid primary key default gen_random_uuid(), nom text not null unique, rucher text not null default '', annee_reine int,
  etat text not null default 'Bonne' check (etat in ('Bonne', 'À surveiller', 'Critique')), notes text not null default '',
  created_at timestamptz not null default now(), type_ruche text not null default '', date_installation date,
  lat double precision, lng double precision,
  sortie text not null default '' check (sortie in ('', 'Morte', 'Vendue', 'Réunie')), date_sortie date);

create table public.recoltes (
  id uuid primary key default gen_random_uuid(), ruche_id uuid references public.ruches(id) on delete set null,
  date_recolte date not null default current_date, kg numeric(7,2) not null check (kg > 0), created_at timestamptz not null default now());

create table public.reglages (id int primary key default 1 check (id = 1), data jsonb not null default '{}');

create table public.taches (
  id uuid primary key default gen_random_uuid(), titre text not null, echeance date,
  ruche_id uuid references public.ruches(id) on delete set null, assigne text not null default '',
  faite boolean not null default false, faite_le date, created_at timestamptz not null default now());

create table public.ventes (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete restrict,
  date_vente date not null default current_date, auteur text not null default '', created_at timestamptz not null default now(),
  paye boolean not null default true, mode text not null default '', livre boolean not null default true, encaisse_par text not null default '');

create table public.vente_lignes (
  id uuid primary key default gen_random_uuid(), vente_id uuid not null references public.ventes(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete restrict, quantite int not null check (quantite > 0),
  prix_unitaire numeric(8,2) not null check (prix_unitaire >= 0));

create table public.visites (
  id uuid primary key default gen_random_uuid(), ruche_id uuid not null references public.ruches(id) on delete cascade,
  date_visite date not null default current_date,
  activite text not null check (activite in ('Faible', 'Normale', 'Forte')),
  provisions text not null check (provisions in ('Faibles', 'Moyennes', 'Bonnes')),
  reine text not null check (reine in ('Vue', 'Non vue', 'Non cherchée')),
  poids_kg numeric(6,2), note text not null default '', auteur text not null default '', created_at timestamptz not null default now(),
  couvain text not null default '', varroa int check (varroa is null or varroa >= 0),
  traitement text not null default '', lot_produit text not null default '', traitement_dose text not null default '',
  retrait_prevu date, ordonnance boolean not null default false);

create table public.visite_intrants (
  id uuid primary key default gen_random_uuid(), visite_id uuid not null references public.visites(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete restrict, quantite numeric(10,2) not null check (quantite > 0));

create index visite_intrants_visite_id_idx on public.visite_intrants (visite_id);
create index visite_intrants_article_id_idx on public.visite_intrants (article_id);
create index recoltes_ruche_id_idx on public.recoltes (ruche_id);
create index vente_lignes_vente_id_idx on public.vente_lignes (vente_id);
create index vente_lignes_lot_id_idx on public.vente_lignes (lot_id);
create index articles_fournisseur_id_idx on public.articles (fournisseur_id);
create index taches_faite_echeance_idx on public.taches (faite, echeance);
create index depenses_fournisseur_id_idx on public.depenses (fournisseur_id);
create index depenses_article_id_idx on public.depenses (article_id);
create index ventes_client_id_idx on public.ventes (client_id);
create index visites_ruche_id_date_visite_idx on public.visites (ruche_id, date_visite desc);

create view public.lots_stock with (security_invoker = true) as
  select l.id, l.code, l.miel, l.format_g, l.prix, l.pots_initiaux, l.date_mise_en_pot, l.ddm, l.created_at,
         coalesce(sum(vl.quantite), 0::bigint)::int as pots_vendus,
         l.pots_initiaux - coalesce(sum(vl.quantite), 0::bigint)::int as pots_restants
  from public.lots l left join public.vente_lignes vl on vl.lot_id = l.id
  group by l.id;

create or replace function public.maj_stock_intrant() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set stock = stock - new.quantite where id = new.article_id;
    return new;
  end if;
  update public.articles set stock = stock + old.quantite where id = old.article_id;
  return old;
end;
$$;
create trigger visite_intrants_stock after insert or delete on public.visite_intrants
  for each row execute function public.maj_stock_intrant();

create or replace function public.maj_stock_achat() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.article_id is not null and old.quantite is not null then
    update public.articles set stock = stock - old.quantite where id = old.article_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.article_id is not null and new.quantite is not null then
    update public.articles set stock = stock + new.quantite where id = new.article_id;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger depenses_stock after insert or delete or update on public.depenses
  for each row execute function public.maj_stock_achat();

do $$ declare t text; begin
  foreach t in array array['ruches','articles','visites','visite_intrants','recoltes','lots','clients','ventes',
                           'vente_lignes','depenses','reglages','fournisseurs','taches','budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy membres_tout on public.%I for all to authenticated using ((select public.est_membre())) with check ((select public.est_membre()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
alter table public.membres enable row level security;
grant select on public.lots_stock to authenticated;
