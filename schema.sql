-- Apidoo : schéma de la base de données (MVP)
-- Accès réservé aux adresses présentes dans la table "membres".

create table public.membres (
  email text primary key check (email = lower(email))
);

create function public.est_membre() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce((auth.jwt() ->> 'email_verified')::boolean,
                   (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
                   false)
  );
$$;

create table public.ruches (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  rucher text not null default '',
  annee_reine int,
  etat text not null default 'Bonne' check (etat in ('Bonne', 'À surveiller', 'Critique')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  unite text not null default 'unité',
  stock numeric(10,2) not null default 0,
  seuil numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.visites (
  id uuid primary key default gen_random_uuid(),
  ruche_id uuid not null references public.ruches(id) on delete cascade,
  date_visite date not null default current_date,
  activite text not null check (activite in ('Faible', 'Normale', 'Forte')),
  provisions text not null check (provisions in ('Faibles', 'Moyennes', 'Bonnes')),
  reine text not null check (reine in ('Vue', 'Non vue', 'Non cherchée')),
  poids_kg numeric(6,2),
  note text not null default '',
  auteur text not null default '',
  created_at timestamptz not null default now()
);

create table public.visite_intrants (
  id uuid primary key default gen_random_uuid(),
  visite_id uuid not null references public.visites(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete restrict,
  quantite numeric(10,2) not null check (quantite > 0)
);

create table public.recoltes (
  id uuid primary key default gen_random_uuid(),
  ruche_id uuid references public.ruches(id) on delete set null, -- vide = récolte globale
  date_recolte date not null default current_date,
  kg numeric(7,2) not null check (kg > 0),
  created_at timestamptz not null default now()
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  miel text not null default 'Toutes fleurs',
  format_g int not null check (format_g in (250, 500)),
  prix numeric(8,2) not null check (prix >= 0),
  pots_initiaux int not null check (pots_initiaux >= 0),
  date_mise_en_pot date,
  ddm date,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  cercle text not null default 'Amis',
  telephone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.ventes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  date_vente date not null default current_date,
  auteur text not null default '',
  created_at timestamptz not null default now()
);

create table public.vente_lignes (
  id uuid primary key default gen_random_uuid(),
  vente_id uuid not null references public.ventes(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete restrict,
  quantite int not null check (quantite > 0),
  prix_unitaire numeric(8,2) not null check (prix_unitaire >= 0)
);

create table public.depenses (
  id uuid primary key default gen_random_uuid(),
  date_depense date not null default current_date,
  categorie text not null check (categorie in ('Pots & étiquettes', 'Alimentation', 'Traitements', 'Matériel', 'Autre')),
  libelle text not null,
  montant numeric(10,2) not null check (montant >= 0),
  created_at timestamptz not null default now()
);

create index on public.visites (ruche_id, date_visite desc);
create index on public.visite_intrants (visite_id);
create index on public.visite_intrants (article_id);
create index on public.recoltes (ruche_id);
create index on public.ventes (client_id);
create index on public.vente_lignes (vente_id);
create index on public.vente_lignes (lot_id);

-- Le stock de consommables suit les intrants : il baisse à l'ajout, remonte à la suppression.
create function public.maj_stock_intrant() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set stock = stock - new.quantite where id = new.article_id;
    return new;
  end if;
  update public.articles set stock = stock + old.quantite where id = old.article_id;
  return old;
end;
$$;

create trigger visite_intrants_stock
after insert or delete on public.visite_intrants
for each row execute function public.maj_stock_intrant();

-- Vue calculée : jamais de stock de pots stocké en double.
create view public.lots_stock with (security_invoker = true) as
select l.*,
       coalesce(sum(vl.quantite), 0)::int as pots_vendus,
       l.pots_initiaux - coalesce(sum(vl.quantite), 0)::int as pots_restants
from public.lots l
left join public.vente_lignes vl on vl.lot_id = l.id
group by l.id;

-- Enregistre une visite et ses intrants en une seule opération.
create function public.creer_visite(p jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  i jsonb;
  dispo numeric;
  nom_article text;
begin
  insert into public.visites (ruche_id, date_visite, activite, provisions, reine, poids_kg, note, auteur)
  values ((p->>'ruche_id')::uuid, coalesce((p->>'date_visite')::date, current_date), p->>'activite',
          p->>'provisions', p->>'reine', nullif(p->>'poids_kg', '')::numeric,
          coalesce(p->>'note', ''), coalesce(auth.jwt() ->> 'email', ''))
  returning id into v_id;

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
  return v_id;
end;
$$;

-- Enregistre une vente, fige le prix du lot et refuse de vendre plus que le stock.
create function public.creer_vente(p jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  i jsonb;
  lot public.lots%rowtype;
  vendus int;
begin
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0 then
    raise exception 'Ajoutez au moins un pot';
  end if;
  insert into public.ventes (client_id, date_vente, auteur)
  values ((p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''))
  returning id into v_id;

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

-- Sécurité : chaque table n'est lisible et modifiable que par les membres.
do $$
declare t text;
begin
  foreach t in array array['ruches','articles','visites','visite_intrants','recoltes','lots','clients','ventes','vente_lignes','depenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy membres_tout on public.%I for all to authenticated using ((select public.est_membre())) with check ((select public.est_membre()))', t);
  end loop;
end $$;

alter table public.membres enable row level security;
-- Aucune politique sur "membres" : la liste n'est modifiable que depuis Supabase.

revoke all on function public.creer_visite(jsonb) from public, anon;
revoke all on function public.creer_vente(jsonb) from public, anon;
grant execute on function public.creer_visite(jsonb) to authenticated;
grant execute on function public.creer_vente(jsonb) to authenticated;

grant select on public.lots_stock to authenticated;

-- Données de départ : vos 6 ruches, et les consommables à renseigner.
insert into public.ruches (nom) values
  ('Ruche 1'), ('Ruche 2'), ('Ruche 3'), ('Ruche 4'), ('Ruche 5'), ('Ruche 6');
insert into public.articles (nom, unite) values ('Candy', 'kg'), ('Sirop', 'L');
