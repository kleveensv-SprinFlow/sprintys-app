-- Migration: Add musculation specific default fields to coach_exercises
ALTER TABLE public.coach_exercises 
ADD COLUMN IF NOT EXISTS default_reps INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS default_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_weight_type TEXT DEFAULT 'kg';
