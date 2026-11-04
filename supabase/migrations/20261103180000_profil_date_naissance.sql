-- 20261103180000_profil_date_naissance.sql
-- La date de naissance saisie à l'inscription arrive dans auth.users.raw_user_meta_data, mais handle_new_user
-- ne la recopiait pas dans profiles. L'app ne la réécrivait qu'après une vérification d'e-mail faite sur le même
-- téléphone : sinon profiles.date_of_birth restait vide (5 comptes au 3 nov. 2026).
--  1. handle_new_user recopie la date si elle est au format AAAA-MM-JJ et plausible (1900 à aujourd'hui).
--  2. Les profils sans date reprennent celle de l'inscription, aux mêmes conditions.
-- Une date déjà présente dans le profil n'est jamais écrasée. Idempotente.

CREATE OR REPLACE FUNCTION public._metadata_birth_date(p_meta jsonb)
RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN (p_meta->>'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$'
     AND (p_meta->>'date_of_birth') >= '1900-01-01'
     AND (p_meta->>'date_of_birth') <= to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD')
    THEN (p_meta->>'date_of_birth')::date
  END
$$;
REVOKE ALL ON FUNCTION public._metadata_birth_date(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'athlete');

  IF v_role NOT IN ('athlete', 'coach') THEN
    v_role := 'athlete';
  END IF;

  INSERT INTO public.profiles (id, full_name, first_name, last_name, role, date_of_birth)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilisateur'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_role,
    public._metadata_birth_date(NEW.raw_user_meta_data)
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      date_of_birth = COALESCE(public.profiles.date_of_birth, EXCLUDED.date_of_birth);

  RETURN NEW;
END;
$function$;

-- Reprise des comptes existants
UPDATE public.profiles p
SET date_of_birth = public._metadata_birth_date(u.raw_user_meta_data)
FROM auth.users u
WHERE u.id = p.id
  AND p.date_of_birth IS NULL
  AND public._metadata_birth_date(u.raw_user_meta_data) IS NOT NULL;
