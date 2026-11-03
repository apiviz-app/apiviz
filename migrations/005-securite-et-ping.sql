-- Apidoo — migration 005 : sécurité et réveil quotidien
-- Appliquée le 3 novembre 2026. Peut être relancée sans risque.

-- 1. est_membre() n'est plus appelable sans être connecté.
revoke execute on function public.est_membre() from public, anon;
grant execute on function public.est_membre() to authenticated;

-- 2. ping() : fonction sans données, appelée chaque jour par
--    .github/workflows/reveil-supabase.yml pour éviter la mise en pause.
create or replace function public.ping() returns int
language sql stable security invoker set search_path = '' as $$ select 1 $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
