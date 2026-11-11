-- Migration 017 : entre associés (chantier des écrans, étape 7, v5.29).
-- Qui a fait un achat et avec quel argent ; qui a fait une vente et qui en a récolté l'argent.
--   depenses.achete_par : prénom de l'associé qui a fait l'achat (nouveau).
--   depenses.paye_par   : prénom de l'associé qui a payé de ses fonds propres, ou « Société » (trésorerie de la
--                         société). Colonne déjà là depuis 000 ; « Caisse commune » (ancienne version) vaut Société.
--   ventes.vendu_par    : prénom de l'associé qui a fait la vente (nouveau).
--   ventes.encaisse_par : prénom de l'associé qui a récolté l'argent, ou « Société ». Colonne déjà là depuis 000.
-- creer_vente() enregistre aussi vendu_par ; le reste de la fonction est celui de 014, inchangé.
-- Additive et relançable : deux colonnes texte avec une valeur par défaut. L'ancienne version continue de
-- fonctionner (elle n'envoie pas vendu_par : la colonne reste vide).

alter table public.depenses add column if not exists achete_par text not null default '';
alter table public.ventes add column if not exists vendu_par text not null default '';

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
  perform public.exiger_ecriture();
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0 then
    raise exception 'Ajoutez au moins un pot';
  end if;
  if not exists (select 1 from public.clients where id = nullif(p->>'client_id', '')::uuid) then
    raise exception 'Client introuvable';
  end if;
  insert into public.ventes (id, client_id, date_vente, auteur, paye, mode, livre, encaisse_par, livraison, vendu_par)
  values (v_id, (p->>'client_id')::uuid, coalesce((p->>'date_vente')::date, current_date),
          coalesce(auth.jwt() ->> 'email', ''), coalesce((p->>'paye')::boolean, true), coalesce(p->>'mode', ''),
          coalesce((p->>'livre')::boolean, true), coalesce(p->>'encaisse_par', ''), coalesce(p->>'livraison', ''),
          coalesce(p->>'vendu_par', ''));
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
