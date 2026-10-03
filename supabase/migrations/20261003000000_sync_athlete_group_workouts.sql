-- 20261003000000_sync_athlete_group_workouts.sql
-- Synchronisation automatique des séances d'équipe pour tout nouvel athlète ou lors d'un changement de sous-groupe

CREATE OR REPLACE FUNCTION sync_athlete_group_workouts(
    p_athlete_id UUID,
    p_team_id UUID,
    p_subgroup_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_inserted_count INT := 0;
    v_record RECORD;
BEGIN
    -- SÉCURITÉ: Vérifier l'authentification
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- SÉCURITÉ: Vérifier que l'appelant est bien le coach de l'équipe
    SELECT coach_id INTO v_coach_id FROM public.teams WHERE id = p_team_id;
    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RAISE EXCEPTION 'Forbidden: You are not the coach of this team';
    END IF;

    -- SÉCURITÉ: Vérifier que l'athlète fait bien partie de l'équipe et est approuvé
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE user_id = p_athlete_id AND team_id = p_team_id AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Athlete is not an approved member of this team';
    END IF;

    -- 1. Si un sous-groupe spécifique est défini : supprimer les séances futures d'autres sous-groupes (non encore réalisées)
    IF p_subgroup_id IS NOT NULL THEN
        DELETE FROM public.workouts 
        WHERE athlete_id = p_athlete_id 
          AND team_id = p_team_id 
          AND subgroup_id IS NOT NULL 
          AND subgroup_id != p_subgroup_id 
          AND status = 'pending' 
          AND date_prevue >= (now() - interval '2 hours');
    END IF;

    -- 2. Identifier les modèles de séances futures de l'équipe
    -- On prend un représentant unique par group_assignment_id (ou par date_prevue + type_seance)
    FOR v_record IN (
        WITH distinct_team_workouts AS (
            SELECT DISTINCT ON (COALESCE(group_assignment_id::text, date_prevue::text || '_' || type_seance))
                coach_id,
                team_id,
                subgroup_id,
                group_assignment_id,
                date_prevue,
                type_seance,
                blocks,
                exercises,
                intensity,
                description,
                measures
            FROM public.workouts
            WHERE team_id = p_team_id
              AND date_prevue >= (now() - interval '2 hours')
            ORDER BY COALESCE(group_assignment_id::text, date_prevue::text || '_' || type_seance), created_at DESC
        )
        SELECT * FROM distinct_team_workouts
    ) LOOP
        -- Si l'athlète a un sous-groupe précis : ne synchroniser que les séances communes (subgroup_id IS NULL) ou celles de son sous-groupe
        IF p_subgroup_id IS NOT NULL AND v_record.subgroup_id IS NOT NULL AND v_record.subgroup_id != p_subgroup_id THEN
            CONTINUE;
        END IF;

        -- Vérifier si l'athlète ne possède pas déjà cette séance
        IF NOT EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE athlete_id = p_athlete_id 
              AND (
                  (group_assignment_id IS NOT NULL AND group_assignment_id = v_record.group_assignment_id)
                  OR (date_prevue = v_record.date_prevue AND type_seance = v_record.type_seance)
              )
        ) THEN
            INSERT INTO public.workouts (
                athlete_id,
                coach_id,
                team_id,
                subgroup_id,
                group_assignment_id,
                date_prevue,
                type_seance,
                status,
                blocks,
                exercises,
                intensity,
                description,
                measures
            ) VALUES (
                p_athlete_id,
                v_record.coach_id,
                v_record.team_id,
                v_record.subgroup_id,
                v_record.group_assignment_id,
                v_record.date_prevue,
                v_record.type_seance,
                'pending',
                v_record.blocks,
                v_record.exercises,
                v_record.intensity,
                v_record.description,
                v_record.measures
            );
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN v_inserted_count;
END;
$$;
