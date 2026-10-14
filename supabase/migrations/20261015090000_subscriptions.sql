-- Abonnements facultatifs : plans, limites, Premium offert par un coach à un groupe.
--
-- Principes :
--  * Source de vérité = cette base. RevenueCat l'alimente via l'edge function revenuecat_webhook (service role).
--  * Tant que app_config.billing_enabled = 'false', tout le monde est en plan « legacy » (mêmes limites qu'avant :
--    150 requêtes IA par jour) : le déploiement ne change rien pour les utilisateurs.
--  * Le plan effectif d'un utilisateur est calculé côté serveur (get_my_plan), jamais fourni par l'app.
--  * Rien n'est supprimé quand un abonnement se termine : seules des limites d'IA et la couverture du groupe changent.

-- ---------------------------------------------------------------------------------------------------------------------
-- Configuration
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
    key text PRIMARY KEY,
    value text NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_config readable" ON public.app_config;
CREATE POLICY "app_config readable" ON public.app_config FOR SELECT TO authenticated USING (true);

INSERT INTO public.app_config (key, value) VALUES ('billing_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.plan_limits (
    plan text PRIMARY KEY,
    sprinty_per_day int NOT NULL,
    meal_ai_per_day int NOT NULL,
    sponsored_groups int NOT NULL DEFAULT 0,
    sponsored_athletes int NOT NULL DEFAULT 0,
    competition_search boolean NOT NULL DEFAULT false
);
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_limits readable" ON public.plan_limits;
CREATE POLICY "plan_limits readable" ON public.plan_limits FOR SELECT TO authenticated USING (true);

-- Plafonds de départ, modifiables par simple UPDATE (pas de mise à jour d'app nécessaire).
INSERT INTO public.plan_limits (plan, sprinty_per_day, meal_ai_per_day, sponsored_groups, sponsored_athletes, competition_search) VALUES
    ('legacy',           150, 150, 0,  0, true),
    ('free_athlete',      10,   3, 0,  0, false),
    ('free_coach',        10,   3, 0,  0, false),
    ('sponsored',         30,  10, 0,  0, false),
    ('athlete_premium',   60,  30, 0,  0, false),
    ('coach_plus',        60,  30, 1, 15, false),
    ('coach_pro',        150,  60, 3, 50, true)
ON CONFLICT (plan) DO NOTHING;

-- ---------------------------------------------------------------------------------------------------------------------
-- Abonnements (écrits uniquement par le webhook, via la clé service)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    product_id text NOT NULL,
    plan text NOT NULL CHECK (plan IN ('athlete_premium', 'coach_plus', 'coach_pro')),
    store text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'grace', 'expired')),
    current_period_end timestamptz,
    will_renew boolean NOT NULL DEFAULT true,
    source text NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase', 'promo')),
    last_event_ms bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions read own" ON public.subscriptions;
CREATE POLICY "subscriptions read own" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Aucune policy d'écriture : INSERT / UPDATE / DELETE impossibles pour les utilisateurs.

-- ---------------------------------------------------------------------------------------------------------------------
-- Groupes dont le coach offre Premium
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_sponsorships (
    team_id uuid PRIMARY KEY REFERENCES public.teams (id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_sponsorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sponsorship read own" ON public.group_sponsorships;
CREATE POLICY "sponsorship read own" ON public.group_sponsorships FOR SELECT TO authenticated USING (coach_id = auth.uid());
DROP POLICY IF EXISTS "sponsorship insert own team" ON public.group_sponsorships;
CREATE POLICY "sponsorship insert own team" ON public.group_sponsorships FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid() AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid()));
DROP POLICY IF EXISTS "sponsorship delete own" ON public.group_sponsorships;
CREATE POLICY "sponsorship delete own" ON public.group_sponsorships FOR DELETE TO authenticated USING (coach_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- Calcul du plan
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._billing_enabled()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.app_config WHERE key = 'billing_enabled'), 'false') = 'true';
$$;

-- Meilleur abonnement personnel actif (ou NULL).
CREATE OR REPLACE FUNCTION public._effective_sub(p_uid uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT plan
  FROM public.subscriptions
  WHERE user_id = p_uid
    AND status <> 'expired'
    AND current_period_end IS NOT NULL
    AND current_period_end > now()
  ORDER BY CASE plan WHEN 'coach_pro' THEN 3 WHEN 'coach_plus' THEN 2 ELSE 1 END DESC
  LIMIT 1;
$$;

-- Coach qui offre Premium à l'athlète p_uid (le plus ancien en premier si le coach dépasse ses places).
CREATE OR REPLACE FUNCTION public._sponsor_for(p_uid uuid)
RETURNS TABLE (coach_id uuid, coach_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH members AS (
    SELECT t.coach_id, tm.user_id, MIN(tm.created_at) AS since
    FROM public.group_sponsorships gs
    JOIN public.teams t ON t.id = gs.team_id AND t.coach_id = gs.coach_id
    JOIN public.team_members tm ON tm.team_id = t.id AND tm.status = 'approved'
    GROUP BY t.coach_id, tm.user_id
  ), ranked AS (
    SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.coach_id ORDER BY m.since, m.user_id) AS rn
    FROM members m
  )
  SELECT r.coach_id, COALESCE(NULLIF(p.first_name, ''), NULLIF(p.full_name, ''), 'ton coach')
  FROM ranked r
  JOIN public.profiles p ON p.id = r.coach_id
  JOIN public.plan_limits pl ON pl.plan = public._effective_sub(r.coach_id)
  WHERE r.user_id = p_uid AND r.rn <= pl.sponsored_athletes
  LIMIT 1;
$$;

-- Plan effectif de l'utilisateur courant et ses limites.
CREATE OR REPLACE FUNCTION public.get_my_plan()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_billing boolean := public._billing_enabled();
  v_role text;
  v_own text;
  v_sp_id uuid;
  v_sp_name text;
  v_plan text;
  v_source text;
  v_lim public.plan_limits;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT v_billing THEN
    v_plan := 'legacy';
    v_source := 'legacy';
  ELSE
    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    v_own := public._effective_sub(v_uid);
    SELECT s.coach_id, s.coach_name INTO v_sp_id, v_sp_name FROM public._sponsor_for(v_uid) s;

    SELECT c.plan, c.source INTO v_plan, v_source
    FROM (VALUES
      (v_own, 'own', 3),
      (CASE WHEN v_sp_id IS NOT NULL THEN 'sponsored' END, 'sponsored', 2),
      (CASE WHEN v_role = 'coach' THEN 'free_coach' ELSE 'free_athlete' END, 'free', 1)
    ) AS c(plan, source, prio)
    JOIN public.plan_limits pl ON pl.plan = c.plan
    WHERE c.plan IS NOT NULL
    ORDER BY pl.sprinty_per_day DESC, c.prio DESC
    LIMIT 1;
  END IF;

  SELECT * INTO v_lim FROM public.plan_limits WHERE plan = v_plan;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'source', v_source,
    'sponsor_name', CASE WHEN v_source = 'sponsored' THEN v_sp_name END,
    'billing_enabled', v_billing,
    'sprinty_per_day', v_lim.sprinty_per_day,
    'meal_ai_per_day', v_lim.meal_ai_per_day,
    'sponsored_groups', v_lim.sponsored_groups,
    'sponsored_athletes', v_lim.sponsored_athletes,
    'competition_search', v_lim.competition_search
  );
END;
$$;

-- Compte une requête IA selon le plan et renvoie { allowed, limit, plan, source }.
-- p_kind : 'chat' (Sprinty athlète et coach) ou 'meal' (analyse de repas). La limite vient du serveur.
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS meal_requests int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_ai_quota_plan(p_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_plan jsonb;
  v_limit int;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  v_plan := public.get_my_plan();
  v_limit := CASE WHEN p_kind = 'meal' THEN (v_plan ->> 'meal_ai_per_day')::int ELSE (v_plan ->> 'sprinty_per_day')::int END;

  IF p_kind = 'meal' THEN
    INSERT INTO public.ai_usage (user_id, day, requests, meal_requests) VALUES (v_uid, v_day, 0, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET meal_requests = public.ai_usage.meal_requests + 1
    WHERE public.ai_usage.meal_requests < v_limit
    RETURNING meal_requests INTO v_count;
  ELSE
    INSERT INTO public.ai_usage (user_id, day, requests) VALUES (v_uid, v_day, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = public.ai_usage.requests + 1
    WHERE public.ai_usage.requests < v_limit
    RETURNING requests INTO v_count;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_count IS NOT NULL,
    'limit', v_limit,
    'plan', v_plan ->> 'plan',
    'source', v_plan ->> 'source'
  );
END;
$$;

-- Tableau de bord du coach : places de Premium offert.
CREATE OR REPLACE FUNCTION public.coach_sponsorship_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_lim public.plan_limits;
  v_groups int;
  v_athletes int;
  v_team_ids jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  v_plan := CASE WHEN public._billing_enabled() THEN public._effective_sub(v_uid) END;
  SELECT * INTO v_lim FROM public.plan_limits WHERE plan = v_plan;

  SELECT COUNT(*), COALESCE(jsonb_agg(gs.team_id), '[]'::jsonb) INTO v_groups, v_team_ids
  FROM public.group_sponsorships gs WHERE gs.coach_id = v_uid;

  SELECT COUNT(DISTINCT tm.user_id) INTO v_athletes
  FROM public.group_sponsorships gs
  JOIN public.team_members tm ON tm.team_id = gs.team_id AND tm.status = 'approved'
  WHERE gs.coach_id = v_uid;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'groups_max', COALESCE(v_lim.sponsored_groups, 0),
    'athletes_max', COALESCE(v_lim.sponsored_athletes, 0),
    'groups_used', v_groups,
    'athletes_used', v_athletes,
    'team_ids', v_team_ids
  );
END;
$$;

-- Refuse de dépasser les places du plan du coach quand il active « Offrir Premium » sur un groupe.
CREATE OR REPLACE FUNCTION public._check_sponsorship()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lim public.plan_limits;
  v_groups int;
  v_athletes int;
BEGIN
  IF NOT public._billing_enabled() THEN
    RAISE EXCEPTION 'sponsor_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_lim FROM public.plan_limits WHERE plan = public._effective_sub(NEW.coach_id);
  IF v_lim.plan IS NULL OR v_lim.sponsored_groups <= 0 THEN
    RAISE EXCEPTION 'sponsor_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_groups FROM public.group_sponsorships WHERE coach_id = NEW.coach_id AND team_id <> NEW.team_id;
  IF v_groups + 1 > v_lim.sponsored_groups THEN
    RAISE EXCEPTION 'sponsor_groups_limit' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(DISTINCT tm.user_id) INTO v_athletes
  FROM public.team_members tm
  WHERE tm.status = 'approved'
    AND tm.team_id IN (SELECT team_id FROM public.group_sponsorships WHERE coach_id = NEW.coach_id UNION SELECT NEW.team_id);
  IF v_athletes > v_lim.sponsored_athletes THEN
    RAISE EXCEPTION 'sponsor_athletes_limit' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_sponsorship ON public.group_sponsorships;
CREATE TRIGGER check_sponsorship BEFORE INSERT ON public.group_sponsorships
    FOR EACH ROW EXECUTE FUNCTION public._check_sponsorship();

-- ---------------------------------------------------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._billing_enabled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._effective_sub(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._sponsor_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._check_sponsorship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_plan() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_ai_quota_plan(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coach_sponsorship_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_sponsorship_status() TO authenticated;
