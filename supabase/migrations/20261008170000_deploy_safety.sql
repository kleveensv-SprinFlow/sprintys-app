-- Ne supprime aucune ligne et aucune colonne.
-- Active le verrou d'accès là où l'ancienne migration ne passait pas,
-- et resserre l'insertion des séances.

CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
    user_id uuid,
    action text,
    last_called timestamp with time zone,
    call_count int,
    PRIMARY KEY (user_id, action)
);
ALTER TABLE public.rpc_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = profiles.id
          AND tm.status = 'approved'
          AND t.coach_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
CREATE POLICY "teams_select_policy" ON public.teams FOR SELECT
USING (
    coach_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = teams.id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND coach_id = auth.uid())
);

DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
CREATE POLICY "team_members_delete_policy" ON public.team_members FOR DELETE
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND coach_id = auth.uid())
);

DROP POLICY IF EXISTS "subgroups_select_policy" ON public.subgroups;
CREATE POLICY "subgroups_select_policy" ON public.subgroups FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = subgroups.team_id AND coach_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = subgroups.team_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "checkins_select_policy" ON public.check_ins;
CREATE POLICY "checkins_select_policy" ON public.check_ins FOR SELECT
USING (
    athlete_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = check_ins.athlete_id
          AND tm.status = 'approved'
          AND t.coach_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.exercises_catalog;
CREATE POLICY "Enable read access for all users" ON public.exercises_catalog
FOR SELECT USING (true);

DROP POLICY IF EXISTS "workouts_select_policy" ON public.workouts;
CREATE POLICY "workouts_select_policy" ON public.workouts FOR SELECT
USING (athlete_id = auth.uid() OR coach_id = auth.uid());

DROP POLICY IF EXISTS "workouts_insert_policy" ON public.workouts;
CREATE POLICY "workouts_insert_policy" ON public.workouts FOR INSERT
WITH CHECK (
    (
        athlete_id = auth.uid()
        AND (
            coach_id IS NULL
            OR coach_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.team_members tm
                JOIN public.teams t ON t.id = tm.team_id
                WHERE tm.user_id = auth.uid()
                  AND tm.status = 'approved'
                  AND t.coach_id = workouts.coach_id
            )
        )
    )
    OR (
        coach_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.team_members tm
            JOIN public.teams t ON t.id = tm.team_id
            WHERE tm.user_id = workouts.athlete_id
              AND tm.status = 'approved'
              AND t.coach_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "workouts_update_policy" ON public.workouts;
CREATE POLICY "workouts_update_policy" ON public.workouts FOR UPDATE
USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "workouts_delete_policy" ON public.workouts;
CREATE POLICY "workouts_delete_policy" ON public.workouts FOR DELETE
USING (coach_id = auth.uid() OR athlete_id = auth.uid());

-- Un athlète ne peut pas se passer coach en modifiant sa ligne.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.role := OLD.role;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- Un coach ne peut pas réécrire user_id pour lire les données de quelqu'un d'autre.
CREATE OR REPLACE FUNCTION public.prevent_team_member_retarget()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.team_id IS DISTINCT FROM OLD.team_id THEN
        RAISE EXCEPTION 'Cannot retarget membership';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_team_member_retarget ON public.team_members;
CREATE TRIGGER prevent_team_member_retarget
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_team_member_retarget();

CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    consent_text TEXT NOT NULL,
    version TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    revoked_at TIMESTAMPTZ
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own consents" ON public.user_consents;
CREATE POLICY "Users can view their own consents" ON public.user_consents
FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;
CREATE POLICY "Users can insert their own consents" ON public.user_consents
FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own consents" ON public.user_consents;
CREATE POLICY "Users can update their own consents" ON public.user_consents
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own consents" ON public.user_consents;
CREATE POLICY "Users can delete their own consents" ON public.user_consents
FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reports_insert_own" ON public.user_reports;
CREATE POLICY "user_reports_insert_own" ON public.user_reports
FOR INSERT WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "user_reports_select_own" ON public.user_reports;
CREATE POLICY "user_reports_select_own" ON public.user_reports
FOR SELECT USING (reporter_id = auth.uid());

-- Recopie le chrono déjà saisi vers la colonne lue par le coach.
-- Uniquement quand la colonne est vide. N'écrase rien.
UPDATE public.athlete_efforts
SET actual_time_ms = CASE
    WHEN (actual_extra->>'chrono') ~ '^[0-9]+:[0-9]+(\.[0-9]+)?$' THEN
        (
            split_part(actual_extra->>'chrono', ':', 1)::numeric * 60000
            + split_part(actual_extra->>'chrono', ':', 2)::numeric * 1000
        )::int
    WHEN (actual_extra->>'chrono') ~ '^[0-9]+(\.[0-9]+)?$' THEN
        round((actual_extra->>'chrono')::numeric * 1000)::int
    ELSE NULL
END
WHERE actual_time_ms IS NULL
  AND actual_extra ? 'chrono'
  AND (actual_extra->>'chrono') ~ '^[0-9]+(\.[0-9]+)?$|^[0-9]+:[0-9]+(\.[0-9]+)?$';
