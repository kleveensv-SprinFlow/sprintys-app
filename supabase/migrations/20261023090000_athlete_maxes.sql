-- 20261023090000_athlete_maxes.sql
-- Charges en % du max : le 1RM de référence de chaque athlète par exercice.
--  * estimé automatiquement depuis ses meilleures séries (formule d'Epley, séries de 1 à 10 répétitions, 12 derniers mois)
--  * ou fixé à la main (par l'athlète ou son coach) : la valeur manuelle l'emporte

CREATE TABLE IF NOT EXISTS public.athlete_maxes (
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_key text NOT NULL,
  label text NOT NULL,
  one_rm_kg numeric NOT NULL CHECK (one_rm_kg > 0 AND one_rm_kg < 1000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (athlete_id, exercise_key)
);

ALTER TABLE public.athlete_maxes ENABLE ROW LEVEL SECURITY;
-- Tout passe par les fonctions ci-dessous (SECURITY DEFINER) : aucun accès direct à la table
REVOKE ALL ON public.athlete_maxes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._can_view_athlete(p_athlete uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = p_athlete OR EXISTS (
      SELECT 1 FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = p_athlete AND tm.status = 'approved' AND t.coach_id = auth.uid()
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_maxes(p_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public._can_view_athlete(p_athlete) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  WITH est AS (
    SELECT public._effort_exercise_key(e) AS k,
           COALESCE(NULLIF(e.actual_extra->>'exercise', ''), NULLIF(e.planned_extra->>'exercise_name', ''), e.exercise_catalog_id) AS label,
           max(public._effort_weight(e) * (1 + LEAST(e.actual_reps, 10)::numeric / 30)) AS est_kg,
           max(e.date_achieved) AS last_at
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete
      AND lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(e.actual_extra->>'repsOk', 'true') <> 'false'
      AND e.actual_reps BETWEEN 1 AND 10
      AND public._effort_weight(e) > 0
      AND e.date_achieved > now() - interval '12 months'
    GROUP BY 1, 2
  ),
  est1 AS (
    SELECT DISTINCT ON (k) k, label, est_kg, last_at FROM est WHERE k <> '' ORDER BY k, est_kg DESC
  ),
  merged AS (
    SELECT COALESCE(m.exercise_key, e.k) AS k,
           COALESCE(m.label, e.label) AS label,
           m.one_rm_kg AS manual_kg,
           round(e.est_kg * 2) / 2 AS estimated_kg,
           COALESCE(e.last_at, m.updated_at) AS last_at
    FROM public.athlete_maxes m
    FULL JOIN est1 e ON e.k = m.exercise_key AND m.athlete_id = p_athlete
    WHERE m.athlete_id = p_athlete OR m.athlete_id IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'key', k, 'label', label, 'manual_kg', manual_kg, 'estimated_kg', estimated_kg,
           'best_kg', COALESCE(manual_kg, estimated_kg)
         ) ORDER BY last_at DESC NULLS LAST), '[]'::jsonb)
  INTO v FROM merged;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_athlete_max(p_athlete uuid, p_key text, p_label text, p_kg numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._can_view_athlete(p_athlete) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_key IS NULL OR btrim(p_key) = '' THEN RAISE EXCEPTION 'Invalid key'; END IF;
  IF p_kg IS NULL THEN
    DELETE FROM public.athlete_maxes WHERE athlete_id = p_athlete AND exercise_key = lower(btrim(p_key));
    RETURN;
  END IF;
  IF p_kg <= 0 OR p_kg >= 1000 THEN RAISE EXCEPTION 'Invalid weight'; END IF;
  INSERT INTO public.athlete_maxes (athlete_id, exercise_key, label, one_rm_kg, updated_by, updated_at)
  VALUES (p_athlete, lower(btrim(p_key)), left(COALESCE(NULLIF(btrim(p_label), ''), p_key), 120), p_kg, auth.uid(), now())
  ON CONFLICT (athlete_id, exercise_key)
  DO UPDATE SET one_rm_kg = EXCLUDED.one_rm_kg, label = EXCLUDED.label, updated_by = auth.uid(), updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public._can_view_athlete(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_athlete_maxes(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_athlete_max(uuid, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_view_athlete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_maxes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_athlete_max(uuid, text, text, numeric) TO authenticated;
