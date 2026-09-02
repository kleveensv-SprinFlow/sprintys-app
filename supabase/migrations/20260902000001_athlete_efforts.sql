-- 20260902000001_athlete_efforts.sql

CREATE TABLE public.athlete_efforts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    exercise_catalog_id TEXT REFERENCES public.exercises_catalog(id) ON DELETE SET NULL,
    
    date_achieved TIMESTAMPTZ DEFAULT now(),
    block_order INT NOT NULL,
    set_order INT NOT NULL,
    exercise_category VARCHAR(50), 
    
    -- NATIVE METRICS (Strict)
    planned_reps INT,
    planned_weight_kg NUMERIC,
    planned_distance_m NUMERIC,
    planned_time_ms INT,
    planned_rest_ms INT,
    planned_height_cm NUMERIC,
    
    actual_reps INT,
    actual_weight_kg NUMERIC,
    actual_distance_m NUMERIC,
    actual_time_ms INT,
    actual_rest_ms INT,
    actual_height_cm NUMERIC,

    -- EXTRA METRICS (Future proof)
    planned_extra JSONB,
    actual_extra JSONB,
    
    rpe INT CHECK (rpe >= 1 AND rpe <= 10),
    is_pr BOOLEAN DEFAULT false,
    notes TEXT
);

-- INDEXES
CREATE INDEX idx_athlete_efforts_athlete_exercise ON public.athlete_efforts(athlete_id, exercise_catalog_id, date_achieved);
CREATE INDEX idx_athlete_efforts_workout ON public.athlete_efforts(workout_id);
CREATE INDEX idx_athlete_efforts_category ON public.athlete_efforts(athlete_id, exercise_category, date_achieved);

-- RLS
ALTER TABLE public.athlete_efforts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete_efforts_select_policy" ON public.athlete_efforts
FOR SELECT USING (
    athlete_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = athlete_efforts.workout_id AND w.coach_id = auth.uid())
);

-- RPC for Atomic Submission
CREATE OR REPLACE FUNCTION submit_workout_results(
    p_workout_id UUID,
    p_efforts JSONB,
    p_measures JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_athlete_id UUID;
    v_effort JSONB;
BEGIN
    -- 1. Ownership Audit
    SELECT athlete_id INTO v_athlete_id FROM public.workouts WHERE id = p_workout_id;
    IF v_athlete_id IS NULL THEN
        RAISE EXCEPTION 'Workout not found';
    END IF;
    IF v_athlete_id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied: Not the athlete of this workout';
    END IF;

    -- 2. Idempotent cleanup for this specific workout
    DELETE FROM public.athlete_efforts WHERE workout_id = p_workout_id;

    -- 3. Insert efforts
    FOR v_effort IN SELECT * FROM jsonb_array_elements(p_efforts)
    LOOP
        INSERT INTO public.athlete_efforts (
            athlete_id, workout_id, exercise_catalog_id, date_achieved, 
            block_order, set_order, exercise_category, 
            planned_reps, planned_weight_kg, planned_distance_m, planned_time_ms, planned_rest_ms, planned_height_cm, planned_extra,
            actual_reps, actual_weight_kg, actual_distance_m, actual_time_ms, actual_rest_ms, actual_height_cm, actual_extra,
            rpe, is_pr, notes
        ) VALUES (
            v_athlete_id, p_workout_id, (v_effort->>'exercise_catalog_id')::TEXT, COALESCE((v_effort->>'date_achieved')::TIMESTAMPTZ, now()),
            (v_effort->>'block_order')::INT, (v_effort->>'set_order')::INT, v_effort->>'exercise_category',
            (v_effort->>'planned_reps')::INT, (v_effort->>'planned_weight_kg')::NUMERIC, (v_effort->>'planned_distance_m')::NUMERIC, (v_effort->>'planned_time_ms')::INT, (v_effort->>'planned_rest_ms')::INT, (v_effort->>'planned_height_cm')::NUMERIC, v_effort->'planned_extra',
            (v_effort->>'actual_reps')::INT, (v_effort->>'actual_weight_kg')::NUMERIC, (v_effort->>'actual_distance_m')::NUMERIC, (v_effort->>'actual_time_ms')::INT, (v_effort->>'actual_rest_ms')::INT, (v_effort->>'actual_height_cm')::NUMERIC, v_effort->'actual_extra',
            (v_effort->>'rpe')::INT, COALESCE((v_effort->>'is_pr')::BOOLEAN, false), v_effort->>'notes'
        );
    END LOOP;

    -- 4. Mark workout as completed and optionally update measures
    UPDATE public.workouts 
    SET status = 'completed',
        measures = COALESCE(p_measures, measures)
    WHERE id = p_workout_id;
END;
$$;
