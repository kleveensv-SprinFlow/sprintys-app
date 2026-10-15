-- La suppression de compte passe par la fonction Edge delete_account_and_assets.
-- public.delete_user n'est pas appelée par l'application. La version marquée
-- appliquée (20260930000001) n'avait pas de search_path figé et n'est pas en base.
-- On garantit qu'elle n'existe pas, au lieu de réactiver une fonction inutile
-- qui peut supprimer un compte.
DROP FUNCTION IF EXISTS public.delete_user();
