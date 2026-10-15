-- 20261025091000_harden_health_consent_trigger.sql
-- Advisors Supabase : fonction SECURITY DEFINER sans search_path figé et exécutable par anon/authenticated.
-- C'est une fonction de trigger : personne n'a besoin de l'appeler directement.
ALTER FUNCTION public.check_health_data_consent() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.check_health_data_consent() FROM PUBLIC, anon, authenticated;
