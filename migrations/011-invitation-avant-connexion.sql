-- Affiche le nom de l'exploitation sur le lien d'invitation, avant la connexion.
-- Ne casse pas l'ancienne version. Conséquence : qui possède un lien valable lit le nom de l'exploitation, rien d'autre.
grant execute on function public.invitation_info(text) to anon;
