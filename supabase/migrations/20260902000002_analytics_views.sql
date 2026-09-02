-- Migration: Vue et Fonctions analytiques
-- Objectif: Fournir une couche propre pour le tableau de bord sans attaquer raw athlete_efforts depuis le frontend

-- 1. VUE DES RECORDS PERSONNELS (PRs)
CREATE OR REPLACE VIEW public.athlete_prs AS
SELECT 
    athlete_id,
    exercise_catalog_id,
    exercise_category,
    actual_distance_m,
    -- Musculation: Charge maximale soulevée
    MAX(actual_weight_kg) as max_weight_kg,
    -- Course: Meilleur temps absolu sur une distance donnée (uniquement si réalisé)
    MIN(actual_time_ms) as best_time_ms,
    -- Saut: Meilleure hauteur
    MAX(actual_height_cm) as max_height_cm,
    -- Date du record
    MAX(date_achieved) as latest_pr_date
FROM public.athlete_efforts
WHERE (actual_weight_kg IS NOT NULL OR actual_time_ms IS NOT NULL OR actual_height_cm IS NOT NULL)
GROUP BY 
    athlete_id, 
    exercise_catalog_id, 
    exercise_category, 
    actual_distance_m;

-- 2. VUE D'ADHÉRENCE ET VOLUME PAR SÉANCE
CREATE OR REPLACE VIEW public.athlete_session_stats AS
SELECT 
    e.athlete_id,
    e.workout_id,
    w.date_prevue as workout_date,
    w.type_seance,
    
    -- ADHÉRENCE
    COUNT(*) as total_planned_sets,
    SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END) as total_completed_sets,
    ROUND(
        (SUM(CASE WHEN (e.actual_reps IS NOT NULL OR e.actual_time_ms IS NOT NULL OR e.actual_height_cm IS NOT NULL) THEN 1 ELSE 0 END))::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100
    , 2) as adherence_percentage,

    -- VOLUME MUSCULATION
    SUM(COALESCE(e.actual_weight_kg * COALESCE(e.actual_reps, 1), 0)) as total_volume_kg,
    
    -- VOLUME COURSE
    SUM(COALESCE(e.actual_distance_m, 0)) as total_distance_m,

    -- RPE MOYEN
    ROUND(AVG(e.rpe), 1) as avg_rpe

FROM public.athlete_efforts e
JOIN public.workouts w ON e.workout_id = w.id
GROUP BY e.athlete_id, e.workout_id, w.date_prevue, w.type_seance;


-- 3. FONCTION DE DÉGRADATION (COURSE & MUSCULATION)
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
    HAVING COUNT(e.actual_time_ms) > 1 -- Minimum 2 séries pour calculer une dégradation
    ORDER BY MIN(e.date_achieved) DESC
    LIMIT p_limit;
$$;
