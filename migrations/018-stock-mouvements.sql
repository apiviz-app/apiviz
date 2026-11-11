-- Apiviz — migration 018 : catalogue d'articles, achats en plusieurs lignes, journal des mouvements de stock,
-- mise en pots (v5.30, AP-FEAT-075, demande du 11 nov. 2026 : « que l'achat crée du stock, et que la mise en pots
-- transforme les pots vides en pots de miel, le tout tracé »).
--
-- Contenu :
--   1. Catalogue : articles.famille (emballage, alimentation, traitement, cire, equipement, autre), contenance_g (un pot
--      vide de 250 g), duree_amort (Capex), poste (poste de dépense proposé). Opex ou Capex reste articles.type
--      (Consommable = Opex, Équipement = Capex), que l'ancienne version lit déjà. Reprise : famille et contenance
--      déduites du nom et du type.
--   2. Achats : depenses.achat_id (les lignes d'une même facture) et depenses.piece (numéro de la facture du
--      fournisseur).
--   3. mouvements_stock : chaque changement de stock d'un article, avec sa date, son type (ouverture, entree,
--      consommation, ajustement, inventaire, rebut), sa quantité signée, son origine (reprise, achat, visite,
--      mise_en_pots, saisie) et ce qui l'a causé (dépense, visite, lot). articles.stock = somme des mouvements :
--      un mouvement ajouté, modifié ou supprimé met le stock à jour. Reprise : un mouvement d'ouverture par article
--      dont le stock n'est pas nul.
--   4. Les déclencheurs d'achat (maj_stock_achat) et de visite (maj_stock_intrant), et ajouter_stock(), passent par des
--      mouvements. Une écriture directe de articles.stock (ancienne version : fiche article, entrée de stock sans 012)
--      reste acceptée et devient un mouvement « ajustement » : rien ne change sans trace.
--   5. enregistrer_achat(p) : une facture en plusieurs lignes (articles existants, nouveaux, ou lignes sans article),
--      en une transaction, idempotente par p.id. Opex ou Capex vient de l'article.
--   6. mettre_en_pots(p) : crée le lot et retire du stock les pots vides, couvercles, étiquettes choisis, en une
--      transaction, idempotente par p.id (identifiant du lot). Refuse si un article manque.
-- Dépendances : 000 à 017 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer(),
--   rattachements() de 014 à 016, lots.extraction de 009, depenses.achete_par de 017).
-- Casse l'ancienne version : NON.
--   - Uniquement des ajouts : colonnes facultatives, une table, des fonctions. articles.stock reste lu et écrit comme
--     avant ; ses changements sont en plus notés dans mouvements_stock.
--   - Un lot créé par l'ancienne version (fiche « Nouveau lot ») ne retire rien du stock, comme avant.
-- Relançable : oui (if not exists, create or replace, drop … if exists ; la reprise ne traite que les articles sans
--   mouvement).
-- Sécurité : RLS sur mouvements_stock comme 014 (lecture : exploitation courante ; écriture : responsable ou membre),
--   audit des modifications et suppressions. Fonctions et déclencheurs en security invoker, search_path vide.

-- 1. Catalogue --------------------------------------------------------------------------------------------------------
alter table public.articles add column if not exists famille text not null default '';
alter table public.articles add column if not exists contenance_g int;
alter table public.articles add column if not exists duree_amort int;
alter table public.articles add column if not exists poste text not null default '';
alter table public.articles drop constraint if exists articles_famille_check;
alter table public.articles add constraint articles_famille_check
  check (famille in ('', 'emballage', 'alimentation', 'traitement', 'cire', 'equipement', 'autre'));
alter table public.articles drop constraint if exists articles_contenance_check;
alter table public.articles add constraint articles_contenance_check check (contenance_g is null or contenance_g > 0);
alter table public.articles drop constraint if exists articles_duree_amort_check;
alter table public.articles add constraint articles_duree_amort_check check (duree_amort is null or duree_amort > 0);

-- Famille et contenance déduites du nom (reprise, et articles créés par l'ancienne version).
create or replace function public.famille_article(nom text, type text) returns text
language sql immutable set search_path = '' as $$
  select case
    when type = 'Équipement' then 'equipement'
    when nom ~* '(pot|bocal|couvercle|capsule|[ée]tiquette|carton|bo[iî]te)' then 'emballage'
    when nom ~* '(candy|candi|sirop|sucre|nourri|pollen|prot[ée]ine)' then 'alimentation'
    when nom ~* '(varroa|lani[èe]re|acide|apivar|apistan|oxalique|formique|traitement|thymol)' then 'traitement'
    when nom ~* 'cire' then 'cire'
    else 'autre' end;
$$;
create or replace function public.contenance_article(nom text) returns int
language sql immutable set search_path = '' as $$
  select case
    when nom ~* '(pot|bocal)' and nom ~* '\d+\s*kg' then (substring(nom from '(?i)(\d+)\s*kg'))::int * 1000
    when nom ~* '(pot|bocal)' and nom ~* '\d+\s*g\M' then (substring(nom from '(?i)(\d+)\s*g\M'))::int
    end;
$$;

-- Article créé ou renommé sans famille : déduite du nom (l'ancienne version ne la connaît pas).
create or replace function public.articles_famille() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.famille = '' then new.famille := public.famille_article(new.nom, new.type); end if;
  if new.contenance_g is null and new.famille = 'emballage' then new.contenance_g := public.contenance_article(new.nom); end if;
  return new;
end;
$$;
drop trigger if exists articles_famille on public.articles;
create trigger articles_famille before insert or update of nom, type, famille on public.articles
  for each row execute function public.articles_famille();

-- 2. Achats en plusieurs lignes ---------------------------------------------------------------------------------------
alter table public.depenses add column if not exists achat_id uuid;
alter table public.depenses add column if not exists piece text not null default '';
create index if not exists depenses_achat_idx on public.depenses (achat_id);

-- 3. Journal des mouvements -------------------------------------------------------------------------------------------
create table if not exists public.mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  article_id uuid not null,
  date_mouvement date not null default current_date,
  type text not null check (type in ('ouverture', 'entree', 'consommation', 'ajustement', 'inventaire', 'rebut')),
  quantite numeric(10,2) not null check (quantite <> 0),
  origine text not null default 'saisie' check (origine in ('reprise', 'achat', 'visite', 'mise_en_pots', 'saisie')),
  depense_id uuid references public.depenses(id) on delete set null,
  lot_id uuid references public.lots(id) on delete set null,
  visite_id uuid,                                      -- pour mémoire (la visite peut être supprimée ensuite)
  note text not null default '',
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now(),
  constraint mouvements_stock_article_id_meme_exploitation foreign key (article_id, exploitation_id)
    references public.articles (id, exploitation_id) on delete cascade
);
create index if not exists mouvements_stock_article_idx on public.mouvements_stock (article_id, date_mouvement);
create index if not exists mouvements_stock_exploitation_idx on public.mouvements_stock (exploitation_id);
create index if not exists mouvements_stock_lot_idx on public.mouvements_stock (lot_id);
create index if not exists mouvements_stock_depense_idx on public.mouvements_stock (depense_id);

-- Dépense et lot rattachés : même exploitation (clés qui se vident à la suppression : contrôle par déclencheur).
create or replace function public.mouvements_meme_exploitation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.depense_id is not null
     and not exists (select 1 from public.depenses d where d.id = new.depense_id and d.exploitation_id = new.exploitation_id) then
    raise exception 'Dépense introuvable';
  end if;
  if new.lot_id is not null
     and not exists (select 1 from public.lots l where l.id = new.lot_id and l.exploitation_id = new.exploitation_id) then
    raise exception 'Lot introuvable';
  end if;
  return new;
end;
$$;
drop trigger if exists meme_exploitation on public.mouvements_stock;
create trigger meme_exploitation before insert or update of depense_id, lot_id, exploitation_id on public.mouvements_stock
  for each row execute function public.mouvements_meme_exploitation();

-- Le stock suit les mouvements. Deux drapeaux de transaction évitent la boucle avec le déclencheur d'articles :
--   apidoo.stock_par_mouvement : la mise à jour du stock vient d'un mouvement (rien à noter de plus) ;
--   apidoo.stock_note_seul    : le mouvement note un changement déjà fait (rien à appliquer).
create or replace function public.mouvements_appliquer() returns trigger
language plpgsql set search_path = '' as $$
declare delta numeric;
begin
  if current_setting('apidoo.stock_note_seul', true) = 'on' then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    delta := new.quantite;
  elsif tg_op = 'DELETE' then
    delta := -old.quantite;
  else
    if new.article_id is distinct from old.article_id then
      perform set_config('apidoo.stock_par_mouvement', 'on', true);
      update public.articles set stock = stock - old.quantite where id = old.article_id;
      update public.articles set stock = stock + new.quantite where id = new.article_id;
      perform set_config('apidoo.stock_par_mouvement', '', true);
      return new;
    end if;
    delta := new.quantite - old.quantite;
  end if;
  if delta <> 0 then
    perform set_config('apidoo.stock_par_mouvement', 'on', true);
    update public.articles set stock = stock + delta where id = coalesce(new.article_id, old.article_id);
    perform set_config('apidoo.stock_par_mouvement', '', true);
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists mouvements_appliquer on public.mouvements_stock;
create trigger mouvements_appliquer after insert or delete or update of quantite, article_id on public.mouvements_stock
  for each row execute function public.mouvements_appliquer();

-- Écriture directe de articles.stock (ancienne version, fiche article) : notée comme un ajustement.
create or replace function public.articles_stock_journal() returns trigger
language plpgsql set search_path = '' as $$
declare delta numeric;
begin
  if current_setting('apidoo.stock_par_mouvement', true) = 'on' then return new; end if;
  delta := case when tg_op = 'INSERT' then new.stock else new.stock - old.stock end;
  if coalesce(delta, 0) = 0 then return new; end if;
  perform set_config('apidoo.stock_note_seul', 'on', true);
  insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine)
  values (new.id, new.exploitation_id, case when tg_op = 'INSERT' then 'ouverture' else 'ajustement' end, delta, 'saisie');
  perform set_config('apidoo.stock_note_seul', '', true);
  return new;
end;
$$;
drop trigger if exists articles_stock_journal on public.articles;
create trigger articles_stock_journal after insert or update of stock on public.articles
  for each row execute function public.articles_stock_journal();

-- 4. Achats et visites : par des mouvements ----------------------------------------------------------------------------
create or replace function public.maj_stock_achat() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.article_id is not distinct from old.article_id and new.quantite is not distinct from old.quantite then
    return new;  -- libellé, montant, date… : le stock ne bouge pas
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.article_id is not null and old.quantite is not null
     and exists (select 1 from public.articles where id = old.article_id) then  -- article supprimé : rien à défaire
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, depense_id, date_mouvement, note)
    values (old.article_id, old.exploitation_id, 'ajustement', -old.quantite, 'achat',
            case when tg_op = 'UPDATE' then old.id end, old.date_depense,
            case when tg_op = 'DELETE' then 'Achat supprimé : ' || old.libelle else 'Achat modifié' end);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.article_id is not null and new.quantite is not null then
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, depense_id, date_mouvement)
    values (new.article_id, new.exploitation_id, 'entree', new.quantite, 'achat', new.id, new.date_depense);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.maj_stock_intrant() returns trigger
language plpgsql set search_path = '' as $$
declare v_date date;
begin
  if tg_op = 'INSERT' then
    select date_visite into v_date from public.visites where id = new.visite_id;
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, visite_id, date_mouvement)
    values (new.article_id, new.exploitation_id, 'consommation', -new.quantite, 'visite', new.visite_id, coalesce(v_date, current_date));
    return new;
  end if;
  if exists (select 1 from public.articles where id = old.article_id) then
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, visite_id, note)
    values (old.article_id, old.exploitation_id, 'ajustement', old.quantite, 'visite', old.visite_id, 'Visite supprimée');
  end if;
  return old;
end;
$$;

-- Entrée de stock sans facture (bouton « + Entrée ») : un mouvement d'entrée plutôt qu'une écriture du stock.
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
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine)
    values (a.id, e, 'entree', q, 'saisie');
  else
    d_id := coalesce(nullif(d->>'id', '')::uuid, gen_random_uuid());
    if not exists (select 1 from public.depenses where id = d_id) then
      if nullif(d->>'fournisseur_id', '') is not null and not exists (
           select 1 from public.fournisseurs where id = (d->>'fournisseur_id')::uuid and exploitation_id = e) then
        raise exception 'Fournisseur introuvable dans cette exploitation';
      end if;
      insert into public.depenses (id, libelle, categorie, montant, date_depense, fournisseur_id, article_id, quantite, nature, duree_amort)
      values (d_id, coalesce(nullif(d->>'libelle', ''), a.nom), coalesce(nullif(d->>'categorie', ''), nullif(a.poste, ''), 'Autre'),
              (d->>'montant')::numeric, coalesce((d->>'date_depense')::date, current_date),
              nullif(d->>'fournisseur_id', '')::uuid, a.id, q,
              case when a.type = 'Équipement' then 'Immobilisation' else 'Consommable' end,
              case when a.type = 'Équipement' then coalesce(a.duree_amort, 5) end);
    end if;
  end if;
  return (select stock from public.articles where id = a.id);
end;
$$;

-- 5. Achat en plusieurs lignes ----------------------------------------------------------------------------------------
-- p = { id, date, fournisseur_id?, piece?, achete_par?, paye_par?, lignes: [{ id?, article_id? | article?: { id?, nom, unite, type,
--       famille, contenance_g, duree_amort, poste, seuil }, libelle?, quantite?, montant, categorie? }] }
-- Une ligne avec article : dépense Consommable (Opex) ou Immobilisation (Capex) selon l'article, et entrée de stock.
-- Une ligne sans article : dépense Service (livraison, frais…), sans stock. Idempotente par p.id.
create or replace function public.enregistrer_achat(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_four uuid := nullif(p->>'fournisseur_id', '')::uuid;
  e uuid;
  l jsonb;
  na jsonb;
  a public.articles%rowtype;
  q numeric;
  m numeric;
begin
  if v_id is null then raise exception 'Identifiant d''achat manquant'; end if;
  if exists (select 1 from public.depenses where achat_id = v_id) then return v_id; end if;
  e := public.exiger_ecriture();
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0 then raise exception 'Ajoute au moins une ligne'; end if;
  if v_four is not null and not exists (select 1 from public.fournisseurs where id = v_four) then
    raise exception 'Fournisseur introuvable';
  end if;
  for l in select * from jsonb_array_elements(p->'lignes') loop
    m := nullif(l->>'montant', '')::numeric;
    if m is null or m < 0 then raise exception 'Indique le montant de chaque ligne'; end if;
    a := null;
    na := l->'article';
    if na is not null and jsonb_typeof(na) = 'object' then
      -- Nouvel article du catalogue (ou article du même nom déjà là).
      if coalesce(btrim(na->>'nom'), '') = '' then raise exception 'Donne un nom au nouvel article'; end if;
      select * into a from public.articles where exploitation_id = e and lower(btrim(nom)) = lower(btrim(na->>'nom'));
      if a.id is null then
        insert into public.articles (id, nom, unite, type, famille, contenance_g, duree_amort, poste, seuil, stock, fournisseur_id)
        values (coalesce(nullif(na->>'id', '')::uuid, gen_random_uuid()), btrim(na->>'nom'),
                coalesce(nullif(na->>'unite', ''), 'unité'),
                case when na->>'type' = 'Équipement' then 'Équipement' else 'Consommable' end,
                coalesce(na->>'famille', ''), nullif(na->>'contenance_g', '')::int, nullif(na->>'duree_amort', '')::int,
                coalesce(na->>'poste', ''), coalesce(nullif(na->>'seuil', '')::numeric, 0), 0, v_four)
        returning * into a;
      end if;
    elsif nullif(l->>'article_id', '') is not null then
      select * into a from public.articles where id = (l->>'article_id')::uuid;
      if a.id is null then raise exception 'Article introuvable'; end if;
    end if;
    if a.id is not null then
      q := nullif(l->>'quantite', '')::numeric;
      if q is null or q <= 0 then raise exception 'Indique la quantité achetée de %', a.nom; end if;
      insert into public.depenses (id, achat_id, piece, libelle, categorie, montant, date_depense, fournisseur_id, achete_par, paye_par,
                                   nature, duree_amort, article_id, quantite)
      values (coalesce(nullif(l->>'id', '')::uuid, gen_random_uuid()), v_id, coalesce(p->>'piece', ''),
              coalesce(nullif(btrim(l->>'libelle'), ''), a.nom),
              coalesce(nullif(l->>'categorie', ''), nullif(a.poste, ''), 'Autre'), m, v_date, v_four,
              coalesce(p->>'achete_par', ''), coalesce(p->>'paye_par', ''),
              case when a.type = 'Équipement' then 'Immobilisation' else 'Consommable' end,
              case when a.type = 'Équipement' then coalesce(a.duree_amort, 5) end, a.id, q);
      update public.articles set valeur = round(m / q, 2), fournisseur_id = coalesce(fournisseur_id, v_four)
      where id = a.id and m > 0;
    else
      if coalesce(btrim(l->>'libelle'), '') = '' then raise exception 'Donne un libellé à chaque ligne'; end if;
      insert into public.depenses (id, achat_id, piece, libelle, categorie, montant, date_depense, fournisseur_id, achete_par, paye_par, nature)
      values (coalesce(nullif(l->>'id', '')::uuid, gen_random_uuid()), v_id, coalesce(p->>'piece', ''), btrim(l->>'libelle'),
              coalesce(nullif(l->>'categorie', ''), 'Autre'), m, v_date, v_four, coalesce(p->>'achete_par', ''),
              coalesce(p->>'paye_par', ''), 'Service');
    end if;
  end loop;
  return v_id;
end;
$$;

-- 6. Mise en pots ------------------------------------------------------------------------------------------------------
-- p = { id, code, miel, format_g, prix, pots, date?, ddm?, extraction?, intrants: [{ article_id, quantite }] }
-- Crée le lot (pots_initiaux = pots) et retire chaque intrant du stock. Refuse si un intrant manque. Idempotente par p.id.
create or replace function public.mettre_en_pots(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_pots int := nullif(p->>'pots', '')::int;
  e uuid;
  i jsonb;
  a public.articles%rowtype;
  q numeric;
begin
  if v_id is null then raise exception 'Identifiant de lot manquant'; end if;
  if exists (select 1 from public.lots where id = v_id) then return v_id; end if;
  e := public.exiger_ecriture();
  if v_pots is null or v_pots <= 0 then raise exception 'Indique le nombre de pots remplis'; end if;
  if coalesce(nullif(p->>'format_g', '')::int, 0) <= 0 then raise exception 'Indique le format du pot'; end if;
  if coalesce(btrim(p->>'code'), '') = '' then raise exception 'Indique le numéro de lot'; end if;
  if exists (select 1 from public.lots where exploitation_id = e and code = btrim(p->>'code')) then
    raise exception 'Le lot % existe déjà : choisis un autre numéro.', btrim(p->>'code');
  end if;
  insert into public.lots (id, code, miel, format_g, prix, pots_initiaux, date_mise_en_pot, ddm, extraction)
  values (v_id, btrim(p->>'code'), coalesce(nullif(btrim(p->>'miel'), ''), 'Toutes fleurs'), (p->>'format_g')::int,
          coalesce(nullif(p->>'prix', '')::numeric, 0), v_pots, v_date, nullif(p->>'ddm', '')::date, coalesce(p->>'extraction', ''));
  for i in select * from jsonb_array_elements(coalesce(p->'intrants', '[]'::jsonb)) loop
    q := nullif(i->>'quantite', '')::numeric;
    if q is null or q <= 0 then continue; end if;
    select * into a from public.articles where id = nullif(i->>'article_id', '')::uuid for update;
    if a.id is null then raise exception 'Article introuvable'; end if;
    if a.stock < q then
      raise exception 'Il te manque % (il en reste %).',
        rtrim(rtrim(to_char(q - a.stock, 'FM999999990.99'), '0'), '.')
          || case when a.unite in ('', 'unité') then ' ' || a.nom else ' ' || a.unite || ' de ' || a.nom end,
        rtrim(rtrim(to_char(a.stock, 'FM999999990.99'), '0'), '.');
    end if;
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, lot_id, date_mouvement)
    values (a.id, e, 'consommation', -q, 'mise_en_pots', v_id, v_date);
  end loop;
  return v_id;
end;
$$;

-- Rattachements contrôlés par incoherences_exploitation() (014) : ceux de 016, plus ceux du journal.
create or replace function public.rattachements() returns table (enfant text, colonne text, parent text)
language sql immutable set search_path = '' as $$
  values ('articles', 'fournisseur_id', 'fournisseurs'), ('depenses', 'article_id', 'articles'),
         ('depenses', 'fournisseur_id', 'fournisseurs'), ('recoltes', 'ruche_id', 'ruches'),
         ('taches', 'ruche_id', 'ruches'), ('ventes', 'client_id', 'clients'),
         ('vente_lignes', 'vente_id', 'ventes'), ('vente_lignes', 'lot_id', 'lots'),
         ('visites', 'ruche_id', 'ruches'), ('visite_intrants', 'visite_id', 'visites'),
         ('visite_intrants', 'article_id', 'articles'), ('visite_photos', 'visite_id', 'visites'),
         ('ruche_evenements', 'ruche_id', 'ruches'), ('ruche_evenements', 'autre_ruche_id', 'ruches'),
         ('ruches', 'rucher_id', 'ruchers'),
         ('deplacements', 'rucher_origine_id', 'ruchers'), ('deplacements', 'rucher_destination_id', 'ruchers'),
         ('colonie_emplacements', 'colonie_id', 'ruches'), ('colonie_emplacements', 'rucher_id', 'ruchers'),
         ('colonie_emplacements', 'deplacement_id', 'deplacements'), ('ruche_evenements', 'deplacement_id', 'deplacements'),
         ('contenants', 'article_id', 'articles'), ('colonie_contenants', 'colonie_id', 'ruches'),
         ('colonie_contenants', 'contenant_id', 'contenants'),
         ('mouvements_stock', 'article_id', 'articles'), ('mouvements_stock', 'depense_id', 'depenses'),
         ('mouvements_stock', 'lot_id', 'lots');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

-- Règles d'accès (comme 014) et audit.
grant select, insert, update, delete on public.mouvements_stock to authenticated;
alter table public.mouvements_stock enable row level security;
drop policy if exists lire on public.mouvements_stock;
drop policy if exists ajouter on public.mouvements_stock;
drop policy if exists modifier on public.mouvements_stock;
drop policy if exists supprimer on public.mouvements_stock;
create policy lire on public.mouvements_stock for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ajouter on public.mouvements_stock for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy modifier on public.mouvements_stock for update to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()))
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy supprimer on public.mouvements_stock for delete to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()));
drop trigger if exists audit on public.mouvements_stock;
create trigger audit after update or delete on public.mouvements_stock for each row execute function public.auditer();

-- Reprises (pas une modification faite par quelqu'un : audit des articles suspendu) ---------------------------------
alter table public.articles disable trigger audit;
update public.articles set famille = public.famille_article(nom, type) where famille = '';
update public.articles set contenance_g = public.contenance_article(nom) where contenance_g is null and famille = 'emballage';
update public.articles set duree_amort = 5 where duree_amort is null and type = 'Équipement';
alter table public.articles enable trigger audit;
-- Un mouvement d'ouverture par article dont le stock n'est pas nul et qui n'a encore aucun mouvement.
-- Le stock est déjà juste : le mouvement est seulement noté (drapeau stock_note_seul).
do $$
begin
  perform set_config('apidoo.stock_note_seul', 'on', true);
  insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, date_mouvement, auteur, note)
  select a.id, a.exploitation_id, 'ouverture', a.stock, 'reprise', a.created_at::date, '', 'Stock au passage à la v5.30'
  from public.articles a
  where a.stock <> 0 and not exists (select 1 from public.mouvements_stock m where m.article_id = a.id);
  perform set_config('apidoo.stock_note_seul', '', true);
end $$;

revoke all on function public.enregistrer_achat(jsonb), public.mettre_en_pots(jsonb) from public, anon;
grant execute on function public.enregistrer_achat(jsonb), public.mettre_en_pots(jsonb) to authenticated;
revoke all on function public.mouvements_appliquer(), public.articles_stock_journal(), public.mouvements_meme_exploitation(),
  public.articles_famille() from public, anon;
