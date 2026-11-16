-- Apiviz — migration 024 : compteur d'usage de l'assistant API (IT-24, AP-TECH-336).
--
-- Contenu :
--   1. assistant_usage : nombre de questions posées à API par personne et par jour (heure de Paris). Rien d'autre :
--      ni la question, ni la réponse, ni les données lues ne sont conservées (choix de confidentialité, IT-24 §7 :
--      la table assistant_conversations « facultative » n'est pas créée).
--   2. assistant_consommer(p_plafond) : compte une question de la personne connectée et renvoie le nombre de questions
--      qui lui restent aujourd'hui ; renvoie -1, sans compter, quand le plafond est atteint. Appelée par la fonction
--      serveur « assistant » avant chaque appel au modèle.
--   3. assistant_restant(p_plafond) : la même chose, en lecture seule (affichage dans l'application).
-- Dépendances : 000 (auth.uid()). Aucune autre table touchée.
-- Casse l'ancienne version : NON. Table et fonctions nouvelles ; l'ancienne version ne les utilise pas.
-- Relançable : oui (if not exists, create or replace, drop policy if exists).
-- Sécurité :
--   - RLS : chacun ne lit que ses propres lignes ; aucune écriture directe (pas de politique insert, update, delete).
--   - assistant_consommer est en security definer, seule façon d'écrire dans la table : sans elle, une personne pourrait
--     remettre son compteur à zéro. Elle n'écrit que la ligne de auth.uid() pour aujourd'hui ; search_path vide.
--     L'appeler soi-même ne peut que réduire son propre quota.
--   - Le compteur est par personne, toutes exploitations confondues : changer d'exploitation ne remet pas à zéro.

create table if not exists public.assistant_usage (
  user_id uuid not null,
  jour date not null,
  nb integer not null default 0 check (nb >= 0),
  maj_le timestamptz not null default now(),
  primary key (user_id, jour)
);
comment on table public.assistant_usage is 'Questions posées à API par personne et par jour (heure de Paris). Aucun contenu conservé. Migration 024.';

alter table public.assistant_usage enable row level security;
drop policy if exists voir_le_sien on public.assistant_usage;
create policy voir_le_sien on public.assistant_usage for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.assistant_usage from anon;
revoke insert, update, delete, truncate on public.assistant_usage from authenticated;
grant select on public.assistant_usage to authenticated;

create or replace function public.assistant_consommer(p_plafond integer) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_nb integer;
begin
  if v_user is null then raise exception 'Connexion nécessaire pour interroger API.' using errcode = '42501'; end if;
  if p_plafond is null or p_plafond < 1 then raise exception 'Plafond d''usage invalide.' using errcode = '22023'; end if;
  insert into public.assistant_usage as u (user_id, jour, nb) values (v_user, v_jour, 1)
  on conflict (user_id, jour) do update set nb = u.nb + 1, maj_le = now() where u.nb < p_plafond
  returning nb into v_nb;
  if v_nb is null then return -1; end if;
  return p_plafond - v_nb;
end;
$$;
revoke execute on function public.assistant_consommer(integer) from public, anon;
grant execute on function public.assistant_consommer(integer) to authenticated;

create or replace function public.assistant_restant(p_plafond integer) returns integer
language sql stable security invoker set search_path = '' as $$
  select greatest(0, coalesce(p_plafond, 0) - coalesce((
    select u.nb from public.assistant_usage u
    where u.user_id = (select auth.uid()) and u.jour = (now() at time zone 'Europe/Paris')::date), 0));
$$;
revoke execute on function public.assistant_restant(integer) from public, anon;
grant execute on function public.assistant_restant(integer) to authenticated;
