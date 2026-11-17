-- Apiviz — migration 026 : commandes en ligne de miel (v5.56, maquettes « Nouveautés » validées par Pierre-Louis le
-- 17 nov. 2026 : page de commande pour les clients, commandes reçues dans Miel).
--
-- Contenu :
--   1. boutiques : une par exploitation. Jeton public (32 caractères, imprévisible) qui forme le lien de la page de
--      commande, ouverte ou fermée, un mot d'accueil, les lieux de retrait. Lue et réglée par les membres de
--      l'exploitation (responsable ou membre pour écrire), comme les autres tables (014).
--   2. commandes : ce que le client a réservé (nom, téléphone, retrait, lignes, total), son statut (nouvelle, livrée,
--      annulée) et la vente créée à la livraison. Lue et modifiée par les membres ; jamais écrite directement par la page
--      publique.
--   3. boutique_publique(jeton) : ce que la page publique a le droit de voir, et seulement quand la boutique est
--      ouverte : le nom de l'exploitation, le mot d'accueil, les retraits et les miels disponibles (miel, format, prix,
--      pots disponibles, plafonnés à 50). Rien d'autre : ni client, ni vente, ni lot, ni identifiant.
--   4. passer_commande(jeton, p) : la seule écriture possible sans compte. Contrôle tout (boutique ouverte, nom,
--      téléphone, retrait de la liste, 1 à 10 lignes, 1 à 20 pots par ligne, 40 pots au plus, stock disponible) et
--      limite à 30 commandes par heure et par boutique. Relancer la même commande (même id) ne la double pas.
--   5. livrer_commande(id, p) : transforme la commande en vente (client retrouvé par son téléphone, sinon créé ; pots
--      pris dans les lots les plus anciens du même miel, format et prix) par creer_vente (017), puis la marque livrée.
--      Tout ou rien.
-- Dépendances : 000 à 025 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture() et auditer() de 014,
--   creer_vente() de 017).
-- Casse l'ancienne version : NON. Deux tables et trois fonctions nouvelles ; rien d'existant n'est modifié.
-- Relançable : oui (if not exists, create or replace, drop policy if exists).
-- Sécurité :
--   - Le rôle anon n'a aucun droit sur les tables ; il n'exécute que boutique_publique et passer_commande.
--   - Ces deux fonctions sont en security definer, search_path vide, et ne travaillent que sur l'exploitation du jeton.
--   - Données personnelles : nom et téléphone du client, saisis par lui pour cette commande, visibles des seuls membres
--     de l'exploitation (politique de confidentialité mise à jour dans la même version).
-- Retour arrière : revenir au code précédent suffit ; fermer la boutique coupe la page publique.

-- 1. Boutiques -----------------------------------------------------------------------------------------------------------
create table if not exists public.boutiques (
  exploitation_id uuid primary key default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  jeton text not null unique default replace(gen_random_uuid()::text, '-', ''),
  ouverte boolean not null default false,
  message text not null default '' check (length(message) <= 400),
  retraits jsonb not null default '[]'::jsonb check (jsonb_typeof(retraits) = 'array' and jsonb_array_length(retraits) <= 6),
  modifie_le timestamptz not null default now()
);

-- 2. Commandes -----------------------------------------------------------------------------------------------------------
create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null references public.exploitations(id) on delete cascade,
  nom text not null check (length(btrim(nom)) between 2 and 80),
  telephone text not null check (telephone ~ '^[0-9+ .()-]{6,20}$'),
  retrait text not null default '',
  note text not null default '' check (length(note) <= 300),
  lignes jsonb not null check (jsonb_typeof(lignes) = 'array'),
  total numeric(10, 2) not null default 0 check (total >= 0),
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'livree', 'annulee')),
  vente_id uuid references public.ventes(id) on delete set null,
  created_at timestamptz not null default now(),
  traitee_le timestamptz
);
create index if not exists commandes_exploitation_idx on public.commandes (exploitation_id, statut, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['boutiques', 'commandes'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lire on public.%I', t);
    execute format('drop policy if exists ajouter on public.%I', t);
    execute format('drop policy if exists modifier on public.%I', t);
    execute format('drop policy if exists supprimer on public.%I', t);
    execute format('create policy lire on public.%I for select to authenticated
                      using (exploitation_id = (select public.exploitation_courante()))', t);
    execute format('create policy modifier on public.%I for update to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy supprimer on public.%I for delete to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after update or delete on public.%I for each row execute function public.auditer()', t);
  end loop;
end $$;
-- Une boutique se crée depuis l'application ; une commande, seulement par passer_commande().
create policy ajouter on public.boutiques for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture()));

-- 3. Miels disponibles d'une exploitation (pots restants moins pots réservés), par miel, format et prix -----------------
create or replace function public.boutique_disponibles(p_ex uuid)
returns table (miel text, format_g int, prix numeric, disponibles int)
language sql stable security definer set search_path = '' as $$
  with stock as (
    select l.miel, l.format_g, l.prix,
           sum(l.pots_initiaux - coalesce((select sum(vl.quantite) from public.vente_lignes vl where vl.lot_id = l.id), 0))::int as restants
    from public.lots l
    where l.exploitation_id = p_ex
    group by l.miel, l.format_g, l.prix
  ), reserve as (
    select x->>'miel' as miel, (x->>'format_g')::int as format_g, (x->>'prix')::numeric as prix, sum((x->>'quantite')::int)::int as pots
    from public.commandes c, jsonb_array_elements(c.lignes) x
    where c.exploitation_id = p_ex and c.statut = 'nouvelle'
    group by 1, 2, 3
  )
  select s.miel, s.format_g, s.prix, greatest(s.restants - coalesce(r.pots, 0), 0)
  from stock s left join reserve r on r.miel = s.miel and r.format_g = s.format_g and r.prix = s.prix
  where s.restants - coalesce(r.pots, 0) > 0
  order by s.miel, s.format_g;
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
    'produits', coalesce((select jsonb_agg(jsonb_build_object('miel', d.miel, 'format_g', d.format_g, 'prix', d.prix,
                                                               'disponibles', least(d.disponibles, 50)))
                          from public.boutique_disponibles(b.exploitation_id) d), '[]'::jsonb));
end;
$$;

-- 4. Passer une commande (sans compte) ----------------------------------------------------------------------------------
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
    raise exception 'Choisis au moins un pot.';
  end if;
  for l in select * from jsonb_array_elements(p->'lignes') loop
    q := coalesce((l->>'quantite')::int, 0);
    if q not between 1 and 20 then raise exception 'Entre 1 et 20 pots par miel.'; end if;
    select * into d from public.boutique_disponibles(b.exploitation_id) x
      where x.miel = l->>'miel' and x.format_g = (l->>'format_g')::int and x.prix = (l->>'prix')::numeric;
    if d.miel is null then raise exception 'Ce miel n''est plus disponible.'; end if;
    if d.disponibles < q then raise exception 'Il ne reste que % pots de % (% g).', d.disponibles, d.miel, d.format_g; end if;
    lignes := lignes || jsonb_build_object('miel', d.miel, 'format_g', d.format_g, 'prix', d.prix, 'quantite', q);
    total := total + d.prix * q;
    pots := pots + q;
  end loop;
  if pots > 40 then raise exception 'Au plus 40 pots par commande : contacte-nous pour davantage.'; end if;
  insert into public.commandes (id, exploitation_id, nom, telephone, retrait, note, lignes, total)
  values (v_id, b.exploitation_id, btrim(p->>'nom'), btrim(p->>'telephone'), retrait, left(btrim(coalesce(p->>'note', '')), 300), lignes, total);
  return v_id;
end;
$$;

revoke all on function public.boutique_publique(text), public.passer_commande(text, jsonb) from public;
grant execute on function public.boutique_publique(text), public.passer_commande(text, jsonb) to anon, authenticated;

-- 5. Livrer une commande : la vente, puis le statut ----------------------------------------------------------------------
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
      where x.miel = l->>'miel' and x.format_g = (l->>'format_g')::int and x.prix = (l->>'prix')::numeric
      order by x.date_mise_en_pot nulls last, x.created_at
    loop
      exit when reste = 0;
      prendre := least(reste, lot.restants);
      if prendre > 0 then
        lignes := lignes || jsonb_build_object('lot_id', lot.id, 'quantite', prendre);
        reste := reste - prendre;
      end if;
    end loop;
    if reste > 0 then raise exception 'Plus assez de pots de % (% g) pour cette commande.', l->>'miel', l->>'format_g'; end if;
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
