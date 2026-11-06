-- Apidoo — migration 012 : correctifs de fiabilité (IT-01).
--
-- Contenu :
--   1. Clients : adresse, code postal, ville, SIRET (facture à un professionnel, AP-BUG-007).
--   2. regler(p_modifs) : modifie les réglages clé par clé, sans écraser ceux d'un autre membre (AP-BUG-005).
--   3. ajouter_stock(p) : entrée de stock en incrément, avec la dépense éventuelle, en une transaction (AP-BUG-005).
--   4. photos_orphelines() : liste, en lecture seule, les fichiers photo sans visite (AP-BUG-004).
-- Dépendances : 000, 004 à 011 (exploitation_courante(), reglages par exploitation, déclencheur depenses_stock).
-- Casse l'ancienne version : NON. Uniquement des ajouts (colonnes facultatives, nouvelles fonctions) ;
--   l'ancienne application ne les utilise pas et continue de fonctionner.
-- Relançable : oui (add column if not exists, create or replace).
-- Sécurité : fonctions en security invoker, search_path vide ; la RLS existante (exploitation_courante) s'applique.

-- 1. Coordonnées des clients ---------------------------------------------------------------------------------
alter table public.clients add column if not exists adresse text not null default '';
alter table public.clients add column if not exists code_postal text not null default '';
alter table public.clients add column if not exists ville text not null default '';
alter table public.clients add column if not exists siret text not null default '';

-- 2. Réglages clé par clé ------------------------------------------------------------------------------------
-- Fusionne p_modifs dans les réglages de l'exploitation courante, en une seule instruction (verrou de ligne) :
-- deux membres qui changent deux clés différentes en même temps gardent tous les deux leur modification.
-- Une valeur null retire la clé. Renvoie les réglages complets après modification.
create or replace function public.regler(p_modifs jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exploitation_courante();
  resultat jsonb;
begin
  if e is null then raise exception 'Aucune exploitation ouverte' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_modifs, '{}'::jsonb)) <> 'object' then raise exception 'Réglages invalides'; end if;
  insert into public.reglages (exploitation_id, id, data) values (e, 1, '{}'::jsonb) on conflict (exploitation_id) do nothing;
  update public.reglages r
     set data = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
                   from jsonb_each(r.data || coalesce(p_modifs, '{}'::jsonb)) as x(k, v)
                  where v <> 'null'::jsonb)
   where r.exploitation_id = e
  returning r.data into resultat;
  return resultat;
end;
$$;
revoke all on function public.regler(jsonb) from public, anon;
grant execute on function public.regler(jsonb) to authenticated;

-- 3. Entrée de stock -----------------------------------------------------------------------------------------
-- p = { article_id, quantite, depense?: { id, libelle, categorie, montant, date_depense, fournisseur_id } }
-- Sans dépense : stock = stock + quantite (incrément en base, plus d'écrasement par une valeur lue avant).
-- Avec dépense : la dépense porte article_id et quantite ; le déclencheur depenses_stock fait l'incrément.
--   L'identifiant de dépense fourni par l'application rend l'appel idempotent (un second appel ne fait rien).
create or replace function public.ajouter_stock(p jsonb)
returns numeric language plpgsql security invoker set search_path = '' as $$
declare
  e uuid := public.exploitation_courante();
  a public.articles%rowtype;
  q numeric := (p->>'quantite')::numeric;
  d jsonb := p->'depense';
  d_id uuid;
begin
  if e is null then raise exception 'Aucune exploitation ouverte' using errcode = '42501'; end if;
  if q is null or q <= 0 then raise exception 'Indique une quantité supérieure à zéro'; end if;
  select * into a from public.articles where id = (p->>'article_id')::uuid and exploitation_id = e for update;
  if a.id is null then raise exception 'Article introuvable dans cette exploitation'; end if;
  if d is null or jsonb_typeof(d) <> 'object' then
    update public.articles set stock = stock + q where id = a.id;
  else
    d_id := coalesce(nullif(d->>'id', '')::uuid, gen_random_uuid());
    if not exists (select 1 from public.depenses where id = d_id) then
      if nullif(d->>'fournisseur_id', '') is not null and not exists (
           select 1 from public.fournisseurs where id = (d->>'fournisseur_id')::uuid and exploitation_id = e) then
        raise exception 'Fournisseur introuvable dans cette exploitation';
      end if;
      insert into public.depenses (id, libelle, categorie, montant, date_depense, fournisseur_id, article_id, quantite)
      values (d_id, coalesce(nullif(d->>'libelle', ''), a.nom), coalesce(nullif(d->>'categorie', ''), 'Autre'),
              (d->>'montant')::numeric, coalesce((d->>'date_depense')::date, current_date),
              nullif(d->>'fournisseur_id', '')::uuid, a.id, q);
    end if;
  end if;
  return (select stock from public.articles where id = a.id);
end;
$$;
revoke all on function public.ajouter_stock(jsonb) from public, anon;
grant execute on function public.ajouter_stock(jsonb) to authenticated;

-- 4. Recensement des photos orphelines (lecture seule) -------------------------------------------------------
-- Fichiers du dossier de l'exploitation courante qui n'ont plus de ligne dans visite_photos.
-- Le nettoyage définitif est prévu en IT-11 ; rien n'est supprimé ici.
create or replace function public.photos_orphelines()
returns table (chemin text, octets bigint, cree_le timestamptz)
language sql stable security invoker set search_path = '' as $$
  select o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
    from storage.objects o
   where o.bucket_id = 'photos-visites'
     and split_part(o.name, '/', 1) = public.exploitation_courante()::text
     and not exists (select 1 from public.visite_photos p where p.chemin = o.name)
   order by o.created_at;
$$;
revoke all on function public.photos_orphelines() from public, anon;
grant execute on function public.photos_orphelines() to authenticated;
