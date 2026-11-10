-- Apiviz — retire les données d'essai d'IT-02 (donnees-essai.sql) et tout ce que les essais ont créé dessus.
-- À coller dans Supabase › apidoo › SQL Editor, puis « Run ». Relançable : ne fait rien s'il n'y a plus rien.
-- Ne supprime que les lignes aux identifiants « e55a1002-… » et ce qui en dépend
-- (évènements, visites, tâches, récoltes des ruches d'essai ; lignes de la vente d'essai).

do $$
declare
  ids_ruches uuid[] := array['e55a1002-0000-4000-8000-000000000001', 'e55a1002-0000-4000-8000-000000000002',
                         'e55a1002-0000-4000-8000-000000000003']::uuid[];
  id_vente uuid := 'e55a1002-0000-4000-8000-000000000031';
  v public.ventes%rowtype;
  dernier int;
  n int;
begin
  -- Facture d'essai : son numéro n'est libéré que s'il est le dernier de l'année.
  select * into v from public.ventes where id = id_vente;
  if v.facture_num is not null then
    select max(facture_num) into dernier from public.ventes
      where exploitation_id = v.exploitation_id and facture_annee = v.facture_annee;
    if dernier > v.facture_num then
      raise warning 'Une vraie facture (n° %) a été créée après la facture d''essai (n° %) : la numérotation aura un trou. À signaler.',
        dernier, v.facture_num;
    end if;
  end if;

  -- Photos : les fichiers du stockage ne s'effacent pas en SQL. Il ne doit pas y en avoir.
  select count(*) into n from public.visite_photos p join public.visites vi on vi.id = p.visite_id
    where vi.ruche_id = any (ids_ruches);
  if n > 0 then
    raise exception 'Arrêt : % photo(s) sur les ruches d''essai. Supprimer d''abord ces ruches depuis l''app (elle efface les fichiers), puis relancer.', n;
  end if;

  delete from public.vente_lignes where vente_id = id_vente;
  delete from public.ventes where id = id_vente;
  delete from public.lots where id = 'e55a1002-0000-4000-8000-000000000021';
  delete from public.clients where id = 'e55a1002-0000-4000-8000-000000000011';
  delete from public.taches where ruche_id = any (ids_ruches);
  delete from public.recoltes where ruche_id = any (ids_ruches);
  delete from public.ruches where id = any (ids_ruches); -- évènements et visites suivent (on delete cascade)
  raise notice 'Données d''essai IT-02 retirées.';
end $$;

-- Doit renvoyer 0 partout.
select (select count(*) from public.ruches where id::text like 'e55a1002-%') ruches,
       (select count(*) from public.clients where id::text like 'e55a1002-%') clients,
       (select count(*) from public.lots where id::text like 'e55a1002-%') lots,
       (select count(*) from public.ventes where id::text like 'e55a1002-%') ventes;
