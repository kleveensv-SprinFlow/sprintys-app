-- 20261024090000_previous_results.sql
-- « Dernière fois » pendant la saisie : pour une séance donnée, ce que l'athlète avait fait la dernière fois
-- sur chaque exercice de musculation (charge × répétitions par série) et sur chaque distance de course
-- (dernier chrono et record, piste et côte séparées). Lecture seule, aucune donnée modifiée.

CREATE OR REPLACE FUNCTION public.get_previous_results(p_athlete uuid, p_workout uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_muscu jsonb;
  v_course jsonb;
  v_at timestamptz;
BEGIN
  IF NOT public._can_view_athlete(p_athlete) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  -- Only what came before this session (looking at an old session must not show later results)
  SELECT COALESCE((SELECT date_prevue FROM public.workouts WHERE id = p_workout), now()) INTO v_at;

  -- Musculation : par exercice, la séance la plus récente (hors celle-ci) qui le contient
  WITH base AS (
    SELECT btrim(public._effort_exercise_key(e)) AS k, e.workout_id, e.date_achieved, e.set_order, COALESCE((e.planned_extra->>'set_index')::int, -1) AS sidx, COALESCE(e.planned_extra->>'exercise_id', '') AS exid,
           public._effort_weight(e) AS kg, e.actual_reps AS reps,
           (COALESCE(e.actual_extra->>'repsOk', 'true') <> 'false') AS ok
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete
      AND e.workout_id IS DISTINCT FROM p_workout
      AND lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force'
      AND public._effort_weight(e) > 0
      AND e.date_achieved < v_at AND e.date_achieved > v_at - interval '12 months'
  ),
  last_session AS (
    SELECT DISTINCT ON (k) k, workout_id, date_achieved FROM base ORDER BY k, date_achieved DESC, workout_id
  )
  SELECT COALESCE(jsonb_object_agg(l.k, jsonb_build_object(
           'date', l.date_achieved,
           'sets', (SELECT jsonb_agg(jsonb_build_object('kg', b.kg, 'reps', b.reps, 'ok', b.ok, 'idx', b.sidx, 'ex', b.exid) ORDER BY b.set_order)
                    FROM base b WHERE b.k = l.k AND b.workout_id = l.workout_id),
           'best_kg', (SELECT max(b.kg) FROM base b WHERE b.k = l.k AND b.ok)
         )), '{}'::jsonb)
  INTO v_muscu
  FROM last_session l WHERE l.k <> '';

  -- Course : par distance et terrain, dernier chrono et meilleur
  WITH c AS (
    SELECT actual_distance_m::numeric AS d, workout_id, set_order,
           CASE WHEN lower(COALESCE(exercise_category, '')) ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END AS surf,
           actual_time_ms AS t, date_achieved
    FROM public.athlete_efforts
    WHERE athlete_id = p_athlete
      AND workout_id IS DISTINCT FROM p_workout
      AND actual_time_ms > 0 AND actual_distance_m > 0
      AND lower(COALESCE(exercise_category, '')) !~ 'muscu|force|escalier|stair'
      AND date_achieved < v_at AND date_achieved > v_at - interval '12 months'
  ),
  agg AS (
    SELECT d, surf,
           (array_agg(t ORDER BY date_achieved DESC, workout_id DESC, set_order DESC))[1] AS last_ms,
           (array_agg(date_achieved ORDER BY date_achieved DESC, workout_id DESC, set_order DESC))[1] AS last_at,
           min(t) AS best_ms
    FROM c GROUP BY d, surf
  )
  SELECT COALESCE(jsonb_object_agg(trim_scale(d)::text || '|' || surf,
           jsonb_build_object('last_ms', last_ms, 'date', last_at, 'best_ms', best_ms)), '{}'::jsonb)
  INTO v_course FROM agg;

  RETURN jsonb_build_object('muscu', v_muscu, 'course', v_course);
END;
$$;

REVOKE ALL ON FUNCTION public.get_previous_results(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_previous_results(uuid, uuid) TO authenticated;
