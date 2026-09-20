-- MIGRATION: 20260920000000_sprint1_security_fixes.sql
-- DESCRIPTION: Regroupement des correctifs de sécurité critiques (Sprint 1)

-- 1. SECURISATION DU TRIGGER D'INSCRIPTION (Prévention des injections via search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilisateur'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. SECURISATION RPC : assign_workout_to_group (Auth + Authz coach_id)
CREATE OR REPLACE FUNCTION assign_workout_to_group(
    p_workout_data JSONB,
    p_team_id UUID DEFAULT NULL,
    p_subgroup_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_assignment_id UUID;
    v_athlete_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_team_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND coach_id = auth.uid()) THEN
            RAISE EXCEPTION 'Forbidden: You are not the coach of this team';
        END IF;
    END IF;

    IF p_subgroup_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.subgroups s 
            JOIN public.teams t ON s.team_id = t.id 
            WHERE s.id = p_subgroup_id AND t.coach_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Forbidden: You are not the coach of this subgroup';
        END IF;
    END IF;

    v_group_assignment_id := gen_random_uuid();
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

-- 3. SECURISATION RPC : submit_workout_results (Bypass NULL)
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
    IF auth.uid() IS NULL THEN 
        RAISE EXCEPTION 'Not authenticated'; 
    END IF;

    SELECT athlete_id INTO v_athlete_id FROM public.workouts WHERE id = p_workout_id;
    IF v_athlete_id IS NULL THEN RAISE EXCEPTION 'Workout not found'; END IF;
    
    IF v_athlete_id IS DISTINCT FROM auth.uid() THEN 
        RAISE EXCEPTION 'Permission denied'; 
    END IF;

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

-- 4. ANTI-ESPIONNAGE CHAT : conversation_participants
DROP POLICY IF EXISTS "Users can insert participants if they are coach or self" ON public.conversation_participants;
CREATE POLICY "Users can insert participants if they are coach or self"
ON public.conversation_participants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.teams t ON c.team_id = t.id
        WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    OR
    (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.team_members tm ON c.team_id = tm.team_id
            WHERE c.id = conversation_id AND tm.user_id = auth.uid() AND tm.status = 'approved'
        )
    )
    OR
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR
    (
        user_id = auth.uid() AND
        NOT EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
        )
    )
);

-- 5. DEBLOCAGE DES FONCTIONNALITES (RLS manquantes)
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
CREATE POLICY "teams_insert_policy" ON public.teams FOR INSERT WITH CHECK (coach_id = auth.uid());
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
CREATE POLICY "teams_update_policy" ON public.teams FOR UPDATE USING (coach_id = auth.uid());
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
CREATE POLICY "teams_delete_policy" ON public.teams FOR DELETE USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "subgroups_insert_policy" ON public.subgroups;
CREATE POLICY "subgroups_insert_policy" ON public.subgroups FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);
DROP POLICY IF EXISTS "subgroups_update_policy" ON public.subgroups;
CREATE POLICY "subgroups_update_policy" ON public.subgroups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);
DROP POLICY IF EXISTS "subgroups_delete_policy" ON public.subgroups;
CREATE POLICY "subgroups_delete_policy" ON public.subgroups FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);

DROP POLICY IF EXISTS "checkins_insert_policy" ON public.check_ins;
CREATE POLICY "checkins_insert_policy" ON public.check_ins FOR INSERT WITH CHECK (athlete_id = auth.uid());
DROP POLICY IF EXISTS "checkins_update_policy" ON public.check_ins;
CREATE POLICY "checkins_update_policy" ON public.check_ins FOR UPDATE USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "saved_meals_select_policy" ON public.saved_meals;
CREATE POLICY "saved_meals_select_policy" ON public.saved_meals FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_meals_insert_policy" ON public.saved_meals;
CREATE POLICY "saved_meals_insert_policy" ON public.saved_meals FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_meals_update_policy" ON public.saved_meals;
CREATE POLICY "saved_meals_update_policy" ON public.saved_meals FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_meals_delete_policy" ON public.saved_meals;
CREATE POLICY "saved_meals_delete_policy" ON public.saved_meals FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_meal_items_select_policy" ON public.saved_meal_items;
CREATE POLICY "saved_meal_items_select_policy" ON public.saved_meal_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.saved_meals WHERE id = saved_meal_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "saved_meal_items_insert_policy" ON public.saved_meal_items;
CREATE POLICY "saved_meal_items_insert_policy" ON public.saved_meal_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.saved_meals WHERE id = saved_meal_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "saved_meal_items_update_policy" ON public.saved_meal_items;
CREATE POLICY "saved_meal_items_update_policy" ON public.saved_meal_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.saved_meals WHERE id = saved_meal_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "saved_meal_items_delete_policy" ON public.saved_meal_items;
CREATE POLICY "saved_meal_items_delete_policy" ON public.saved_meal_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.saved_meals WHERE id = saved_meal_id AND user_id = auth.uid())
);
