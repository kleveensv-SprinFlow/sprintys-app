-- 20261103170000_ai_is_minor_metadata.sql
-- Accès IA : même règle d'âge que l'app (src/store/authStore.ts) : date de naissance du profil,
-- sinon celle enregistrée à l'inscription (auth.users.raw_user_meta_data.date_of_birth).
-- Sans cette reprise, un athlète majeur dont le profil n'a pas de date était traité comme mineur.
-- Date absente ou illisible partout = mineur (src/legal/age.ts). Idempotente.

CREATE OR REPLACE FUNCTION public._ai_is_minor(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH dob AS (
    SELECT COALESCE(
      (SELECT p.date_of_birth FROM public.profiles p WHERE p.id = p_uid),
      (SELECT (u.raw_user_meta_data->>'date_of_birth')::date FROM auth.users u
       WHERE u.id = p_uid AND (u.raw_user_meta_data->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$')
    ) AS d
  )
  SELECT COALESCE((SELECT date_part('year', age((now() AT TIME ZONE 'Europe/Paris')::date, d)) < 18 FROM dob WHERE d IS NOT NULL), true)
$$;

REVOKE ALL ON FUNCTION public._ai_is_minor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ai_is_minor(uuid) TO service_role;
