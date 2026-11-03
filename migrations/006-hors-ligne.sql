-- Apidoo — migration 006 : saisies hors ligne
-- creer_visite et creer_vente acceptent un identifiant choisi par le téléphone (p->>'id').
-- Si la saisie existe déjà (renvoi après une coupure réseau), elle n'est pas recréée.
-- Peut être relancée sans risque.

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

  insert into public.visites (id, ruche_id, date_visite, activite, provisions, reine, poids_kg, note, auteur, couvain, varroa, traitement, lot_produit)
  values (v_id, (p->>'ruche_id')::uuid, coalesce((p->>'date_visite')::date, current_date), p->>'activite',
          p->>'provisions', p->>'reine', nullif(p->>'poids_kg', '')::numeric,
          coalesce(p->>'note', ''), coalesce(auth.jwt() ->> 'email', ''),
          coalesce(p->>'couvain', ''), nullif(p->>'varroa', '')::int,
          coalesce(p->>'traitement', ''), coalesce(p->>'lot_produit', ''));

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
  insert into public.ventes (id, client_id, date_vente, auteur, paye, mode, livre, encaisse_par)
  values (v_id, (p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''), coalesce((p->>'paye')::boolean, true), coalesce(p->>'mode', ''),
          coalesce((p->>'livre')::boolean, true), coalesce(p->>'encaisse_par', ''));

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
