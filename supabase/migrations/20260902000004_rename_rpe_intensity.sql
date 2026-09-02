ALTER TABLE public.athlete_efforts RENAME COLUMN rpe TO actual_intensity;
ALTER TABLE public.athlete_efforts ADD COLUMN planned_intensity INT;

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
END;
$function$;

DROP VIEW IF EXISTS public.athlete_session_stats;
CREATE VIEW public.athlete_session_stats WITH (security_invoker = true) AS
SELECT 
    e.athlete_id, e.workout_id, w.date_prevue as workout_date, w.type_seance,
    COUNT(*) as total_planned_sets,
    SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END) as total_completed_sets,
    ROUND((SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as adherence_percentage,
    SUM(COALESCE(e.actual_weight_kg * COALESCE(e.actual_reps, 1), 0)) as total_volume_kg,
    SUM(COALESCE(e.actual_distance_m, 0)) as total_distance_m,
    ROUND(AVG(e.actual_intensity), 1) as avg_intensity
FROM public.athlete_efforts e
JOIN public.workouts w ON e.workout_id = w.id
GROUP BY e.athlete_id, e.workout_id, w.date_prevue, w.type_seance;
