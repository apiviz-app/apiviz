-- Apiviz — migration 033 : goûts des clients et « prévenir à la prochaine récolte » (v5.66, maquettes « Nouveau
-- client » et « Produits › Récoltes » du 18 nov. 2026, validées par Pierre-Louis).
--
-- Contenu :
--   1. clients.gouts : produits préférés du client (« Miel 500 g », « Hydromel 75 cl »), liste de textes courts.
--   2. clients.prevenir : le client a demandé à être prévenu de la prochaine récolte ; l'onglet Récoltes le liste, avec
--      un message prêt à envoyer, puis remet la case à faux une fois les clients prévenus.
-- Dépendances : 000 à 032. Aucune fonction, aucune règle d'accès nouvelle : celles de clients (008, 014) s'appliquent.
-- Casse l'ancienne version : NON. Deux colonnes avec une valeur par défaut ; une ancienne version les ignore. Sans
--   cette migration, la nouvelle version enregistre le client sans ses goûts et le dit (« la base doit être mise à jour »).
-- Relançable : oui (if not exists, drop constraint if exists).
-- Retour arrière : revenir au code précédent suffit ; les colonnes peuvent rester.

alter table public.clients add column if not exists gouts text[] not null default '{}';
alter table public.clients add column if not exists prevenir boolean not null default false;

-- Huit goûts au plus, de 60 caractères au plus chacun (l'application en propose une poignée).
alter table public.clients drop constraint if exists clients_gouts_court;
alter table public.clients add constraint clients_gouts_court
  check (cardinality(gouts) <= 8 and coalesce(length(array_to_string(gouts, '')), 0) <= 8 * 60);
