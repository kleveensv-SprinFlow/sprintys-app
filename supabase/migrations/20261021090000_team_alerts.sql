-- 20261021090000_team_alerts.sql
-- « À surveiller » : athlètes de l'équipe qui méritent l'attention du coach aujourd'hui.
-- Lecture seule, réservée au coach de l'équipe. Les raisons sont des faits chiffrés, pas un diagnostic.

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
    WHERE COALESCE(w.measures->>'is_master', 'false') <> 'true'
      AND w.type_seance !~* 'repos|comp[ée]tition'
      AND w.status <> 'completed'
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date < v_today
      AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date >= v_today - 14
    GROUP BY w.athlete_id HAVING count(*) >= 3
  ),
  load AS (
    SELECT x.id,
           jsonb_build_object('code', 'load', 'severity', 'medium', 'label', 'Charge élevée',
                              'detail', 'ratio ' || replace(round(x.acute / x.chronic, 2)::text, '.', ',')) AS r
    FROM (
      SELECT w.athlete_id AS id,
             sum(CASE WHEN (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 7 THEN (w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric END) AS acute,
             sum((w.measures->>'rpe')::numeric * (w.measures->>'duration_min')::numeric) / 4.0 AS chronic
      FROM public.workouts w JOIN members m ON m.id = w.athlete_id
      WHERE w.status = 'completed' AND jsonb_typeof(w.measures->'rpe') = 'number' AND jsonb_typeof(w.measures->'duration_min') = 'number'
        AND (w.date_prevue AT TIME ZONE 'Europe/Paris')::date > v_today - 28
      GROUP BY w.athlete_id
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
