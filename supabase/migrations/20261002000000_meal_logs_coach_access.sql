-- Migration: 20261002000000_meal_logs_coach_access.sql
-- Description: Fix meal_logs SELECT policy to allow coaches to view their athletes' nutrition logs.

DROP POLICY IF EXISTS "Users can view their own meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "meal_logs_select_policy" ON public.meal_logs;

CREATE POLICY "meal_logs_select_policy" ON public.meal_logs FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = meal_logs.user_id
        AND tm.status = 'approved'
        AND t.coach_id = auth.uid()
    )
);
