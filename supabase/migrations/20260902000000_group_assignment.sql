-- Migration for group assignments

-- 1. Add column
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS group_assignment_id UUID;

-- 2. Create RPC function
CREATE OR REPLACE FUNCTION assign_workout_to_group(
    p_workout_data JSONB,
    p_team_id UUID DEFAULT NULL,
    p_subgroup_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_assignment_id UUID;
    v_athlete_id UUID;
BEGIN
    -- Generate the shared assignment ID
    v_group_assignment_id := gen_random_uuid();
    
    -- Inject the shared ID into the JSON payload
    p_workout_data := jsonb_set(p_workout_data, '{group_assignment_id}', to_jsonb(v_group_assignment_id));
    p_workout_data := jsonb_set(p_workout_data, '{team_id}', to_jsonb(p_team_id));
    p_workout_data := jsonb_set(p_workout_data, '{subgroup_id}', to_jsonb(p_subgroup_id));

    IF p_subgroup_id IS NOT NULL THEN
        FOR v_athlete_id IN SELECT user_id FROM team_members WHERE subgroup_id = p_subgroup_id AND status = 'approved' LOOP
            p_workout_data := jsonb_set(p_workout_data, '{athlete_id}', to_jsonb(v_athlete_id));
            INSERT INTO workouts SELECT * FROM jsonb_populate_record(null::workouts, p_workout_data);
        END LOOP;
    ELSIF p_team_id IS NOT NULL THEN
        FOR v_athlete_id IN SELECT user_id FROM team_members WHERE team_id = p_team_id AND status = 'approved' LOOP
            p_workout_data := jsonb_set(p_workout_data, '{athlete_id}', to_jsonb(v_athlete_id));
            INSERT INTO workouts SELECT * FROM jsonb_populate_record(null::workouts, p_workout_data);
        END LOOP;
    ELSE
        RAISE EXCEPTION 'Either p_team_id or p_subgroup_id must be provided';
    END IF;

    RETURN v_group_assignment_id;
END;
$$;
