-- 20261102160000_securite_fonctions_et_records_masques.sql
-- 1. _perf_efforts : fermée à tous les appels directs (seule get_athlete_performance, SECURITY DEFINER, l'utilise).
-- 2. assign_workout_to_group : seul le coach de l'équipe / du sous-groupe peut assigner ; coach_id forcé à l'appelant.
-- 3. get_workout_degradation : seul l'athlète ou son coach peut lire.
-- 4. get_previous_results : ignore les séries masquées des records (« Dernier » / « record »).
-- Idempotente (CREATE OR REPLACE + REVOKE/GRANT).

-- 1
REVOKE ALL ON FUNCTION public._perf_efforts(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 2
CREATE OR REPLACE FUNCTION public.assign_workout_to_group(p_workout_data jsonb, p_team_id uuid DEFAULT NULL::uuid, p_subgroup_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_group_assignment_id UUID;
    v_athlete_id UUID;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF p_team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND coach_id = v_uid) THEN
        RAISE EXCEPTION 'Forbidden: not the coach of this team';
    END IF;
    IF p_subgroup_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.subgroups s JOIN public.teams t ON t.id = s.team_id
        WHERE s.id = p_subgroup_id AND t.coach_id = v_uid
          AND (p_team_id IS NULL OR s.team_id = p_team_id)
    ) THEN
        RAISE EXCEPTION 'Forbidden: not the coach of this subgroup';
    END IF;

    v_group_assignment_id := gen_random_uuid();

    IF p_subgroup_id IS NOT NULL THEN
        FOR v_athlete_id IN SELECT user_id FROM public.team_members WHERE subgroup_id = p_subgroup_id AND status = 'approved' LOOP
            INSERT INTO public.workouts (group_assignment_id, team_id, subgroup_id, athlete_id, coach_id, type_seance, date_prevue, status, intensity, description, exercises, blocks)
            VALUES (v_group_assignment_id, p_team_id, p_subgroup_id, v_athlete_id, v_uid,
                    p_workout_data->>'type_seance', (p_workout_data->>'date_prevue')::timestamptz,
                    COALESCE(p_workout_data->>'status', 'pending'), (p_workout_data->>'intensity')::int,
                    p_workout_data->>'description', p_workout_data->'exercises', p_workout_data->'blocks');
        END LOOP;
    ELSIF p_team_id IS NOT NULL THEN
        FOR v_athlete_id IN SELECT user_id FROM public.team_members WHERE team_id = p_team_id AND status = 'approved' LOOP
            INSERT INTO public.workouts (group_assignment_id, team_id, subgroup_id, athlete_id, coach_id, type_seance, date_prevue, status, intensity, description, exercises, blocks)
            VALUES (v_group_assignment_id, p_team_id, p_subgroup_id, v_athlete_id, v_uid,
                    p_workout_data->>'type_seance', (p_workout_data->>'date_prevue')::timestamptz,
                    COALESCE(p_workout_data->>'status', 'pending'), (p_workout_data->>'intensity')::int,
                    p_workout_data->>'description', p_workout_data->'exercises', p_workout_data->'blocks');
        END LOOP;
    ELSE
        RAISE EXCEPTION 'Either p_team_id or p_subgroup_id must be provided';
    END IF;

    RETURN v_group_assignment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_workout_to_group(jsonb, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_workout_to_group(jsonb, uuid, uuid) TO authenticated;

-- 3
CREATE OR REPLACE FUNCTION public.get_workout_degradation(p_athlete_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(workout_id uuid, workout_date timestamp with time zone, exercise_category text, distance_m numeric, best_time_ms integer, worst_time_ms integer, degradation_percentage numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT e.workout_id, MIN(e.date_achieved), e.exercise_category, e.actual_distance_m,
           MIN(e.actual_time_ms), MAX(e.actual_time_ms),
           ROUND((MAX(e.actual_time_ms) - MIN(e.actual_time_ms))::NUMERIC / NULLIF(MIN(e.actual_time_ms), 0) * 100, 2)
    FROM public.athlete_efforts e
    WHERE public._can_view_athlete(p_athlete_id)
      AND e.athlete_id = p_athlete_id
      AND NOT e.hidden_from_records
      AND e.exercise_category = 'run'
      AND e.actual_time_ms IS NOT NULL
      AND e.actual_distance_m IS NOT NULL
    GROUP BY e.workout_id, e.exercise_category, e.actual_distance_m
    HAVING COUNT(e.actual_time_ms) > 1
    ORDER BY MIN(e.date_achieved) DESC
    LIMIT p_limit;
$function$;

REVOKE ALL ON FUNCTION public.get_workout_degradation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workout_degradation(uuid, integer) TO authenticated;

-- 4
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
  SELECT COALESCE((SELECT date_prevue FROM public.workouts WHERE id = p_workout), now()) INTO v_at;

  WITH base AS (
    SELECT btrim(public._effort_exercise_key(e)) AS k, e.workout_id, e.date_achieved, e.set_order, COALESCE((e.planned_extra->>'set_index')::int, -1) AS sidx, COALESCE(e.planned_extra->>'exercise_id', '') AS exid,
           public._effort_weight(e) AS kg, e.actual_reps AS reps,
           (COALESCE(e.actual_extra->>'repsOk', 'true') <> 'false') AS ok
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete
      AND e.workout_id IS DISTINCT FROM p_workout
      AND NOT e.hidden_from_records
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

  WITH c AS (
    SELECT actual_distance_m::numeric AS d, workout_id, set_order,
           CASE WHEN lower(COALESCE(exercise_category, '')) ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END AS surf,
           actual_time_ms AS t, date_achieved
    FROM public.athlete_efforts
    WHERE athlete_id = p_athlete
      AND workout_id IS DISTINCT FROM p_workout
      AND NOT hidden_from_records
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
