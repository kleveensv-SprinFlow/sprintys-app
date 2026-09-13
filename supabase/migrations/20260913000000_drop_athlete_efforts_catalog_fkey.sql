-- Migration: 20260913000000_drop_athlete_efforts_catalog_fkey.sql
-- Description: Drop foreign key constraint on athlete_efforts.exercise_catalog_id
-- to allow saving custom coach exercises and catalog exercises without foreign key violations.

ALTER TABLE public.athlete_efforts 
DROP CONSTRAINT IF EXISTS athlete_efforts_exercise_catalog_id_fkey;
