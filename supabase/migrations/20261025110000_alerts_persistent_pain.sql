-- 20261025110000_alerts_persistent_pain.sql
-- « À surveiller » (get_team_alerts) :
--  * le détail d'une douleur forte précise le côté (« Genoux gauche 8/10 ») ;
--  * nouvelle raison « Douleur qui dure » : même zone ET même côté signalés au moins 3 jours sur les 7
--    derniers (même règle que src/features/checkin/painHistory.ts). Grave si elle a atteint 7/10.
-- Reprend la version de 20261022090000_perf_alerts_fixes.sql pour le reste.

CREATE OR REPLACE FUNCTION public._pain_zone_label(pn jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(pn->>'muscle_name', ''), NULLIF(pn->>'muscle_id', ''), 'Zone')
    || CASE WHEN pn->>'side' IN ('Gauche', 'Droit') THEN ' ' || lower(pn->>'side')
            WHEN pn->>'side' = 'Bilatéral' THEN ' (2 côtés)' ELSE '' END
$$;
REVOKE EXECUTE ON FUNCTION public._pain_zone_label(jsonb) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_team_alerts(p_team uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
           jsonb_build_object('code', 'pain', 'severity', 'high', 'label', 'Douleur forte',
                              'detail', public._pain_zone_label(pn) || ' ' || (pn->>'intensity') || '/10') AS r
    FROM latest l, jsonb_array_elements(CASE WHEN jsonb_typeof(l.pains) = 'array' THEN l.pains ELSE '[]'::jsonb END) pn
    WHERE l.date >= v_today - 1
      AND (pn->>'intensity') ~ '^[0-9]+$'
      AND ((pn->>'intensity')::int >= 7
           OR ((pn->>'intensity')::int >= 5 AND pn->>'type' IN ('Déchirure', 'Claquage', 'Articulaire', 'Élongation', 'Tendinite')))
  ),
  persistent AS (
    SELECT x.id,
           jsonb_build_object('code', 'pain_persistent', 'severity', CASE WHEN x.mx >= 7 THEN 'high' ELSE 'medium' END,
                              'label', 'Douleur qui dure', 'detail', x.zone || ' · ' || x.days::text || ' j sur 7') AS r
    FROM (
      SELECT c.athlete_id AS id,
             public._pain_zone_label(pn) AS zone,
             count(DISTINCT c.date) AS days,
             max(CASE WHEN (pn->>'intensity') ~ '^[0-9]+$' THEN (pn->>'intensity')::int END) AS mx
      FROM public.check_ins c
      JOIN members m ON m.id = c.athlete_id,
      jsonb_array_elements(CASE WHEN jsonb_typeof(c.pains) = 'array' THEN c.pains ELSE '[]'::jsonb END) pn
      WHERE c.date > v_today - 7
      GROUP BY c.athlete_id, public._pain_zone_label(pn)
      HAVING count(DISTINCT c.date) >= 3
    ) x
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
    SELECT * FROM low_form UNION ALL SELECT * FROM pain UNION ALL SELECT * FROM persistent UNION ALL SELECT * FROM silent
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
$function$;
