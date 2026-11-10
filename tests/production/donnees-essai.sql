-- Apiviz — données d'essai pour vérifier en production : Déplacer des ruches, Noter une intervention, Créer la facture.
-- IT-02 (AP-US-005). À coller dans Supabase › apidoo › SQL Editor, puis « Run », UNIQUEMENT avec l'accord du responsable.
-- Prérequis : migrations 010 et 011 appliquées (c'est le cas depuis le 5 nov. 2026).
-- Relançable : identifiants fixes, « on conflict do nothing ». Tout se retire avec nettoyage-essai.sql.
-- Ne touche à aucune donnée existante : ajoute 3 ruches, 1 client, 1 lot, 1 vente, tous nommés « ESSAI IT-02 ».

do $$
declare
  ex uuid;
  n int;
begin
  select count(*) into n from public.exploitations;
  if n <> 1 then
    raise exception 'Arrêt : % exploitations dans la base. Ce script suppose une seule exploitation ; à adapter.', n;
  end if;
  select id into ex from public.exploitations;

  -- Deux ruchers d'essai : deux ruches au départ, une à l'arrivée (pour que le rucher d'arrivée existe dans la liste).
  insert into public.ruches (id, exploitation_id, nom, rucher, notes) values
    ('e55a1002-0000-4000-8000-000000000001', ex, 'ESSAI IT-02 ruche 1', 'ESSAI IT-02 départ', 'Données d''essai IT-02, à supprimer'),
    ('e55a1002-0000-4000-8000-000000000002', ex, 'ESSAI IT-02 ruche 2', 'ESSAI IT-02 départ', 'Données d''essai IT-02, à supprimer'),
    ('e55a1002-0000-4000-8000-000000000003', ex, 'ESSAI IT-02 ruche 3', 'ESSAI IT-02 arrivée', 'Données d''essai IT-02, à supprimer')
  on conflict (id) do nothing;

  -- Un client avec une adresse complète (la facture l'affiche si 012 est appliquée).
  insert into public.clients (id, exploitation_id, nom, cercle, notes) values
    ('e55a1002-0000-4000-8000-000000000011', ex, 'ESSAI IT-02 client', 'Autre', 'Données d''essai IT-02, à supprimer')
  on conflict (id) do nothing;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'clients' and column_name = 'adresse') then
    execute $q$update public.clients set adresse = '1 rue de l''Essai', code_postal = '00000', ville = 'Essai'
      where id = 'e55a1002-0000-4000-8000-000000000011'$q$;
  end if;

  -- Un lot de 5 pots à 1 €, puis une vente d'un pot, payée, sans facture (le numéro se donne dans l'app).
  insert into public.lots (id, exploitation_id, code, miel, format_g, prix, pots_initiaux, date_mise_en_pot) values
    ('e55a1002-0000-4000-8000-000000000021', ex, 'ESSAI-IT02', 'Essai', 500, 1, 5, current_date)
  on conflict (id) do nothing;
  insert into public.ventes (id, exploitation_id, client_id, date_vente, paye, mode, livre) values
    ('e55a1002-0000-4000-8000-000000000031', ex, 'e55a1002-0000-4000-8000-000000000011', current_date, true, 'Espèces', true)
  on conflict (id) do nothing;
  insert into public.vente_lignes (id, exploitation_id, vente_id, lot_id, quantite, prix_unitaire) values
    ('e55a1002-0000-4000-8000-000000000032', ex, 'e55a1002-0000-4000-8000-000000000031',
     'e55a1002-0000-4000-8000-000000000021', 1, 1)
  on conflict (id) do nothing;

  -- Une facture d'essai prend le numéro suivant de l'année. Le nettoyage le libère s'il est toujours le dernier.
  select count(*) into n from public.ventes
    where exploitation_id = ex and facture_annee = extract(year from current_date)::int and facture_num is not null
      and id <> 'e55a1002-0000-4000-8000-000000000031';
  raise notice 'Données d''essai en place. Factures réelles déjà numérotées cette année : %. La facture d''essai prendra le numéro %.', n, n + 1;
end $$;

-- Ce qui est en place (à relancer après les essais dans l'app pour voir ce qu'ils ont créé).
select 'ruche' quoi, nom, rucher detail from public.ruches where id::text like 'e55a1002-%'
union all
select 'évènement', r.nom, e.type || ' : ' || e.detail from public.ruche_evenements e
  join public.ruches r on r.id = e.ruche_id where r.id::text like 'e55a1002-%'
union all
select 'vente', c.nom, coalesce('facture F-' || v.facture_annee || '-' || lpad(v.facture_num::text, 4, '0'), 'pas encore de facture')
  from public.ventes v join public.clients c on c.id = v.client_id where v.id::text like 'e55a1002-%'
order by 1, 2;
