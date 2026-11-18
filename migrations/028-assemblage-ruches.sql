-- Apiviz — migration 028 : assembler des ruches physiques avec les pièces du stock (demande du 17 nov. 2026, maquettes
-- validées par Pierre-Louis : « quand je crée une ruche physique, j'assemble des éléments : il faut puiser dans mon
-- stock »).
--
-- Contenu :
--   1. compositions_ruches : la composition par défaut d'un type de ruche (Dadant 10 cadres…), une ligne par pièce
--      (article du stock) avec la quantité pour UNE ruche. Elle pré-remplit l'ajout de ruches physiques.
--   2. mouvements_stock.origine accepte « assemblage » (pièces sorties du stock pour monter une ruche).
--   3. assembler_ruches(p) : crée les ruches physiques et retire leurs pièces du stock, en une transaction, idempotente
--      par l'identifiant de la première ruche (file d'envoi hors ligne). Une pièce qui manque n'empêche rien : le stock
--      passe en négatif (choix de Pierre-Louis : « avertir et laisser créer »), l'écran prévient avant.
--   4. enregistrer_composition(p) : remplace la composition d'un type, en une transaction.
-- Dépendances : 000 à 027 (contenants de 016, mouvements_stock de 018, exiger_ecriture(), exploitation_courante(),
--   exploitation_ecriture(), auditer() de 014).
-- Casse l'ancienne version : NON.
--   - Une table et deux fonctions nouvelles ; une valeur de plus permise pour mouvements_stock.origine. L'ancienne
--     version affiche un mouvement « assemblage » comme « Mouvement » dans l'historique d'un article.
-- Relançable : oui (if not exists, create or replace, drop … if exists).
-- Sécurité : RLS comme 018 (lecture : exploitation courante ; écriture : responsable ou membre), audit des
--   modifications et suppressions. Fonctions en security invoker, search_path vide, exécutables par les seuls comptes
--   connectés. La pièce et sa composition sont dans la même exploitation (clé composée vers articles).
-- Retour arrière : revenir au code précédent suffit ; la table et les fonctions peuvent rester en place.

-- 1. Compositions -----------------------------------------------------------------------------------------------------
create table if not exists public.compositions_ruches (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  type text not null check (btrim(type) <> ''),
  article_id uuid not null,
  quantite numeric(10,2) not null check (quantite > 0),
  created_at timestamptz not null default now(),
  constraint compositions_ruches_article_meme_exploitation foreign key (article_id, exploitation_id)
    references public.articles (id, exploitation_id) on delete cascade
);
create unique index if not exists compositions_ruches_uidx on public.compositions_ruches (exploitation_id, lower(btrim(type)), article_id);
create index if not exists compositions_ruches_article_idx on public.compositions_ruches (article_id);

grant select, insert, update, delete on public.compositions_ruches to authenticated;
alter table public.compositions_ruches enable row level security;
drop policy if exists lire on public.compositions_ruches;
drop policy if exists ajouter on public.compositions_ruches;
drop policy if exists modifier on public.compositions_ruches;
drop policy if exists supprimer on public.compositions_ruches;
create policy lire on public.compositions_ruches for select to authenticated
  using (exploitation_id = (select public.exploitation_courante()));
create policy ajouter on public.compositions_ruches for insert to authenticated
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy modifier on public.compositions_ruches for update to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()))
  with check (exploitation_id = (select public.exploitation_ecriture()));
create policy supprimer on public.compositions_ruches for delete to authenticated
  using (exploitation_id = (select public.exploitation_ecriture()));
drop trigger if exists audit on public.compositions_ruches;
create trigger audit after update or delete on public.compositions_ruches for each row execute function public.auditer();

-- 2. Origine « assemblage » ---------------------------------------------------------------------------------------------
alter table public.mouvements_stock drop constraint if exists mouvements_stock_origine_check;
alter table public.mouvements_stock add constraint mouvements_stock_origine_check
  check (origine in ('reprise', 'achat', 'visite', 'mise_en_pots', 'saisie', 'assemblage'));

-- 3. Assembler des ruches physiques -------------------------------------------------------------------------------------
-- p : { ruches: [{ id, code }], type, etat, achat_le, article_id, notes, date, pieces: [{ article_id, quantite }] }
--   pieces : quantités pour UNE ruche ; le stock baisse de quantite × nombre de ruches.
-- Renvoie le nombre de ruches physiques créées.
create or replace function public.assembler_ruches(p jsonb)
returns int language plpgsql set search_path = '' as $$
declare
  e uuid;
  v_ruches jsonb := coalesce(p->'ruches', '[]'::jsonb);
  v_n int := jsonb_array_length(coalesce(p->'ruches', '[]'::jsonb));
  v_date date := coalesce(nullif(p->>'date', '')::date, current_date);
  v_premier uuid;
  v_codes text;
  r jsonb;
  i jsonb;
  q numeric;
  a uuid;
begin
  if v_n = 0 then raise exception 'Indique au moins un numéro de ruche'; end if;
  if v_n > 200 then raise exception '200 ruches au plus d''un coup'; end if;
  v_premier := nullif(v_ruches->0->>'id', '')::uuid;
  if v_premier is null then raise exception 'Identifiant de ruche manquant'; end if;
  if exists (select 1 from public.contenants where id = v_premier) then return 0; end if;  -- déjà envoyé
  e := public.exiger_ecriture();
  if coalesce(p->>'etat', 'bon') not in ('bon', 'a_reparer', 'hors_service') then raise exception 'État inconnu'; end if;
  if nullif(p->>'article_id', '') is not null
     and not exists (select 1 from public.articles where id = (p->>'article_id')::uuid and exploitation_id = e) then
    raise exception 'Article introuvable';
  end if;

  for r in select * from jsonb_array_elements(v_ruches) loop
    if coalesce(btrim(r->>'code'), '') = '' then raise exception 'Numéro de ruche manquant'; end if;
    if exists (select 1 from public.contenants where exploitation_id = e and lower(btrim(code)) = lower(btrim(r->>'code'))) then
      raise exception 'Le numéro % existe déjà.', btrim(r->>'code');
    end if;
    insert into public.contenants (id, exploitation_id, code, type, etat, achat_le, article_id, notes)
    values ((r->>'id')::uuid, e, btrim(r->>'code'), btrim(coalesce(p->>'type', '')), coalesce(p->>'etat', 'bon'),
            nullif(p->>'achat_le', '')::date, nullif(p->>'article_id', '')::uuid, coalesce(p->>'notes', ''));
  end loop;

  v_codes := case when v_n = 1 then 'ruche physique n° ' || btrim(v_ruches->0->>'code')
    else 'ruches physiques n° ' || btrim(v_ruches->0->>'code') || ' à ' || btrim(v_ruches->(v_n - 1)->>'code') end;
  for i in select * from jsonb_array_elements(coalesce(p->'pieces', '[]'::jsonb)) loop
    a := nullif(i->>'article_id', '')::uuid;
    q := nullif(i->>'quantite', '')::numeric;
    if q is null or q = 0 then continue; end if;
    if q < 0 then raise exception 'Quantité de pièce négative'; end if;
    if a is null or not exists (select 1 from public.articles where id = a and exploitation_id = e) then
      raise exception 'Article introuvable';
    end if;
    insert into public.mouvements_stock (article_id, exploitation_id, type, quantite, origine, date_mouvement, note)
    values (a, e, 'consommation', -(q * v_n), 'assemblage', v_date, 'Assemblage : ' || v_codes);
  end loop;
  return v_n;
end;
$$;

-- 4. Composition d'un type ----------------------------------------------------------------------------------------------
-- p : { type, pieces: [{ article_id, quantite }] } ; remplace toute la composition du type. Renvoie le nombre de pièces.
create or replace function public.enregistrer_composition(p jsonb)
returns int language plpgsql set search_path = '' as $$
declare
  e uuid;
  v_type text := btrim(coalesce(p->>'type', ''));
  i jsonb;
  q numeric;
  a uuid;
  n int := 0;
begin
  e := public.exiger_ecriture();
  if v_type = '' then raise exception 'Indique le type de ruche'; end if;
  delete from public.compositions_ruches where exploitation_id = e and lower(btrim(type)) = lower(v_type);
  for i in select * from jsonb_array_elements(coalesce(p->'pieces', '[]'::jsonb)) loop
    a := nullif(i->>'article_id', '')::uuid;
    q := nullif(i->>'quantite', '')::numeric;
    if q is null or q <= 0 then continue; end if;
    if a is null or not exists (select 1 from public.articles where id = a and exploitation_id = e) then
      raise exception 'Article introuvable';
    end if;
    insert into public.compositions_ruches (exploitation_id, type, article_id, quantite) values (e, v_type, a, q)
    on conflict (exploitation_id, lower(btrim(type)), article_id) do update set quantite = excluded.quantite;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.assembler_ruches(jsonb), public.enregistrer_composition(jsonb) from public, anon;
grant execute on function public.assembler_ruches(jsonb), public.enregistrer_composition(jsonb) to authenticated;
