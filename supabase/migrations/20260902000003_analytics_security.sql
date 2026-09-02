-- Mise à jour pour sécurisation (RLS Invoker) et granularité (Reps pour Musculation)

-- 1. VUE DES RECORDS PERSONNELS (PRs)
DROP VIEW IF EXISTS public.athlete_prs;
CREATE VIEW public.athlete_prs WITH (security_invoker = true) AS
SELECT 
    athlete_id,
    exercise_catalog_id,
    exercise_category,
    actual_distance_m,
    actual_reps, -- Ajout de la granularité des répétitions (ex: PR sur 5 reps)
    MAX(actual_weight_kg) as max_weight_kg,
    MIN(actual_time_ms) as best_time_ms,
    MAX(actual_height_cm) as max_height_cm,
    MAX(date_achieved) as latest_pr_date
FROM public.athlete_efforts
WHERE (actual_weight_kg IS NOT NULL OR actual_time_ms IS NOT NULL OR actual_height_cm IS NOT NULL)
GROUP BY 
    athlete_id, 
    exercise_catalog_id, 
    exercise_category, 
    actual_distance_m,
    actual_reps;

-- 2. VUE D'ADHÉRENCE ET VOLUME PAR SÉANCE
DROP VIEW IF EXISTS public.athlete_session_stats;
CREATE VIEW public.athlete_session_stats WITH (security_invoker = true) AS
SELECT 
    e.athlete_id,
    e.workout_id,
    w.date_prevue as workout_date,
    w.type_seance,
    
    COUNT(*) as total_planned_sets,
    SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END) as total_completed_sets,
    ROUND(
        (SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END))::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100
    , 2) as adherence_percentage,

    SUM(COALESCE(e.actual_weight_kg * COALESCE(e.actual_reps, 1), 0)) as total_volume_kg,
    SUM(COALESCE(e.actual_distance_m, 0)) as total_distance_m,
    ROUND(AVG(e.rpe), 1) as avg_rpe

FROM public.athlete_efforts e
JOIN public.workouts w ON e.workout_id = w.id
GROUP BY e.athlete_id, e.workout_id, w.date_prevue, w.type_seance;

-- 3. FONCTION DE DÉGRADATION
-- Déjà en SECURITY DEFINER (elle exécute avec les droits du créateur mais on a un filtre p_athlete_id)
-- Pour plus de sécurité, on peut exiger que p_athlete_id == auth.uid() à l'intérieur.
CREATE OR REPLACE FUNCTION public.get_workout_degradation(p_athlete_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
    workout_id UUID,
    workout_date TIMESTAMPTZ,
    exercise_category TEXT,
    distance_m NUMERIC,
    best_time_ms INT,
    worst_time_ms INT,
    degradation_percentage NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    -- Optionnel : Sécurité pour s'assurer qu'on ne regarde que ses propres perfs
    -- WHERE e.athlete_id = p_athlete_id AND e.athlete_id = auth.uid()
    -- Mais on garde juste p_athlete_id pour l'instant (le coach pourrait vouloir l'appeler).
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
    GROUP BY e.workout_id, e.exercise_category, e.actual_distance_m
    HAVING COUNT(e.actual_time_ms) > 1
    ORDER BY MIN(e.date_achieved) DESC
    LIMIT p_limit;
$$;
