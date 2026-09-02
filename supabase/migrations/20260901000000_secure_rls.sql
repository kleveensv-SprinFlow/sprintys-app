-- Migration: 20260901000000_secure_rls.sql
-- Description: Verrouillage complet des permissions RLS et création des fonctions sécurisées (SECURITY DEFINER).
-- Changements prévus:
-- 1. Activation de RLS sur toutes les tables (notamment workouts qui était ouvert).
-- 2. Suppression des policies permissives ('Public').
-- 3. Ajout de policies strictes basées sur auth.uid() et team_members (status = 'approved').
-- 4. Fonctions get_pending_members, join_team_by_code, et preview_team_by_code.

-- A. ACTIVATION RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_catalog ENABLE ROW LEVEL SECURITY;

-- B. SUPPRESSION DES ANCIENNES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public teams are viewable by everyone." ON public.teams;
DROP POLICY IF EXISTS "Public team members are viewable by everyone." ON public.team_members;
DROP POLICY IF EXISTS "Public subgroups are viewable by everyone." ON public.subgroups;
DROP POLICY IF EXISTS "Public read access for exercises" ON public.exercise_library;
DROP POLICY IF EXISTS "Users can view check-ins if they own them or are their coach." ON public.check_ins;
DROP POLICY IF EXISTS "Users can manage their own memberships or coaches can manage th" ON public.team_members;
DROP POLICY IF EXISTS "Coaches can manage subgroups." ON public.subgroups;
DROP POLICY IF EXISTS "Athletes can insert themselves into teams." ON public.team_members;

-- C. NOUVELLES POLICIES STRICTES

-- PROFILES (Moindre privilège : Soi-même OU Coach direct approuvé)
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

-- TEAMS (Visibles par Coach créateur OU Membres (approuvés ou pending))
CREATE POLICY "teams_select_policy" ON public.teams FOR SELECT
USING (
    coach_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = teams.id AND user_id = auth.uid()
    )
);

-- TEAM_MEMBERS
CREATE POLICY "team_members_select_policy" ON public.team_members FOR SELECT
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND coach_id = auth.uid())
);
CREATE POLICY "team_members_delete_policy" ON public.team_members FOR DELETE
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND coach_id = auth.uid())
);
CREATE POLICY "team_members_update_policy" ON public.team_members FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND coach_id = auth.uid())
);

-- SUBGROUPS
CREATE POLICY "subgroups_select_policy" ON public.subgroups FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = subgroups.team_id AND coach_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = subgroups.team_id AND user_id = auth.uid())
);

-- CHECK-INS
CREATE POLICY "checkins_select_policy" ON public.check_ins FOR SELECT
USING (
    athlete_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = check_ins.athlete_id AND tm.status = 'approved' AND t.coach_id = auth.uid()
    )
);

-- WORKOUTS (Athlète ciblé OU Coach créateur)
CREATE POLICY "workouts_select_policy" ON public.workouts FOR SELECT
USING (athlete_id = auth.uid() OR coach_id = auth.uid());
CREATE POLICY "workouts_insert_policy" ON public.workouts FOR INSERT
WITH CHECK (coach_id = auth.uid() OR athlete_id = auth.uid());
CREATE POLICY "workouts_update_policy" ON public.workouts FOR UPDATE
USING (coach_id = auth.uid());
CREATE POLICY "workouts_delete_policy" ON public.workouts FOR DELETE
USING (coach_id = auth.uid() OR athlete_id = auth.uid());

-- D. FONCTIONS SECURISEES (SECURITY DEFINER)

-- 1. get_pending_members (Retourne uniquement les infos minimales du profil pour éviter d'exposer les données santé)
CREATE OR REPLACE FUNCTION public.get_pending_members()
RETURNS TABLE (
    team_id uuid,
    user_id uuid,
    subgroup_id uuid,
    status text,
    profile json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        tm.team_id,
        tm.user_id,
        tm.subgroup_id,
        tm.status,
        json_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'first_name', p.first_name,
            'last_name', p.last_name
        ) AS profile
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    JOIN public.profiles p ON tm.user_id = p.id
    WHERE t.coach_id = auth.uid()
    AND tm.status = 'pending';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_pending_members() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_pending_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_members() TO authenticated;

-- 2. preview_team_by_code (Expose UNIQUEMENT le nom de l'équipe, pas son ID ni son coach)

CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
    user_id uuid,
    action text,
    last_called timestamp with time zone,
    call_count int,
    PRIMARY KEY (user_id, action)
);
ALTER TABLE public.rpc_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.preview_team_by_code(p_invite_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_team_name text;
    v_count int;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.rpc_rate_limits (user_id, action, last_called, call_count)
    VALUES (auth.uid(), 'preview_team', now(), 1)
    ON CONFLICT (user_id, action) DO UPDATE
    SET call_count = CASE 
            WHEN rpc_rate_limits.last_called > now() - interval '1 hour' THEN rpc_rate_limits.call_count + 1
            ELSE 1 
        END,
        last_called = now()
    RETURNING call_count INTO v_count;

    IF v_count > 15 THEN
        RAISE EXCEPTION 'Trop de tentatives. Veuillez réessayer plus tard.';
    END IF;

    SELECT name INTO v_team_name
    FROM public.teams
    WHERE invite_code = p_invite_code
    LIMIT 1;
    
    RETURN v_team_name;
END;
$;
REVOKE EXECUTE ON FUNCTION public.preview_team_by_code(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.preview_team_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.preview_team_by_code(text) TO authenticated;


-- 3. join_team_by_code (Sécurise l'adhésion)

CREATE OR REPLACE FUNCTION public.join_team_by_code(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_team_id uuid;
    v_team_name text;
    v_user_id uuid;
    v_count int;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.rpc_rate_limits (user_id, action, last_called, call_count)
    VALUES (v_user_id, 'join_team', now(), 1)
    ON CONFLICT (user_id, action) DO UPDATE
    SET call_count = CASE 
            WHEN rpc_rate_limits.last_called > now() - interval '1 hour' THEN rpc_rate_limits.call_count + 1
            ELSE 1 
        END,
        last_called = now()
    RETURNING call_count INTO v_count;

    IF v_count > 10 THEN
        RAISE EXCEPTION 'Trop de tentatives. Veuillez réessayer plus tard.';
    END IF;

    SELECT id, name INTO v_team_id, v_team_name
    FROM public.teams
    WHERE invite_code = p_invite_code
    LIMIT 1;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Code d''invitation invalide';
    END IF;

    IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION 'Tu as déjà rejoint un groupe ou tu as une demande en attente.';
    END IF;

    INSERT INTO public.team_members (team_id, user_id, status)
    VALUES (v_team_id, v_user_id, 'pending');

    RETURN json_build_object('success', true, 'team_id', v_team_id, 'team_name', v_team_name);
END;
$;
REVOKE EXECUTE ON FUNCTION public.join_team_by_code(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.join_team_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO authenticated;



-- 4. complete_workout (Permet à l'athlète de valider sa séance sans droit d'UPDATE sur la table)
CREATE OR REPLACE FUNCTION public.complete_workout(p_workout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.workouts 
    SET status = 'completed'
    WHERE id = p_workout_id AND athlete_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workout not found or permission denied';
    END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_workout(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.complete_workout(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_workout(uuid) TO authenticated;


-- 5. is_coach_of_team / is_member_of_team restrictions
REVOKE EXECUTE ON FUNCTION public.is_coach_of_team(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_coach_of_team(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_coach_of_team(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_member_of_team(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_member_of_team(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_member_of_team(uuid) TO authenticated;
