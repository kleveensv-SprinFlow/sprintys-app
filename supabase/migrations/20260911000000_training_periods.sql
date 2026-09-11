-- Migration: Training Periods (Macrocycles / Mesocycles / Phases)
CREATE TABLE IF NOT EXISTS public.training_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    subgroup_id UUID REFERENCES public.subgroups(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast calendar lookups
CREATE INDEX IF NOT EXISTS idx_training_periods_coach ON public.training_periods(coach_id);
CREATE INDEX IF NOT EXISTS idx_training_periods_dates ON public.training_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_training_periods_team ON public.training_periods(team_id);
CREATE INDEX IF NOT EXISTS idx_training_periods_subgroup ON public.training_periods(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_training_periods_athlete ON public.training_periods(athlete_id);

-- Enable RLS
ALTER TABLE public.training_periods ENABLE ROW LEVEL SECURITY;

-- Coach policy: full access to their own periods
DROP POLICY IF EXISTS "Coaches manage their training periods" ON public.training_periods;
CREATE POLICY "Coaches manage their training periods"
ON public.training_periods
FOR ALL
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Athlete policy: read-only access to periods targeting them or their teams/subgroups
DROP POLICY IF EXISTS "Athletes can view training periods for their teams/groups" ON public.training_periods;
CREATE POLICY "Athletes can view training periods for their teams/groups"
ON public.training_periods
FOR SELECT
TO authenticated
USING (
    athlete_id = auth.uid()
    OR team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid() AND status = 'approved'
    )
    OR subgroup_id IN (
        SELECT subgroup_id FROM public.team_members
        WHERE user_id = auth.uid() AND status = 'approved' AND subgroup_id IS NOT NULL
    )
);
