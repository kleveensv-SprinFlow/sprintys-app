-- MIGRATION: 20260920000001_sprint1_part2_security_fixes.sql
-- DESCRIPTION: Suite et fin du Sprint 1 (Tables sans RLS + Data Leak RPC)

-- 1. SECURISATION DES TABLES COMPLETEMENT OUVERTES
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- competitions : seul les coachs de la team peuvent insérer/modifier
CREATE POLICY "competitions_select_policy" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "competitions_insert_policy" ON public.competitions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);
CREATE POLICY "competitions_update_policy" ON public.competitions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);
CREATE POLICY "competitions_delete_policy" ON public.competitions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND coach_id = auth.uid())
);

-- competition_participants : les athlètes s'inscrivent, ou les coachs de la compétition
CREATE POLICY "competition_participants_select_policy" ON public.competition_participants FOR SELECT USING (true);
CREATE POLICY "competition_participants_insert_policy" ON public.competition_participants FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.competitions c 
        JOIN public.teams t ON c.team_id = t.id 
        WHERE c.id = competition_id AND t.coach_id = auth.uid()
    )
);
CREATE POLICY "competition_participants_delete_policy" ON public.competition_participants FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.competitions c 
        JOIN public.teams t ON c.team_id = t.id 
        WHERE c.id = competition_id AND t.coach_id = auth.uid()
    )
);

-- workout_templates : réservé au coach créateur
CREATE POLICY "workout_templates_select_policy" ON public.workout_templates FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "workout_templates_insert_policy" ON public.workout_templates FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "workout_templates_update_policy" ON public.workout_templates FOR UPDATE USING (coach_id = auth.uid());
CREATE POLICY "workout_templates_delete_policy" ON public.workout_templates FOR DELETE USING (coach_id = auth.uid());

-- 2. CORRECTION DE LA FUITE DE DONNEES DE PERFORMANCE (get_workout_degradation)
CREATE OR REPLACE FUNCTION public.get_workout_degradation(p_athlete_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
    workout_id UUID,
    workout_date TIMESTAMPTZ,
    exercise_category TEXT,
    distance_m NUMERIC,
    best_time_ms INT,
    worst_time_ms INT,
    degradation_percentage NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    -- Securité anti-fuite : On retourne les lignes UNIQUEMENT SI 
    -- 1) l'utilisateur est lui-même
    -- 2) OU s'il est un coach qui gère cet athlète
    SELECT 
        e.workout_id,
        MIN(e.date_achieved) as workout_date,
        e.exercise_category,
        e.actual_distance_m as distance_m,
        MIN(e.actual_time_ms) as best_time_ms,
        MAX(e.actual_time_ms) as worst_time_ms,
        ROUND(
            (MAX(e.actual_time_ms) - MIN(e.actual_time_ms))::NUMERIC / NULLIF(MIN(e.actual_time_ms), 0) * 100
        , 2) as degradation_percentage
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete_id 
      AND e.exercise_category = 'run'
      AND e.actual_time_ms IS NOT NULL
      AND e.actual_distance_m IS NOT NULL
      AND (
          auth.uid() = p_athlete_id 
          OR EXISTS (
              SELECT 1 FROM public.team_members tm
              JOIN public.teams t ON tm.team_id = t.id
              WHERE tm.user_id = p_athlete_id AND tm.status = 'approved' AND t.coach_id = auth.uid()
          )
      )
    GROUP BY e.workout_id, e.exercise_category, e.actual_distance_m
    HAVING COUNT(e.actual_time_ms) > 1
    ORDER BY MIN(e.date_achieved) DESC
    LIMIT p_limit;
$$;

-- 3. RPC SUPPRESSION DE COMPTE (Obligatoire Stores)
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    -- Delete from auth.users (cascade will handle profiles, etc.)
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
