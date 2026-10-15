-- 20261024110000_submit_keeps_coach_feedback.sql
-- La réponse du coach n'est jamais écrasée quand l'athlète (re)valide sa séance.

CREATE OR REPLACE FUNCTION public.submit_workout_results(p_workout_id uuid, p_efforts jsonb, p_measures jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

    UPDATE public.workouts SET status = 'completed', measures = CASE
        WHEN p_measures IS NULL THEN measures
        -- The coach's answer belongs to the coach: an athlete re-validating (even from an older copy) never erases it
        WHEN measures ? 'coach_feedback' THEN (p_measures - 'coach_feedback') || jsonb_build_object('coach_feedback', measures->'coach_feedback')
        ELSE p_measures - 'coach_feedback'
      END
    WHERE id = p_workout_id;

    -- Corriger une séance peut changer ce qui est un record dans les séances d'après
    UPDATE public.athlete_efforts e
    SET is_pr = public._effort_is_pr(e)
    WHERE e.athlete_id = v_athlete_id
      AND e.workout_id <> p_workout_id
      AND e.date_achieved >= (SELECT min(x.date_achieved) FROM public.athlete_efforts x WHERE x.workout_id = p_workout_id)
      AND e.is_pr IS DISTINCT FROM public._effort_is_pr(e);
END;
$function$;

-- Seul le coach de la séance (ou le service) peut modifier la réponse du coach, même par une mise à jour directe
CREATE OR REPLACE FUNCTION public.guard_coach_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.coach_id
     AND (NEW.measures->'coach_feedback') IS DISTINCT FROM (OLD.measures->'coach_feedback') THEN
    IF OLD.measures ? 'coach_feedback' THEN
      NEW.measures := COALESCE(NEW.measures, '{}'::jsonb) || jsonb_build_object('coach_feedback', OLD.measures->'coach_feedback');
    ELSE
      NEW.measures := COALESCE(NEW.measures, '{}'::jsonb) - 'coach_feedback';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_coach_feedback ON public.workouts;
CREATE TRIGGER trg_guard_coach_feedback BEFORE UPDATE OF measures ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.guard_coach_feedback();
