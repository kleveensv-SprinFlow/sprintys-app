-- Records : vrais noms d'exercices (jamais un code « ex0002 »), résultat faux masquable, répétitions avec la charge.
-- Rien n'est supprimé : un résultat masqué reste dans la séance, il ne compte plus dans les records et la progression.

ALTER TABLE public.athlete_efforts ADD COLUMN IF NOT EXISTS hidden_from_records boolean NOT NULL DEFAULT false;

-- Les résultats masqués sortent des statistiques de performance
CREATE OR REPLACE FUNCTION public._perf_efforts(p_athlete uuid, p_viewer uuid)
 RETURNS SETOF athlete_efforts
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.* FROM public.athlete_efforts e
  WHERE e.athlete_id = p_athlete
    AND NOT e.hidden_from_records
    AND (p_viewer = p_athlete OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = e.workout_id AND w.coach_id = p_viewer))
$function$;

-- Nom affiché d'un exercice : catalogue, puis exercice du coach, puis nom saisi, puis catégorie
CREATE OR REPLACE FUNCTION public._effort_label(e public.athlete_efforts)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(c.name_fr, '') FROM public.exercises_catalog c WHERE c.id::text = e.exercise_catalog_id),
    (SELECT NULLIF(x.name, '') FROM public.coach_exercises x WHERE x.id::text = e.exercise_catalog_id),
    NULLIF(e.actual_extra->>'exercise', ''),
    NULLIF(e.planned_extra->>'exercise_name', ''),
    NULLIF(e.exercise_category, ''),
    'Exercice'
  )
$function$;

-- Masquer / réafficher un résultat (l'athlète lui-même ou le coach de la séance)
CREATE OR REPLACE FUNCTION public.set_effort_hidden(p_effort uuid, p_hidden boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.athlete_efforts e SET hidden_from_records = COALESCE(p_hidden, true)
  WHERE e.id = p_effort
    AND (e.athlete_id = v_uid OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = e.workout_id AND w.coach_id = v_uid));
  IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
END;
$function$;

-- Réafficher tous les résultats masqués d'un athlète (visibles par l'appelant)
CREATE OR REPLACE FUNCTION public.restore_hidden_efforts(p_athlete uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_n integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.athlete_efforts e SET hidden_from_records = false
  WHERE e.athlete_id = p_athlete AND e.hidden_from_records
    AND (v_uid = p_athlete OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = e.workout_id AND w.coach_id = v_uid));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_effort_hidden(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_hidden_efforts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_effort_hidden(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_hidden_efforts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_athlete_performance(p_athlete uuid, p_weeks integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_hidden int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_uid <> p_athlete AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_athlete AND tm.status = 'approved' AND t.coach_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_week0 := date_trunc('week', v_today::timestamp)::date - (v_weeks - 1) * 7;

  -- Records : meilleur chrono par distance et terrain, meilleure charge par exercice (à charge égale, plus de répétitions)
  WITH base AS (
    SELECT e.*, lower(COALESCE(e.exercise_category, '')) AS cat FROM public._perf_efforts(p_athlete, v_uid) e
  ),
  course AS (
    SELECT id, actual_distance_m::numeric AS d,
           CASE WHEN cat ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END AS surf,
           actual_time_ms AS t, date_achieved, is_pr
    FROM base WHERE actual_time_ms > 0 AND actual_distance_m > 0 AND cat !~ 'muscu|force|escalier|stair'
  ),
  course_best AS (
    SELECT DISTINCT ON (d, surf) id, d, surf, t, date_achieved, is_pr,
           count(*) OVER (PARTITION BY d, surf) AS n
    FROM course ORDER BY d, surf, t ASC, date_achieved DESC
  ),
  muscu AS (
    SELECT b.id, public._effort_exercise_key(b) AS k,
           public._effort_label(b) AS label,
           public._effort_weight(b) AS kg, b.actual_reps, b.date_achieved, b.is_pr
    FROM public._perf_efforts(p_athlete, v_uid) b
    WHERE lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(b.actual_extra->>'repsOk', 'true') <> 'false'
  ),
  muscu_best AS (
    SELECT DISTINCT ON (k) id, k, label, kg, actual_reps, date_achieved, is_pr, count(*) OVER (PARTITION BY k) AS n
    FROM muscu WHERE kg > 0 ORDER BY k, kg DESC, actual_reps DESC NULLS LAST, date_achieved DESC
  )
  SELECT COALESCE(jsonb_agg(r ORDER BY ord, sort2), '[]'::jsonb) INTO v_records FROM (
    SELECT 1 AS ord, d AS sort2, jsonb_build_object(
        'kind', 'course', 'key', 'c' || d::text || surf, 'label', d::text || ' m' || CASE WHEN surf = 'cote' THEN ' (côte)' ELSE '' END,
        'value', round(t / 1000.0, 2), 'unit', 's', 'distance_m', d, 'surface', surf,
        'date', date_achieved, 'count', n, 'effort_id', id,
        'recent_pr', date_achieved >= now() - interval '14 days' AND is_pr) AS r
    FROM course_best
    UNION ALL
    SELECT 2, 0, jsonb_build_object(
        'kind', 'muscu', 'key', 'm' || k, 'label', label, 'value', kg, 'unit', 'kg', 'reps', actual_reps,
        'date', date_achieved, 'count', n, 'effort_id', id,
        'recent_pr', date_achieved >= now() - interval '14 days' AND is_pr)
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
           min(public._effort_label(b)),
           'kg', 'higher', (b.date_achieved AT TIME ZONE 'Europe/Paris')::date,
           max(public._effort_weight(b))
    FROM public._perf_efforts(p_athlete, v_uid) b
    WHERE lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(b.actual_extra->>'repsOk', 'true') <> 'false'
      AND public._effort_weight(b) > 0
    GROUP BY 1, 5
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
      'date', date_achieved, 'label', label, 'value', value, 'unit', unit, 'reps', reps) ORDER BY date_achieved DESC), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT DISTINCT ON (label) date_achieved, label, value, unit, reps FROM (
      SELECT e.date_achieved,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force'
                  THEN public._effort_label(e)
                  ELSE e.actual_distance_m::numeric::text || ' m' || CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'c[oô]te' THEN ' (côte)' ELSE '' END END AS label,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force' THEN public._effort_weight(e) ELSE round(e.actual_time_ms / 1000.0, 2) END AS value,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force' THEN 'kg' ELSE 's' END AS unit,
             CASE WHEN lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force' THEN e.actual_reps END AS reps
      FROM public._perf_efforts(p_athlete, v_uid) e
      WHERE e.is_pr AND e.date_achieved >= now() - interval '14 days'
    ) z ORDER BY label, CASE WHEN unit = 's' THEN value ELSE -value END, reps DESC NULLS LAST, date_achieved DESC
  ) y;

  -- Résultats masqués (pour pouvoir les réafficher)
  SELECT count(*) INTO v_hidden FROM public.athlete_efforts e
  WHERE e.athlete_id = p_athlete AND e.hidden_from_records
    AND (v_uid = p_athlete OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = e.workout_id AND w.coach_id = v_uid));

  RETURN jsonb_build_object(
    'records', v_records,
    'series', v_series,
    'weekly', v_weekly,
    'recent_prs', v_recent,
    'hidden_count', COALESCE(v_hidden, 0),
    'load', jsonb_build_object(
      'acute', round(v_acute, 0), 'chronic', round(v_chronic, 0),
      'ratio', CASE WHEN v_chronic > 0 THEN round(v_acute / v_chronic, 2) END),
    'form', COALESCE(v_form, '{}'::jsonb)
  );
END;
$function$;
