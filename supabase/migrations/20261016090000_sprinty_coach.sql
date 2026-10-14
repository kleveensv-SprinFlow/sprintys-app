-- Sprinty 2 : objectifs et plans proposés par Sprinty (coach IA de l'athlète sans coach).
--
-- Principes :
--  * Sprinty ne fait que proposer : c'est l'app qui écrit, après un geste de l'utilisateur, avec ses propres droits.
--  * Une séance créée par Sprinty porte workouts.source = 'sprinty' (badge dans l'app) et, si elle vient d'un plan,
--    workouts.ai_plan_id.
--  * Un athlète qui a un coach validé ne reçoit jamais de séance Sprinty : le coach reste seul maître du calendrier.

-- ---------------------------------------------------------------------------------------------------------------------
-- Origine des séances
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'coach';
ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_source_check;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_source_check CHECK (source IN ('coach', 'sprinty', 'athlete'));
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS ai_plan_id uuid;

-- A-t-il un coach validé ? (interne ; i_have_coach() est la version publique, limitée à soi-même)
CREATE OR REPLACE FUNCTION public._athlete_has_coach(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_uid AND tm.status = 'approved' AND t.coach_id <> p_uid
  );
$$;
REVOKE ALL ON FUNCTION public._athlete_has_coach(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.i_have_coach()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public._athlete_has_coach(auth.uid()); $$;
REVOKE ALL ON FUNCTION public.i_have_coach() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.i_have_coach() TO authenticated;

-- Une séance Sprinty n'est possible que pour soi-même, sans coach.
CREATE OR REPLACE FUNCTION public._check_sprinty_workout()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'sprinty' AND (TG_OP = 'INSERT' OR OLD.source IS DISTINCT FROM 'sprinty') THEN
    IF NEW.athlete_id IS DISTINCT FROM auth.uid() OR NEW.coach_id IS DISTINCT FROM NEW.athlete_id THEN
      RAISE EXCEPTION 'sprinty_self_only';
    END IF;
    IF public._athlete_has_coach(NEW.athlete_id) THEN
      RAISE EXCEPTION 'sprinty_has_coach';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_sprinty_workout ON public.workouts;
CREATE TRIGGER trg_check_sprinty_workout
BEFORE INSERT OR UPDATE OF source ON public.workouts
FOR EACH ROW EXECUTE FUNCTION public._check_sprinty_workout();

-- ---------------------------------------------------------------------------------------------------------------------
-- Objectifs de l'athlète
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete_goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    event_date date,
    target text CHECK (char_length(target) <= 200),
    level text CHECK (char_length(level) <= 50),
    availability jsonb NOT NULL DEFAULT '{}'::jsonb,
    constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'abandoned')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS athlete_goals_athlete_idx ON public.athlete_goals (athlete_id, status);
ALTER TABLE public.athlete_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "athlete_goals own" ON public.athlete_goals;
CREATE POLICY "athlete_goals own" ON public.athlete_goals FOR ALL TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- Plans proposés par Sprinty et acceptés par l'athlète
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    goal_id uuid REFERENCES public.athlete_goals (id) ON DELETE SET NULL,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    weeks int NOT NULL CHECK (weeks BETWEEN 1 AND 16),
    start_date date NOT NULL,
    end_date date NOT NULL,
    safety jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'removed')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_plans_athlete_idx ON public.ai_plans (athlete_id, status);
ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_plans own" ON public.ai_plans;
CREATE POLICY "ai_plans own" ON public.ai_plans FOR ALL TO authenticated
  USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid() AND NOT public.i_have_coach());

-- Limites des plans Sprinty, réglables sans mise à jour d'app.
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS ai_plans_active int NOT NULL DEFAULT 1;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS ai_plan_weeks_max int NOT NULL DEFAULT 4;
UPDATE public.plan_limits SET ai_plans_active = 1, ai_plan_weeks_max = 4 WHERE plan IN ('free_athlete', 'free_coach');
UPDATE public.plan_limits SET ai_plans_active = 1, ai_plan_weeks_max = 12
  WHERE plan IN ('legacy', 'sponsored', 'athlete_premium', 'coach_plus', 'coach_pro');

-- get_my_plan expose aussi les limites des plans Sprinty.
CREATE OR REPLACE FUNCTION public.get_my_plan_full()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p || jsonb_build_object(
    'ai_plans_active', pl.ai_plans_active,
    'ai_plan_weeks_max', pl.ai_plan_weeks_max,
    'has_coach', public._athlete_has_coach(auth.uid())
  )
  FROM (SELECT public.get_my_plan() AS p) x
  JOIN public.plan_limits pl ON pl.plan = x.p ->> 'plan';
$$;
REVOKE ALL ON FUNCTION public.get_my_plan_full() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_full() TO authenticated;
