-- Apidoo — migration 010 : déplacements et interventions au registre, numérotation des factures.
-- Uniquement des ajouts. L'ancienne version de l'app continue de fonctionner. Peut être relancée sans risque.

-- 1. Vie d'une colonie : déplacement de ruches et intervention vétérinaire.
alter table public.ruche_evenements drop constraint if exists ruche_evenements_type_check;
alter table public.ruche_evenements add constraint ruche_evenements_type_check
  check (type in ('installation', 'division', 'essaimage', 'reunion', 'reine', 'sortie', 'reactivation', 'deplacement', 'intervention'));

-- 2. Factures : un numéro par année et par exploitation, attribué une seule fois.
alter table public.ventes
  add column if not exists facture_annee int,
  add column if not exists facture_num int,
  add column if not exists facture_date date;
create unique index if not exists ventes_facture_idx on public.ventes (exploitation_id, facture_annee, facture_num)
  where facture_num is not null;

create or replace function public.numeroter_facture(p_vente uuid)
returns public.ventes language plpgsql set search_path = '' as $$
declare
  v public.ventes%rowtype;
  an int := extract(year from current_date)::int;
begin
  select * into v from public.ventes where id = p_vente for update;
  if v.id is null then raise exception 'Vente introuvable'; end if;
  if v.facture_num is not null then return v; end if;
  perform pg_advisory_xact_lock(hashtextextended(v.exploitation_id::text, an));
  update public.ventes set facture_annee = an, facture_date = current_date,
    facture_num = (select coalesce(max(facture_num), 0) + 1 from public.ventes
                   where exploitation_id = v.exploitation_id and facture_annee = an)
  where id = p_vente returning * into v;
  return v;
end;
$$;
grant execute on function public.numeroter_facture(uuid) to authenticated;
