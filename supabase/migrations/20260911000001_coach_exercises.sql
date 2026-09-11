-- Migration: 20260911000001_coach_exercises.sql
-- Description: Bibliothèque d'exercices personnalisée pour chaque coach (démarre vide, sans doublons).

CREATE TABLE IF NOT EXISTS public.coach_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'escalier',
    default_stairs INTEGER DEFAULT 20,
    default_sets INTEGER DEFAULT 4,
    default_rest_sets INTEGER DEFAULT 60, -- en secondes
    default_rest_exercise INTEGER DEFAULT 180, -- en secondes
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT coach_exercises_unique_coach_name_category UNIQUE (coach_id, name, category)
);

-- Index pour recherche rapide par coach et catégorie
CREATE INDEX IF NOT EXISTS idx_coach_exercises_coach_category ON public.coach_exercises(coach_id, category);

-- Activation du Row Level Security
ALTER TABLE public.coach_exercises ENABLE ROW LEVEL SECURITY;

-- Politiques RLS strictes (uniquement le coach propriétaire)
DROP POLICY IF EXISTS "coach_exercises_select_policy" ON public.coach_exercises;
CREATE POLICY "coach_exercises_select_policy" ON public.coach_exercises
    FOR SELECT USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_exercises_insert_policy" ON public.coach_exercises;
CREATE POLICY "coach_exercises_insert_policy" ON public.coach_exercises
    FOR INSERT WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_exercises_update_policy" ON public.coach_exercises;
CREATE POLICY "coach_exercises_update_policy" ON public.coach_exercises
    FOR UPDATE USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_exercises_delete_policy" ON public.coach_exercises;
CREATE POLICY "coach_exercises_delete_policy" ON public.coach_exercises
    FOR DELETE USING (coach_id = auth.uid());
