-- 20261022090000_perf_alerts_fixes.sql
-- Corrections après revue :
--  * get_athlete_performance / get_team_alerts : un coach ne voit que les séances qu'il a lui-même programmées
--    (comme la RLS), et le ratio de charge n'est calculé qu'avec 3 semaines de charge saisie
--  * « record battu » vient d'is_pr (plus de médaille sur la toute première séance)
--  * submit_workout_results : recalcule is_pr des résultats postérieurs quand on corrige une séance

CREATE OR REPLACE FUNCTION public._perf_efforts(p_athlete uuid, p_viewer uuid)
RETURNS SETOF public.athlete_efforts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.* FROM public.athlete_efforts e
  WHERE e.athlete_id = p_athlete
    AND (p_viewer = p_athlete OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = e.workout_id AND w.coach_id = p_viewer))
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_performance(p_athlete uuid, p_weeks int DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_weeks int := LEAST(GREATEST(COALESCE(p_weeks, 8), 1), 26);
  v_week0 date;
  v_records jsonb;
  v_series jsonb;
  v_weekly jsonb;
  v_acute numeric;
  v_chronic numeric;
  v_form jsonb;
  v_recent jsonb;
  v_load_weeks int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_uid <> p_athlete AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_athlete AND tm.status = 'approved' AND t.coach_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_week0 := date_trunc('week', v_today::timestamp)::date - (v_weeks - 1) * 7;

  -- Records : meilleur chrono par distance et terrain, meilleure charge par exercice
  WITH base AS (
    SELECT e.*, lower(COALESCE(e.exercise_category, '')) AS cat FROM public._perf_efforts(p_athlete, v_uid) e
  ),
  course AS (
    SELECT actual_distance_m::numeric AS d,
           CASE WHEN cat ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END AS surf,
           actual_time_ms AS t, date_achieved, is_pr
    FROM base WHERE actual_time_ms > 0 AND actual_distance_m > 0 AND cat !~ 'muscu|force|escalier|stair'
  ),
  course_best AS (
    SELECT DISTINCT ON (d, surf) d, surf, t, date_achieved, is_pr,
           count(*) OVER (PARTITION BY d, surf) AS n
    FROM course ORDER BY d, surf, t ASC, date_achieved DESC
  ),
  muscu AS (
    SELECT public._effort_exercise_key(b) AS k,
           COALESCE(NULLIF(b.actual_extra->>'exercise', ''), NULLIF(b.planned_extra->>'exercise_name', ''), b.exercise_catalog_id, b.exercise_category) AS label,
           public._effort_weight(b) AS kg, b.actual_reps, b.date_achieved, b.is_pr
    FROM public._perf_efforts(p_athlete, v_uid) b
    WHERE lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(b.actual_extra->>'repsOk', 'true') <> 'false'
  ),
  muscu_best AS (
    SELECT DISTINCT ON (k) k, label, kg, date_achieved, is_pr, count(*) OVER (PARTITION BY k) AS n
    FROM muscu WHERE kg > 0 ORDER BY k, kg DESC, date_achieved DESC
  )
  SELECT COALESCE(jsonb_agg(r ORDER BY ord, sort2), '[]'::jsonb) INTO v_records FROM (
    SELECT 1 AS ord, d AS sort2, jsonb_build_object(
        'kind', 'course', 'key', 'c' || d::text || surf, 'label', d::text || ' m' || CASE WHEN surf = 'cote' THEN ' (côte)' ELSE '' END,
        'value', round(t / 1000.0, 2), 'unit', 's', 'distance_m', d, 'surface', surf,
        'date', date_achieved, 'count', n,
        'recent_pr', date_achieved >= now() - interval '14 days' AND is_pr) AS r
    FROM course_best
    UNION ALL
    SELECT 2, 0, jsonb_build_object(
        'kind', 'muscu', 'key', 'm' || k, 'label', label, 'value', kg, 'unit', 'kg',
        'date', date_achieved, 'count', n, 'recent_pr', date_achieved >= now() - interval '14 days' AND is_pr)
    FROM muscu_best
  ) q;

  -- Progression : meilleur résultat de chaque jour (12 derniers jours d'entraînement), 4 séries les plus fournies
  WITH base AS (
    SELECT e.*, lower(COALESCE(e.exercise_category, '')) AS cat FROM public._perf_efforts(p_athlete, v_uid) e
  ),
  pts AS (
    SELECT 'c' || actual_distance_m::numeric::text || (CASE WHEN cat ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END) AS k,
           actual_distance_m::numeric::text || ' m' || (CASE WHEN cat ~ 'c[oô]te' THEN ' (côte)' ELSE '' END) AS label,
           's' AS unit, 'lower' AS better,
           (date_achieved AT TIME ZONE 'Europe/Paris')::date AS day,
           min(actual_time_ms) / 1000.0 AS v
    FROM base WHERE actual_time_ms > 0 AND actual_distance_m > 0 AND cat !~ 'muscu|force|escalier|stair'
    GROUP BY 1, 2, 5
    UNION ALL
    SELECT 'm' || public._effort_exercise_key(b),
           COALESCE(NULLIF(b.actual_extra->>'exercise', ''), NULLIF(b.planned_extra->>'exercise_name', ''), b.exercise_catalog_id, b.exercise_category),
           'kg', 'higher', (b.date_achieved AT TIME ZONE 'Europe/Paris')::date,
           max(public._effort_weight(b))
    FROM public._perf_efforts(p_athlete, v_uid) b
    WHERE lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(b.actual_extra->>'repsOk', 'true') <> 'false'
      AND public._effort_weight(b) > 0
    GROUP BY 1, 2, 5
  ),
  ranked AS (
    SELECT k, min(label) AS label, min(unit) AS unit, min(better) AS better, count(*) AS n, max(day) AS last_day
    FROM pts GROUP BY k HAVING count(*) >= 2
    ORDER BY count(*) DESC, max(day) DESC LIMIT 4
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'key', r.k, 'label', r.label, 'unit', r.unit, 'better', r.better,
      'points', (SELECT jsonb_agg(jsonb_build_object('date', x.day, 'value', round(x.v::numeric, 2)) ORDER BY x.day)
                 FROM (SELECT day, v FROM pts WHERE pts.k = r.k ORDER BY day DESC LIMIT 12) x)
    ) ORDER BY r.n DESC), '[]'::jsonb) INTO v_series
  FROM ranked r;

  -- Semaine par semaine : séances prévues / validées, charge (RPE × durée), volume de course
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'week_start', wk.d::date, 'planned', COALESCE(s.planned, 0), 'done', COALESCE(s.done, 0),
      'load', COALESCE(s.load, 0), 'run_m', COALESCE(v.run_m, 0)) ORDER BY wk.d), '[]'::jsonb) INTO v_weekly
  FROM generate_series(v_week0, v_week0 + (v_weeks - 1) * 7, interval '7 days') AS wk(d)
  LEFT JOIN LATERAL (
    SELECT count(*) AS planned,
           count(*) FILTER (WHERE w.status = 'completed') AS done,
           sum(CASE WHEN jsonb_typeof(w.measures->'rpe') = 'number' AND jsonb_typeof(w.measures->'duration_min') = 'number'
                    THEN (w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric END) AS load
    FROM public.workouts w
    WHERE w.athlete_id = p_athlete AND (v_uid = p_athlete OR w.coach_id = v_uid)
      AND COALESCE(w.measures->>'is_master', 'false') <> 'true'
      AND w.type_seance !~* 'repos'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date >= wk.d::date
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date < wk.d::date + 7
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date <= v_today
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT sum(e.actual_distance_m) AS run_m
    FROM public._perf_efforts(p_athlete, v_uid) e
    WHERE e.actual_time_ms > 0 AND e.actual_distance_m > 0
      AND (e.date_achieved AT TIME ZONE 'Europe/Paris')::date >= wk.d::date
      AND (e.date_achieved AT TIME ZONE 'Europe/Paris')::date < wk.d::date + 7
  ) v ON true;

  -- Charge aiguë (7 jours) et chronique (moyenne hebdomadaire des 28 jours précédents)
  SELECT COALESCE(sum(CASE WHEN d > v_today - 7 THEN l END), 0),
         COALESCE(sum(CASE WHEN d > v_today - 28 THEN l END), 0) / 4.0,
         count(DISTINCT date_trunc('week', d::timestamp))
  INTO v_acute, v_chronic, v_load_weeks
  FROM (
    SELECT (w.date_prevue AT TIME ZONE 'Europe/Paris')::date AS d,
           (w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric AS l
    FROM public.workouts w
    WHERE w.athlete_id = p_athlete AND (v_uid = p_athlete OR w.coach_id = v_uid) AND w.status = 'completed'
      AND jsonb_typeof(w.measures->'rpe') = 'number' AND jsonb_typeof(w.measures->'duration_min') = 'number'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 28
  ) x;

  -- Le ratio n'a de sens qu'avec au moins 3 semaines de charge saisie sur les 4 dernières
  IF COALESCE(v_load_weeks, 0) < 3 THEN v_chronic := 0; END IF;

  -- Forme récente
  SELECT jsonb_build_object(
      'last_date', max(c.date), 'last_score', (array_agg(c.health_score ORDER BY c.date DESC))[1],
      'avg7', round(avg(c.health_score) FILTER (WHERE c.date > v_today - 7), 0),
      'fatigue7', round(avg(c.fatigue_level) FILTER (WHERE c.date > v_today - 7), 1),
      'checkins7', count(*) FILTER (WHERE c.date > v_today - 7))
  INTO v_form
  FROM public.check_ins c WHERE c.athlete_id = p_athlete AND c.date > v_today - 28;

  -- Records battus pendant les 14 derniers jours
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', date_achieved, 'label', label, 'value', value, 'unit', unit) ORDER BY date_achieved DESC), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT DISTINCT ON (label) date_achieved, label, value, unit FROM (
      SELECT e.date_achieved,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force'
                  THEN COALESCE(NULLIF(e.actual_extra->>'exercise', ''), NULLIF(e.planned_extra->>'exercise_name', ''), e.exercise_catalog_id, e.exercise_category)
                  ELSE e.actual_distance_m::numeric::text || ' m' || CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'c[oô]te' THEN ' (côte)' ELSE '' END END AS label,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force' THEN public._effort_weight(e) ELSE round(e.actual_time_ms / 1000.0, 2) END AS value,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force' THEN 'kg' ELSE 's' END AS unit
      FROM public._perf_efforts(p_athlete, v_uid) e
      WHERE e.is_pr AND e.date_achieved >= now() - interval '14 days'
    ) z ORDER BY label, CASE WHEN unit = 's' THEN value ELSE -value END, date_achieved DESC
  ) y;

  RETURN jsonb_build_object(
    'records', v_records,
    'series', v_series,
    'weekly', v_weekly,
    'recent_prs', v_recent,
    'load', jsonb_build_object(
      'acute', round(v_acute, 0), 'chronic', round(v_chronic, 0),
      'ratio', CASE WHEN v_chronic > 0 THEN round(v_acute / v_chronic, 2) END),
    'form', COALESCE(v_form, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_performance(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_alerts(p_team uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team AND t.coach_id = v_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH members AS (
    SELECT tm.user_id AS id,
           COALESCE(NULLIF(p.first_name, ''), split_part(COALESCE(p.full_name, 'Athlète'), ' ', 1)) AS name
    FROM public.team_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team AND tm.status = 'approved'
  ),
  latest AS (
    SELECT DISTINCT ON (c.athlete_id) c.athlete_id, c.date, c.health_score, c.pains
    FROM public.check_ins c JOIN members m ON m.id = c.athlete_id
    ORDER BY c.athlete_id, c.date DESC
  ),
  low_form AS (
    SELECT athlete_id AS id,
           jsonb_build_object('code', 'low_form', 'severity', CASE WHEN health_score < 40 THEN 'high' ELSE 'medium' END,
                              'label', 'Forme basse', 'detail', round(health_score)::text || '/100') AS r
    FROM latest WHERE date >= v_today - 1 AND health_score < 50
  ),
  pain AS (
    SELECT l.athlete_id AS id,
           jsonb_build_object('code', 'pain', 'severity', 'high', 'label', 'Douleur signalée',
                              'detail', COALESCE(pn->>'muscle_name', 'Zone') || ' ' || (pn->>'intensity') || '/10') AS r
    FROM latest l, jsonb_array_elements(CASE WHEN jsonb_typeof(l.pains) = 'array' THEN l.pains ELSE '[]'::jsonb END) pn
    WHERE l.date >= v_today - 1
      AND (pn->>'intensity') ~ '^[0-9]+$'
      AND ((pn->>'intensity')::int >= 7
           OR ((pn->>'intensity')::int >= 5 AND pn->>'type' IN ('Déchirure', 'Claquage', 'Articulaire', 'Élongation', 'Tendinite')))
  ),
  silent AS (
    SELECT m.id,
           jsonb_build_object('code', 'no_checkin', 'severity', 'medium', 'label', 'Pas de check-in',
                              'detail', 'depuis ' || (v_today - l.date)::text || ' j') AS r
    FROM members m JOIN latest l ON l.athlete_id = m.id
    WHERE l.date < v_today - 2
  ),
  missed AS (
    SELECT w.athlete_id AS id,
           jsonb_build_object('code', 'missed', 'severity', 'medium', 'label', 'Séances sans résultats',
                              'detail', count(*)::text || ' sur 14 j') AS r
    FROM public.workouts w JOIN members m ON m.id = w.athlete_id
    WHERE w.coach_id = v_uid AND COALESCE(w.measures->>'is_master', 'false') <> 'true'
      AND w.type_seance !~* 'repos|comp[ée]tition'
      AND w.status <> 'completed'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date < v_today
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date >= v_today - 14
    GROUP BY w.athlete_id HAVING count(*) >= 3
  ),
  load AS (
    SELECT x.id,
           jsonb_build_object('code', 'load', 'severity', 'medium', 'label', 'Charge très élevée',
                              'detail', 'ratio ' || replace(round(x.acute / x.chronic, 2)::text, '.', ',')) AS r
    FROM (
      SELECT w.athlete_id AS id,
             sum(CASE WHEN (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 7 THEN (w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric END) AS acute,
             sum((w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric) / 4.0 AS chronic
      FROM public.workouts w JOIN members m ON m.id = w.athlete_id
      WHERE w.coach_id = v_uid AND w.status = 'completed' AND jsonb_typeof(w.measures->'rpe') = 'number' AND jsonb_typeof(w.measures->'duration_min') = 'number'
        AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 28
      GROUP BY w.athlete_id
      HAVING count(DISTINCT date_trunc('week', (w.date_prevue AT TIME ZONE 'Europe/Paris')::date::timestamp)) >= 3
    ) x WHERE x.chronic > 0 AND x.acute / x.chronic > 1.5
  ),
  allr AS (
    SELECT * FROM low_form UNION ALL SELECT * FROM pain UNION ALL SELECT * FROM silent
    UNION ALL SELECT * FROM missed UNION ALL SELECT * FROM load
  )
  SELECT COALESCE(jsonb_agg(z.row_ ORDER BY z.sev DESC, z.name), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT m.id, m.name,
           bool_or(a.r->>'severity' = 'high') AS sev,
           jsonb_build_object(
             'athlete_id', m.id, 'name', m.name,
             'severity', CASE WHEN bool_or(a.r->>'severity' = 'high') THEN 'high' ELSE 'medium' END,
             'reasons', jsonb_agg(a.r)) AS row_
    FROM members m JOIN allr a ON a.id = m.id
    GROUP BY m.id, m.name
  ) z;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_alerts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_workout_results(p_workout_id uuid, p_efforts jsonb, p_measures jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_athlete_id UUID;
    v_effort JSONB;
BEGIN
    SELECT athlete_id INTO v_athlete_id FROM public.workouts WHERE id = p_workout_id;
    IF v_athlete_id IS NULL THEN RAISE EXCEPTION 'Workout not found'; END IF;
    IF v_athlete_id != auth.uid() THEN RAISE EXCEPTION 'Permission denied'; END IF;

    DELETE FROM public.athlete_efforts WHERE workout_id = p_workout_id;

    FOR v_effort IN SELECT * FROM jsonb_array_elements(p_efforts)
    LOOP
        INSERT INTO public.athlete_efforts (
            athlete_id, workout_id, exercise_catalog_id, date_achieved, 
            block_order, set_order, exercise_category, 
            planned_reps, planned_weight_kg, planned_distance_m, planned_time_ms, planned_rest_ms, planned_height_cm, planned_intensity, planned_extra,
            actual_reps, actual_weight_kg, actual_distance_m, actual_time_ms, actual_rest_ms, actual_height_cm, actual_intensity, actual_extra,
            is_pr, notes
        ) VALUES (
            v_athlete_id, p_workout_id, (v_effort->>'exercise_catalog_id')::TEXT, COALESCE((v_effort->>'date_achieved')::TIMESTAMPTZ, now()),
            (v_effort->>'block_order')::INT, (v_effort->>'set_order')::INT, v_effort->>'exercise_category',
            (v_effort->>'planned_reps')::INT, (v_effort->>'planned_weight_kg')::NUMERIC, (v_effort->>'planned_distance_m')::NUMERIC, (v_effort->>'planned_time_ms')::INT, (v_effort->>'planned_rest_ms')::INT, (v_effort->>'planned_height_cm')::NUMERIC, (v_effort->>'planned_intensity')::INT, v_effort->'planned_extra',
            (v_effort->>'actual_reps')::INT, (v_effort->>'actual_weight_kg')::NUMERIC, (v_effort->>'actual_distance_m')::NUMERIC, (v_effort->>'actual_time_ms')::INT, (v_effort->>'actual_rest_ms')::INT, (v_effort->>'actual_height_cm')::NUMERIC, (v_effort->>'actual_intensity')::INT, v_effort->'actual_extra',
            COALESCE((v_effort->>'is_pr')::BOOLEAN, false), v_effort->>'notes'
        );
    END LOOP;

    UPDATE public.workouts SET status = 'completed', measures = COALESCE(p_measures, measures) WHERE id = p_workout_id;

    -- Corriger une séance peut changer ce qui est un record dans les séances d'après
    UPDATE public.athlete_efforts e
    SET is_pr = public._effort_is_pr(e)
    WHERE e.athlete_id = v_athlete_id
      AND e.workout_id <> p_workout_id
      AND e.date_achieved >= (SELECT min(x.date_achieved) FROM public.athlete_efforts x WHERE x.workout_id = p_workout_id)
      AND e.is_pr IS DISTINCT FROM public._effort_is_pr(e);
END;
$function$;
