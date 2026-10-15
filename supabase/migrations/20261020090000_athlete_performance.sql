-- 20261020090000_athlete_performance.sql
-- Suivi de performance : records (is_pr), RPE de séance (measures.rpe, measures.duration_min) et résumé unique
-- get_athlete_performance(), lu par l'athlète (écran « Progression ») et par son coach (fiche athlète).
-- Rien d'existant n'est supprimé : is_pr valait toujours false, il est calculé ici (insertion + rattrapage).

-- ------------------------------------------------------------------ 1. Records
-- Famille d'un résultat : course (piste/côte, par distance) ou musculation (par exercice).
CREATE OR REPLACE FUNCTION public._effort_weight(e public.athlete_efforts)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    e.actual_weight_kg,
    CASE WHEN e.actual_extra->>'weight' ~ '^[0-9]+([.][0-9]+)?$' THEN (e.actual_extra->>'weight')::numeric END
  )
$$;

CREATE OR REPLACE FUNCTION public._effort_exercise_key(e public.athlete_efforts)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(COALESCE(NULLIF(e.exercise_catalog_id, ''), e.actual_extra->>'exercise', e.planned_extra->>'exercise_name', e.exercise_category, ''))
$$;

-- Vrai si le résultat bat tout ce que l'athlète avait fait avant, dans une autre séance (jamais le tout premier).
CREATE OR REPLACE FUNCTION public._effort_is_pr(e public.athlete_efforts)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cat text := lower(COALESCE(e.exercise_category, ''));
  surf text;
  prev numeric;
  w numeric;
BEGIN
  IF cat ~ 'escalier|stair' THEN RETURN false; END IF;

  IF cat ~ 'muscu|force' THEN
    w := public._effort_weight(e);
    IF w IS NULL OR w <= 0 OR COALESCE(e.actual_extra->>'repsOk', 'true') = 'false' THEN RETURN false; END IF;
    SELECT max(public._effort_weight(p)) INTO prev
    FROM public.athlete_efforts p
    WHERE p.athlete_id = e.athlete_id
      AND p.workout_id IS DISTINCT FROM e.workout_id
      AND p.date_achieved <= e.date_achieved
      AND lower(COALESCE(p.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(p.actual_extra->>'repsOk', 'true') <> 'false'
      AND public._effort_exercise_key(p) = public._effort_exercise_key(e);
    RETURN prev IS NOT NULL AND w > prev;
  END IF;

  IF e.actual_time_ms IS NULL OR e.actual_time_ms <= 0 OR COALESCE(e.actual_distance_m, 0) <= 0 THEN RETURN false; END IF;
  surf := CASE WHEN cat ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END;
  SELECT min(p.actual_time_ms) INTO prev
  FROM public.athlete_efforts p
  WHERE p.athlete_id = e.athlete_id
    AND p.workout_id IS DISTINCT FROM e.workout_id
    AND p.date_achieved <= e.date_achieved
    AND p.actual_time_ms > 0
    AND p.actual_distance_m = e.actual_distance_m
    AND lower(COALESCE(p.exercise_category, '')) !~ 'muscu|force|escalier|stair'
    AND (CASE WHEN lower(COALESCE(p.exercise_category, '')) ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END) = surf;
  RETURN prev IS NOT NULL AND e.actual_time_ms < prev;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_effort_pr()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_pr := public._effort_is_pr(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_effort_pr ON public.athlete_efforts;
CREATE TRIGGER trg_set_effort_pr
  BEFORE INSERT ON public.athlete_efforts
  FOR EACH ROW EXECUTE FUNCTION public.set_effort_pr();

-- Rattrapage de l'historique (is_pr valait toujours false)
UPDATE public.athlete_efforts e SET is_pr = public._effort_is_pr(e)
WHERE e.is_pr IS DISTINCT FROM public._effort_is_pr(e);

-- Index pour les comparaisons ci-dessus
CREATE INDEX IF NOT EXISTS athlete_efforts_athlete_date_idx ON public.athlete_efforts (athlete_id, date_achieved);

-- ------------------------------------------------------------------ 2. Résumé de performance
-- Lisible par l'athlète lui-même et par son coach (membre approuvé de son équipe).
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
    SELECT e.*, lower(COALESCE(e.exercise_category, '')) AS cat FROM public.athlete_efforts e WHERE e.athlete_id = p_athlete
  ),
  course AS (
    SELECT actual_distance_m::numeric AS d,
           CASE WHEN cat ~ 'c[oô]te' THEN 'cote' ELSE 'piste' END AS surf,
           actual_time_ms AS t, date_achieved, is_pr
    FROM base WHERE actual_time_ms > 0 AND actual_distance_m > 0 AND cat !~ 'muscu|force|escalier|stair'
  ),
  course_best AS (
    SELECT DISTINCT ON (d, surf) d, surf, t, date_achieved,
           count(*) OVER (PARTITION BY d, surf) AS n
    FROM course ORDER BY d, surf, t ASC, date_achieved DESC
  ),
  muscu AS (
    SELECT public._effort_exercise_key(b) AS k,
           COALESCE(NULLIF(b.actual_extra->>'exercise', ''), NULLIF(b.planned_extra->>'exercise_name', ''), b.exercise_catalog_id, b.exercise_category) AS label,
           public._effort_weight(b) AS kg, b.actual_reps, b.date_achieved
    FROM public.athlete_efforts b
    WHERE b.athlete_id = p_athlete AND lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(b.actual_extra->>'repsOk', 'true') <> 'false'
  ),
  muscu_best AS (
    SELECT DISTINCT ON (k) k, label, kg, date_achieved, count(*) OVER (PARTITION BY k) AS n
    FROM muscu WHERE kg > 0 ORDER BY k, kg DESC, date_achieved DESC
  )
  SELECT COALESCE(jsonb_agg(r ORDER BY ord, sort2), '[]'::jsonb) INTO v_records FROM (
    SELECT 1 AS ord, d AS sort2, jsonb_build_object(
        'kind', 'course', 'key', 'c' || d::text || surf, 'label', d::text || ' m' || CASE WHEN surf = 'cote' THEN ' (côte)' ELSE '' END,
        'value', round(t / 1000.0, 2), 'unit', 's', 'distance_m', d, 'surface', surf,
        'date', date_achieved, 'count', n,
        'recent_pr', date_achieved >= now() - interval '14 days' AND n > 1) AS r
    FROM course_best
    UNION ALL
    SELECT 2, 0, jsonb_build_object(
        'kind', 'muscu', 'key', 'm' || k, 'label', label, 'value', kg, 'unit', 'kg',
        'date', date_achieved, 'count', n, 'recent_pr', date_achieved >= now() - interval '14 days' AND n > 1)
    FROM muscu_best
  ) q;

  -- Progression : meilleur résultat de chaque jour (12 derniers jours d'entraînement), 4 séries les plus fournies
  WITH base AS (
    SELECT e.*, lower(COALESCE(e.exercise_category, '')) AS cat FROM public.athlete_efforts e WHERE e.athlete_id = p_athlete
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
    FROM public.athlete_efforts b
    WHERE b.athlete_id = p_athlete AND lower(COALESCE(b.exercise_category, '')) ~ 'muscu|force'
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
    WHERE w.athlete_id = p_athlete AND COALESCE(w.measures->>'is_master', 'false') <> 'true'
      AND w.type_seance !~* 'repos'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date >= wk.d::date
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date < wk.d::date + 7
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date <= v_today
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT sum(e.actual_distance_m) AS run_m
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete AND e.actual_time_ms > 0 AND e.actual_distance_m > 0
      AND (e.date_achieved AT TIME ZONE 'Europe/Paris')::date >= wk.d::date
      AND (e.date_achieved AT TIME ZONE 'Europe/Paris')::date < wk.d::date + 7
  ) v ON true;

  -- Charge aiguë (7 jours) et chronique (moyenne hebdomadaire des 28 jours précédents)
  SELECT COALESCE(sum(CASE WHEN d > v_today - 7 THEN l END), 0),
         COALESCE(sum(CASE WHEN d > v_today - 28 THEN l END), 0) / 4.0
  INTO v_acute, v_chronic
  FROM (
    SELECT (w.date_prevue AT TIME ZONE 'Europe/Paris')::date AS d,
           (w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric AS l
    FROM public.workouts w
    WHERE w.athlete_id = p_athlete AND w.status = 'completed'
      AND jsonb_typeof(w.measures->'rpe') = 'number' AND jsonb_typeof(w.measures->'duration_min') = 'number'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 28
  ) x;

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
      FROM public.athlete_efforts e
      WHERE e.athlete_id = p_athlete AND e.is_pr AND e.date_achieved >= now() - interval '14 days'
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
