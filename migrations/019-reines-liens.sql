-- Apiviz — migration 019 : reines et liens de filiation entre colonies (IT-07, AP-FEAT-032 et 033).
-- (La fiche IT-07 annonçait le numéro 017, pris entre-temps par 017-associes.sql puis 018-stock-mouvements.sql :
-- premier numéro libre.)
--
-- Contenu :
--   1. reines (AP-TECH-114) : historique des reines de chaque colonie (année de naissance, marquage, origine, en place
--      du … au …, statut, clippée, notes). Une seule reine « en place » par colonie (index unique partiel).
--      couleur_marquage(année) : couleur du code international de marquage, d'après le dernier chiffre de l'année
--      (AP-TECH-117 ; même table que la v5, v3.js MARQUE). La couleur reste modifiable (reine non marquée, autre couleur).
--   2. changer_reine(p) (AP-TECH-116) : clôt la reine en place à la date d'introduction de la nouvelle, crée la
--      nouvelle, écrit la ligne « reine » du journal, tient ruches.annee_reine / reine_origine / reine_introduite à jour
--      (lecture par l'ancienne version, retour arrière). Une transaction ; idempotente par p.id.
--      corriger_reine(p) : corrige une erreur de saisie sur une reine, sans en créer une nouvelle.
--   3. Déclencheur ruches_reine : tant que l'ancienne version écrit annee_reine, un changement d'année y est un
--      changement de reine (c'est déjà ce qu'elle note au journal) ; origine ou date seules : correction.
--   4. colonie_liens (AP-TECH-118) : parent, enfant, type (division, essaim, reunion), date, événement d'origine.
--      Contrôle anti-cycle sur la descendance (division, essaim). Une réunion n'est pas une descendance : réunir dans
--      sa colonie mère une colonie issue d'une division est un cas réel, et reste accepté.
--      Déclencheur sur ruche_evenements : chaque division, essaimage récupéré ou réunion notée crée son lien, quelle
--      que soit la version de l'application qui l'écrit.
--   5. Reprises : une reine par colonie dont annee_reine est renseignée (AP-TECH-115), en place depuis
--      reine_introduite, à défaut la date d'installation, à défaut la date de création ; les liens depuis
--      ruche_evenements.autre_ruche_id (AP-TECH-119).
-- Dépendances : 000, 004 à 018 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer(),
--   rattachements() de 014 à 018 ; ruches.statut et date_creation de 016 ; ruche_evenements de 009/010).
-- Casse l'ancienne version : NON.
--   - Tout est ajouté : aucune colonne retirée ni renommée. Les colonnes reine de ruches restent écrites (par
--     changer_reine) et lisibles : l'ancienne version affiche la reine en place comme avant.
--   - L'ancienne version peut encore écrire annee_reine : l'historique suit (déclencheur ruches_reine).
--   - ruche_evenements garde ses lignes et leur texte ; rien n'y est modifié.
-- Relançable : oui (if not exists, create or replace, drop … if exists ; les reprises ne traitent que ce qui n'a pas
--   encore été repris).
-- Sécurité : RLS sur les 2 nouvelles tables (lecture : exploitation courante ; écriture : responsable ou membre, comme
--   014), audit des modifications et suppressions. Aucune fonction en security definer : fonctions et déclencheurs
--   s'exécutent avec les droits de la personne connectée, sous RLS ; search_path vide partout.
-- Retour arrière : revenir au code précédent suffit, les colonnes reine de ruches sont à jour. Les tables peuvent
--   rester en place (l'ancienne version ne les lit pas).

-- 1. Reines ------------------------------------------------------------------------------------------------------------
-- Couleur de marquage d'après l'année de naissance : code international en usage en apiculture, cycle de 5 ans
-- (années en 1 ou 6 : blanc ; 2 ou 7 : jaune ; 3 ou 8 : rouge ; 4 ou 9 : vert ; 5 ou 0 : bleu).
create or replace function public.couleur_marquage(annee int) returns text
language sql immutable set search_path = '' as $$
  select case annee % 10 when 1 then 'blanc' when 6 then 'blanc' when 2 then 'jaune' when 7 then 'jaune'
                         when 3 then 'rouge' when 8 then 'rouge' when 4 then 'vert' when 9 then 'vert'
                         when 5 then 'bleu' when 0 then 'bleu' end;
$$;

-- en_place_du : jour où elle est introduite (ou vue la première fois) ; en_place_au : jour où elle ne l'est plus
-- (vide = en place). L'historique n'est jamais réécrit par un changement de reine : une ligne est fermée, une autre créée.
create table if not exists public.reines (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  colonie_id uuid not null references public.ruches(id) on delete cascade,
  annee_naissance int not null check (annee_naissance between 1990 and 2100),
  marquage text not null default 'aucun' check (marquage in ('blanc', 'jaune', 'rouge', 'vert', 'bleu', 'aucun')),
  origine text not null default '',                 -- texte de l'application (Achetée, Essaim naturel…), '' : non précisée
  en_place_du date not null,
  en_place_au date,
  statut text not null default 'en_place' check (statut in ('en_place', 'remplacee', 'morte', 'disparue', 'vendue')),
  clippee boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint reines_periode check (en_place_au is null or en_place_au >= en_place_du),
  constraint reines_statut_periode check ((statut = 'en_place') = (en_place_au is null))
);
create unique index if not exists reines_une_en_place_uidx on public.reines (colonie_id) where statut = 'en_place';
create index if not exists reines_colonie_idx on public.reines (colonie_id, en_place_du desc);
create index if not exists reines_exploitation_idx on public.reines (exploitation_id);

-- 4. Liens de filiation (table ; déclencheurs plus bas) ----------------------------------------------------------------
-- division, essaim : parent = colonie d'origine, enfant = nouvelle colonie.
-- reunion : parent = colonie réunie (absorbée), enfant = colonie qui l'accueille.
create table if not exists public.colonie_liens (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  parent_id uuid not null references public.ruches(id) on delete cascade,
  enfant_id uuid not null references public.ruches(id) on delete cascade,
  type text not null check (type in ('division', 'essaim', 'reunion')),
  date_lien date not null default current_date,
  evenement_id uuid references public.ruche_evenements(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint colonie_liens_deux_colonies check (parent_id <> enfant_id)
);
create unique index if not exists colonie_liens_unique_uidx on public.colonie_liens (parent_id, enfant_id, type, date_lien);
create unique index if not exists colonie_liens_evenement_uidx on public.colonie_liens (evenement_id) where evenement_id is not null;
create index if not exists colonie_liens_enfant_idx on public.colonie_liens (enfant_id);
create index if not exists colonie_liens_exploitation_idx on public.colonie_liens (exploitation_id);

-- Rattachements dans la même exploitation (clés composites, comme 014 à 016).
do $$
declare r record;
begin
  for r in select * from (values ('reines', 'colonie_id', 'ruches'), ('colonie_liens', 'parent_id', 'ruches'),
                                 ('colonie_liens', 'enfant_id', 'ruches')) v(enfant, colonne, parent)
  loop
    if not exists (select 1 from pg_constraint where conname = r.enfant || '_' || r.colonne || '_meme_exploitation') then
      execute format('alter table public.%I add constraint %I foreign key (%I, exploitation_id) references public.%I (id, exploitation_id) on delete cascade',
                     r.enfant, r.enfant || '_' || r.colonne || '_meme_exploitation', r.colonne, r.parent);
    end if;
  end loop;
end $$;

-- L'événement d'origine d'un lien : même exploitation (clé qui se vide à la suppression : contrôle par déclencheur).
create or replace function public.meme_exploitation_019() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.evenement_id is not null
     and not exists (select 1 from public.ruche_evenements e where e.id = new.evenement_id and e.exploitation_id = new.exploitation_id) then
    raise exception 'Événement introuvable';
  end if;
  return new;
end;
$$;
drop trigger if exists meme_exploitation on public.colonie_liens;
create trigger meme_exploitation before insert or update of evenement_id on public.colonie_liens
  for each row execute function public.meme_exploitation_019();

-- incoherences_exploitation() (014) contrôle aussi ces rattachements.
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
         ('mouvements_stock', 'lot_id', 'lots'),
         ('reines', 'colonie_id', 'ruches'), ('colonie_liens', 'parent_id', 'ruches'),
         ('colonie_liens', 'enfant_id', 'ruches'), ('colonie_liens', 'evenement_id', 'ruche_evenements');
$$;
revoke all on function public.rattachements() from public, anon, authenticated;

-- Règles d'accès (comme 014) et audit.
do $$
declare t text;
begin
  foreach t in array array['reines', 'colonie_liens'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lire on public.%I', t);
    execute format('drop policy if exists ajouter on public.%I', t);
    execute format('drop policy if exists modifier on public.%I', t);
    execute format('drop policy if exists supprimer on public.%I', t);
    execute format('create policy lire on public.%I for select to authenticated
                      using (exploitation_id = (select public.exploitation_courante()))', t);
    execute format('create policy ajouter on public.%I for insert to authenticated
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy modifier on public.%I for update to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))
                      with check (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('create policy supprimer on public.%I for delete to authenticated
                      using (exploitation_id = (select public.exploitation_ecriture()))', t);
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after update or delete on public.%I for each row execute function public.auditer()', t);
  end loop;
end $$;

-- Anti-cycle (AP-TECH-118) : vrai si « enfant » est déjà un ascendant de « parent » par division ou essaim.
create or replace function public.lien_ferait_boucle(p_parent uuid, p_enfant uuid) returns boolean
language sql stable set search_path = '' as $$
  with recursive desc_de_enfant as (
    select l.enfant_id id, 1 n from public.colonie_liens l where l.parent_id = p_enfant and l.type in ('division', 'essaim')
    union
    select l.enfant_id, d.n + 1 from public.colonie_liens l join desc_de_enfant d on l.parent_id = d.id
    where l.type in ('division', 'essaim') and d.n < 200
  )
  select p_parent = p_enfant or exists (select 1 from desc_de_enfant where id = p_parent);
$$;

create or replace function public.colonie_liens_controle() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type in ('division', 'essaim') and public.lien_ferait_boucle(new.parent_id, new.enfant_id) then
    raise exception 'Ce lien créerait une boucle : une colonie ne peut pas descendre d''elle-même.';
  end if;
  return new;
end;
$$;
drop trigger if exists controle on public.colonie_liens;
create trigger controle before insert or update of parent_id, enfant_id, type on public.colonie_liens
  for each row execute function public.colonie_liens_controle();

-- 5. Reprises ----------------------------------------------------------------------------------------------------------
-- Aucune ligne existante n'est modifiée : pas d'audit à suspendre.
-- Une reine par colonie dont l'année est renseignée. Pour une colonie sortie, c'est sa dernière reine connue : elle
-- reste « en place » (rien n'indique ce qu'elle est devenue), l'application l'affiche comme la dernière reine.
insert into public.reines (exploitation_id, colonie_id, annee_naissance, marquage, origine, en_place_du)
select r.exploitation_id, r.id, r.annee_reine, public.couleur_marquage(r.annee_reine), coalesce(r.reine_origine, ''),
       coalesce(r.reine_introduite, r.date_installation, r.date_creation, r.created_at::date, current_date)
from public.ruches r
where r.annee_reine between 1990 and 2100
  and not exists (select 1 from public.reines x where x.colonie_id = r.id);

-- Liens depuis les événements. Un événement dont l'autre ruche a été supprimée (autre_ruche_id vide) ne donne rien.
-- Un lien qui ferait une boucle (données incohérentes) est laissé de côté, avec un avertissement.
do $$
declare e record; v_parent uuid; v_enfant uuid; v_type text;
begin
  for e in select * from public.ruche_evenements x
           where x.type in ('division', 'essaimage', 'reunion') and x.autre_ruche_id is not null and x.autre_ruche_id <> x.ruche_id
             and not exists (select 1 from public.colonie_liens l where l.evenement_id = x.id)
           order by x.date_evenement, x.created_at loop
    v_type := case e.type when 'essaimage' then 'essaim' else e.type end;
    if e.type = 'reunion' then v_parent := e.autre_ruche_id; v_enfant := e.ruche_id;
    else v_parent := e.ruche_id; v_enfant := e.autre_ruche_id; end if;
    if v_type <> 'reunion' and public.lien_ferait_boucle(v_parent, v_enfant) then
      raise warning 'Lien de filiation non repris (boucle) : événement %', e.id;
      continue;
    end if;
    insert into public.colonie_liens (exploitation_id, parent_id, enfant_id, type, date_lien, evenement_id)
    values (e.exploitation_id, v_parent, v_enfant, v_type, coalesce(e.date_evenement, current_date), e.id)
    on conflict do nothing;
  end loop;
end $$;

-- Déclencheurs ---------------------------------------------------------------------------------------------------------
-- Chaque division, essaimage récupéré ou réunion notée au journal crée son lien. Ne bloque jamais le journal : un lien
-- qui ferait une boucle n'est pas créé.
create or replace function public.ruche_evenements_lien() returns trigger
language plpgsql set search_path = '' as $$
declare v_parent uuid; v_enfant uuid; v_type text;
begin
  if new.type not in ('division', 'essaimage', 'reunion') or new.autre_ruche_id is null or new.autre_ruche_id = new.ruche_id then
    return null;
  end if;
  v_type := case new.type when 'essaimage' then 'essaim' else new.type end;
  if new.type = 'reunion' then v_parent := new.autre_ruche_id; v_enfant := new.ruche_id;
  else v_parent := new.ruche_id; v_enfant := new.autre_ruche_id; end if;
  if v_type <> 'reunion' and public.lien_ferait_boucle(v_parent, v_enfant) then return null; end if;
  insert into public.colonie_liens (exploitation_id, parent_id, enfant_id, type, date_lien, evenement_id)
  values (new.exploitation_id, v_parent, v_enfant, v_type, coalesce(new.date_evenement, current_date), new.id)
  on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists lien on public.ruche_evenements;
create trigger lien after insert on public.ruche_evenements
  for each row execute function public.ruche_evenements_lien();

-- Ancienne version : elle écrit annee_reine, reine_origine et reine_introduite dans ruches. changer_reine() et
-- corriger_reine() écrivent ces colonnes elles-mêmes et le signalent (variable de la transaction) : rien à faire alors.
create or replace function public.ruches_reine() returns trigger
language plpgsql set search_path = '' as $$
declare
  o public.reines;
  d date;
begin
  if coalesce(current_setting('apidoo.reine_sync', true), '') = '1' then return null; end if;
  if tg_op = 'INSERT' then
    if new.annee_reine between 1990 and 2100 then
      insert into public.reines (exploitation_id, colonie_id, annee_naissance, marquage, origine, en_place_du)
      values (new.exploitation_id, new.id, new.annee_reine, public.couleur_marquage(new.annee_reine), coalesce(new.reine_origine, ''),
              coalesce(new.reine_introduite, new.date_installation, new.date_creation, current_date));
    end if;
    return null;
  end if;
  if new.annee_reine is not distinct from old.annee_reine and new.reine_origine is not distinct from old.reine_origine
     and new.reine_introduite is not distinct from old.reine_introduite then
    return null;
  end if;
  select * into o from public.reines where colonie_id = new.id and statut = 'en_place';
  if new.annee_reine is null or new.annee_reine not between 1990 and 2100 then
    -- Année effacée : la reine en place ne l'est plus, sans qu'on sache ce qu'elle est devenue.
    if found then
      update public.reines set statut = 'disparue', en_place_au = greatest(current_date, o.en_place_du) where id = o.id;
    end if;
    return null;
  end if;
  if not found then
    insert into public.reines (exploitation_id, colonie_id, annee_naissance, marquage, origine, en_place_du)
    values (new.exploitation_id, new.id, new.annee_reine, public.couleur_marquage(new.annee_reine), coalesce(new.reine_origine, ''),
            coalesce(new.reine_introduite, current_date));
  elsif new.annee_reine is distinct from old.annee_reine then
    -- Nouvelle année : nouvelle reine, introduite à la date notée (si elle vient de changer), à défaut aujourd'hui.
    d := case when new.reine_introduite is distinct from old.reine_introduite then new.reine_introduite end;
    d := coalesce(d, current_date);
    if o.en_place_du >= d then
      -- Même jour (ou reine datée plus tard) : on corrige la reine en place plutôt que d'en créer une d'un jour.
      update public.reines set annee_naissance = new.annee_reine, origine = coalesce(new.reine_origine, ''),
             marquage = case when marquage = public.couleur_marquage(annee_naissance) then public.couleur_marquage(new.annee_reine) else marquage end
      where id = o.id;
    else
      update public.reines set statut = 'remplacee', en_place_au = d where id = o.id;
      insert into public.reines (exploitation_id, colonie_id, annee_naissance, marquage, origine, en_place_du)
      values (new.exploitation_id, new.id, new.annee_reine, public.couleur_marquage(new.annee_reine), coalesce(new.reine_origine, ''), d);
    end if;
  else
    -- Même année : origine ou date d'introduction corrigée. La date n'est reprise que si elle ne remonte pas avant
    -- la fin de la reine précédente.
    update public.reines set origine = coalesce(new.reine_origine, ''),
           en_place_du = case when new.reine_introduite is not null
                                   and not exists (select 1 from public.reines x where x.colonie_id = new.id and x.id <> o.id
                                                   and x.en_place_au > new.reine_introduite)
                              then new.reine_introduite else en_place_du end
    where id = o.id;
  end if;
  return null;
end;
$$;
drop trigger if exists ruches_reine on public.ruches;
create trigger ruches_reine after insert or update of annee_reine, reine_origine, reine_introduite on public.ruches
  for each row execute function public.ruches_reine();

-- Fonctions ------------------------------------------------------------------------------------------------------------
-- Les colonnes reine de ruches, d'après la reine en place (appelée par changer_reine et corriger_reine).
create or replace function public.reine_vers_ruche(p_colonie uuid) returns void
language plpgsql set search_path = '' as $$
declare o public.reines;
begin
  select * into o from public.reines where colonie_id = p_colonie and statut = 'en_place';
  perform set_config('apidoo.reine_sync', '1', true);
  if found then
    update public.ruches set annee_reine = o.annee_naissance, reine_origine = o.origine, reine_introduite = o.en_place_du
    where id = p_colonie;
  else
    update public.ruches set annee_reine = null, reine_origine = '', reine_introduite = null where id = p_colonie;
  end if;
  perform set_config('apidoo.reine_sync', '', true);
end;
$$;

-- Enregistre une nouvelle reine (p : {id, colonie_id, annee, date, origine, marquage, clippee, notes, ancienne}).
--   date : jour où elle est introduite ou vue la première fois (défaut : aujourd'hui) ;
--   marquage : vide = couleur de l'année ; ancienne : ce qu'est devenue la reine en place (remplacee par défaut,
--   morte, disparue, vendue).
-- La reine en place est clôturée à cette date, jamais effacée. Une colonie orpheline redevient active.
-- Une transaction ; idempotente par p.id (identifiant de la nouvelle reine, fourni par le téléphone).
create or replace function public.changer_reine(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  v_col uuid := nullif(p->>'colonie_id', '')::uuid;
  v_annee int := nullif(p->>'annee', '')::int;
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_origine text := btrim(coalesce(p->>'origine', ''));
  v_marquage text := coalesce(nullif(p->>'marquage', ''), public.couleur_marquage(nullif(p->>'annee', '')::int));
  v_ancienne text := coalesce(nullif(p->>'ancienne', ''), 'remplacee');
  col public.ruches;
  o public.reines;
begin
  if exists (select 1 from public.reines where id = v_id) then return v_id; end if;
  perform public.exiger_ecriture();
  select * into col from public.ruches where id = v_col;
  if not found then raise exception 'Colonie introuvable'; end if;
  if col.statut not in ('active', 'orpheline') then raise exception '% n''est plus active.', col.nom; end if;
  if v_annee is null then raise exception 'Indique l''année de naissance de la reine.'; end if;
  if v_date > current_date + 1 then raise exception 'La date d''introduction ne peut pas être dans le futur.'; end if;
  if v_annee < 1990 or v_annee > extract(year from v_date)::int then
    raise exception 'L''année de naissance doit être comprise entre 1990 et l''année d''introduction.';
  end if;
  if v_marquage not in ('blanc', 'jaune', 'rouge', 'vert', 'bleu', 'aucun') then raise exception 'Couleur de marquage inconnue.'; end if;
  if v_ancienne not in ('remplacee', 'morte', 'disparue', 'vendue') then raise exception 'Statut de l''ancienne reine inconnu.'; end if;
  select * into o from public.reines where colonie_id = v_col and statut = 'en_place';
  if found then
    if o.en_place_du > v_date then
      raise exception 'La reine en place l''est depuis le % : choisis une date à partir de ce jour.', to_char(o.en_place_du, 'DD/MM/YYYY');
    end if;
    update public.reines set statut = v_ancienne, en_place_au = v_date where id = o.id;
  end if;
  insert into public.reines (id, colonie_id, annee_naissance, marquage, origine, en_place_du, clippee, notes)
  values (v_id, v_col, v_annee, v_marquage, v_origine, v_date, coalesce((p->>'clippee')::boolean, false), btrim(coalesce(p->>'notes', '')));
  perform public.reine_vers_ruche(v_col);
  if col.statut = 'orpheline' then update public.ruches set statut = 'active' where id = v_col; end if;
  -- Ligne du journal, au format de la v5 (« Reine 2026 · achetée »).
  insert into public.ruche_evenements (ruche_id, type, date_evenement, detail)
  values (v_col, 'reine', v_date, concat_ws(' · ', 'Reine ' || v_annee, nullif(lower(v_origine), '')));
  return v_id;
end;
$$;

-- Corrige une reine déjà notée (p : {id, annee, date, origine, marquage, clippee, notes} ; un champ absent n'est pas
-- touché). Ne crée pas de reine et n'en clôt pas : pour une nouvelle reine, changer_reine().
create or replace function public.corriger_reine(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  o public.reines;
  v_annee int;
  v_date date;
  v_marquage text;
  x public.reines;
begin
  perform public.exiger_ecriture();
  select * into o from public.reines where id = v_id;
  if not found then raise exception 'Reine introuvable'; end if;
  v_annee := coalesce(nullif(p->>'annee', '')::int, o.annee_naissance);
  v_date := coalesce(nullif(p->>'date', '')::date, o.en_place_du);
  v_marquage := coalesce(nullif(p->>'marquage', ''), o.marquage);
  if v_date > current_date + 1 then raise exception 'La date d''introduction ne peut pas être dans le futur.'; end if;
  if v_annee < 1990 or v_annee > extract(year from v_date)::int then
    raise exception 'L''année de naissance doit être comprise entre 1990 et l''année d''introduction.';
  end if;
  if v_marquage not in ('blanc', 'jaune', 'rouge', 'vert', 'bleu', 'aucun') then raise exception 'Couleur de marquage inconnue.'; end if;
  if o.en_place_au is not null and v_date > o.en_place_au then
    raise exception 'Cette reine a été remplacée le % : choisis une date d''introduction antérieure.', to_char(o.en_place_au, 'DD/MM/YYYY');
  end if;
  select * into x from public.reines where colonie_id = o.colonie_id and id <> o.id and en_place_au > v_date
                                       and en_place_du <= o.en_place_du order by en_place_au desc limit 1;
  if found then
    raise exception 'La reine précédente était en place jusqu''au % : choisis une date à partir de ce jour.', to_char(x.en_place_au, 'DD/MM/YYYY');
  end if;
  update public.reines set annee_naissance = v_annee, en_place_du = v_date, marquage = v_marquage,
         origine = case when p ? 'origine' then btrim(coalesce(p->>'origine', '')) else origine end,
         clippee = case when p ? 'clippee' then coalesce((p->>'clippee')::boolean, false) else clippee end,
         notes = case when p ? 'notes' then btrim(coalesce(p->>'notes', '')) else notes end
  where id = v_id;
  if o.statut = 'en_place' then perform public.reine_vers_ruche(o.colonie_id); end if;
  return v_id;
end;
$$;

-- reine_vers_ruche() est appelée par changer_reine et corriger_reine avec les droits de la personne connectée (aucun
-- security definer) : elle doit donc pouvoir l'exécuter. Elle ne fait que recopier la reine en place, sous RLS.
revoke all on function public.changer_reine(jsonb), public.corriger_reine(jsonb), public.couleur_marquage(int),
  public.lien_ferait_boucle(uuid, uuid), public.reine_vers_ruche(uuid) from public, anon;
grant execute on function public.changer_reine(jsonb), public.corriger_reine(jsonb), public.couleur_marquage(int),
  public.lien_ferait_boucle(uuid, uuid), public.reine_vers_ruche(uuid) to authenticated;
revoke all on function public.ruches_reine(), public.ruche_evenements_lien(), public.colonie_liens_controle(),
  public.meme_exploitation_019() from public, anon, authenticated;
