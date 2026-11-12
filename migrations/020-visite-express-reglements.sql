-- Apiviz — migration 020 : visite express (AP-FEAT-037) et règlements entre associés (v5.32, maquettes du 12 nov. 2026).
--
-- Contenu :
--   1. visites.observes (AP-TECH-125) : liste des champs réellement observés pendant la visite. Une visite express
--      reprend les valeurs de la précédente ; seuls les champs touchés y figurent. Vide (null) : visite complète, tout a
--      été observé (toutes les visites existantes, et celles de l'ancienne version).
--      visites.duree_s (AP-TECH-128) : durée de la saisie en secondes, quand l'application la connaît.
--      creer_visite(p) : celle de 014, inchangée, plus ces deux champs (facultatifs).
--   2. reglements_associes : argent passé d'un associé à l'autre, ou versé à la trésorerie de la société (« Société »),
--      pour solder les comptes entre associés de la v5.29 (migration 017). de, a : prénoms (ou « Société ») ; montant
--      positif ; date ; note. Écrit directement par l'application (comme une dépense), file d'envoi hors ligne comprise.
-- Dépendances : 000, 004 à 019 (exploitation_courante(), exploitation_ecriture(), exiger_ecriture(), auditer() de 014).
-- Casse l'ancienne version : NON.
--   - Deux colonnes ajoutées à visites, facultatives : l'ancienne version ne les envoie pas, elles restent vides.
--   - creer_visite garde sa signature et accepte toujours une charge sans observes ni duree_s.
--   - reglements_associes est une nouvelle table : l'ancienne version ne la lit pas (ses soldes ignorent les règlements).
-- Relançable : oui (if not exists, create or replace, drop … if exists). Aucune ligne existante n'est modifiée.
-- Sécurité : RLS sur la nouvelle table (lecture : exploitation courante ; écriture : responsable ou membre, comme 014),
--   audit des modifications et suppressions. Aucune fonction en security definer ; search_path vide.
-- Retour arrière : revenir au code précédent suffit ; colonnes et table peuvent rester en place.

-- 1. Visite express ----------------------------------------------------------------------------------------------------
alter table public.visites add column if not exists observes text[];
alter table public.visites add column if not exists duree_s int;
alter table public.visites drop constraint if exists visites_duree_s_positive;
alter table public.visites add constraint visites_duree_s_positive check (duree_s is null or duree_s >= 0);

create or replace function public.creer_visite(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());
  i jsonb;
  dispo numeric;
  nom_article text;
  v_observes text[];
begin
  if exists (select 1 from public.visites where id = v_id) then
    return v_id;
  end if;
  perform public.exiger_ecriture();
  if not exists (select 1 from public.ruches where id = nullif(p->>'ruche_id', '')::uuid) then
    raise exception 'Ruche introuvable';
  end if;
  -- observes : absent ou null = visite complète ; sinon la liste des champs touchés (peut être vide).
  if jsonb_typeof(p->'observes') = 'array' then
    select coalesce(array_agg(x), '{}') into v_observes from jsonb_array_elements_text(p->'observes') x;
  end if;
  insert into public.visites (id, ruche_id, date_visite, activite, provisions, reine, poids_kg, note, auteur, couvain, varroa,
                              traitement, lot_produit, traitement_dose, retrait_prevu, ordonnance, varroa_methode, varroa_abeilles,
                              observes, duree_s)
  values (v_id, (p->>'ruche_id')::uuid, coalesce((p->>'date_visite')::date, current_date), p->>'activite',
          p->>'provisions', p->>'reine', nullif(p->>'poids_kg', '')::numeric,
          coalesce(p->>'note', ''), coalesce(auth.jwt() ->> 'email', ''),
          coalesce(p->>'couvain', ''), nullif(p->>'varroa', '')::int,
          coalesce(p->>'traitement', ''), coalesce(p->>'lot_produit', ''),
          coalesce(p->>'traitement_dose', ''), nullif(p->>'retrait_prevu', '')::date,
          coalesce((p->>'ordonnance')::boolean, false),
          coalesce(p->>'varroa_methode', ''), nullif(p->>'varroa_abeilles', '')::int,
          v_observes, case when nullif(p->>'duree_s', '') is null then null else greatest((p->>'duree_s')::int, 0) end);
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
revoke all on function public.creer_visite(jsonb) from public, anon;
grant execute on function public.creer_visite(jsonb) to authenticated;

-- 2. Règlements entre associés -----------------------------------------------------------------------------------------
create table if not exists public.reglements_associes (
  id uuid primary key default gen_random_uuid(),
  exploitation_id uuid not null default public.exploitation_courante() references public.exploitations(id) on delete cascade,
  date_reglement date not null default current_date,
  de text not null check (btrim(de) <> ''),
  a text not null check (btrim(a) <> ''),
  montant numeric(10, 2) not null check (montant > 0),
  note text not null default '',
  auteur text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now(),
  constraint reglements_associes_deux_personnes check (lower(btrim(de)) <> lower(btrim(a)))
);
create index if not exists reglements_associes_exploitation_idx on public.reglements_associes (exploitation_id, date_reglement desc);

do $$
declare t text := 'reglements_associes';
begin
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
end $$;
