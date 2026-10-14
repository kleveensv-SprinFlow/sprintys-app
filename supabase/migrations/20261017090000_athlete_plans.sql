-- Abonnements athlète « Plus » et « Pro » : limites par fonction (photo IA, phrase, scan), options Pro,
-- compteurs du jour, et mise à jour du calcul du plan.
-- Tant que app_config.billing_enabled = 'false', tout le monde reste en plan « legacy » : rien ne change.

-- ---------------------------------------------------------------------------------------------------------------------
-- Limites par formule
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS photo_per_day int NOT NULL DEFAULT 3;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS text_per_day int NOT NULL DEFAULT 5;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS scan_per_day int NOT NULL DEFAULT 5;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS smart_vision boolean NOT NULL DEFAULT false;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS adaptive_target boolean NOT NULL DEFAULT false;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS weekly_report boolean NOT NULL DEFAULT false;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS pdf_export boolean NOT NULL DEFAULT false;

INSERT INTO public.plan_limits (plan, sprinty_per_day, meal_ai_per_day) VALUES
    ('athlete_plus', 40, 30),
    ('athlete_pro', 150, 60)
ON CONFLICT (plan) DO NOTHING;

-- (plan, sprinty, photo, texte, scan, vision plus précise, objectif adaptatif, bilan, PDF, semaines de plan, plans actifs, compétitions)
UPDATE public.plan_limits p SET
    sprinty_per_day = v.sprinty, photo_per_day = v.photo, text_per_day = v.txt, scan_per_day = v.scan,
    smart_vision = v.smart, adaptive_target = v.adapt, weekly_report = v.weekly, pdf_export = v.pdf,
    ai_plan_weeks_max = v.weeks, ai_plans_active = v.plans, competition_search = v.comp
FROM (VALUES
    ('legacy',          150, 150, 150, 500, false, true,  true,  true, 12, 1, true),
    ('free_athlete',     10,   3,   5,   5, false, false, false, false, 4, 1, false),
    ('free_coach',       10,   3,   5,   5, false, false, false, false, 4, 1, false),
    ('sponsored',        40,  30,  60, 200, false, false, false, true,  4, 1, false),
    ('athlete_premium',  40,  30,  60, 200, false, false, false, true,  4, 1, false),
    ('athlete_plus',     40,  30,  60, 200, false, false, false, true,  4, 1, false),
    ('athlete_pro',     150,  30,  60, 300, true,  true,  true,  true, 12, 3, true),
    ('coach_plus',       60,  30,  60, 200, false, false, false, true,  4, 1, false),
    ('coach_pro',       150,  30,  60, 300, true,  true,  true,  true, 12, 3, true)
) AS v(plan, sprinty, photo, txt, scan, smart, adapt, weekly, pdf, weeks, plans, comp)
WHERE p.plan = v.plan;

-- ---------------------------------------------------------------------------------------------------------------------
-- Abonnements : nouvelles formules
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('athlete_premium', 'athlete_plus', 'athlete_pro', 'coach_plus', 'coach_pro'));

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
  ORDER BY CASE plan WHEN 'coach_pro' THEN 4 WHEN 'athlete_pro' THEN 4 WHEN 'coach_plus' THEN 3 WHEN 'athlete_plus' THEN 3 ELSE 2 END DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._effective_sub(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Compteurs du jour par fonction
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS photo_requests int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS text_requests int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS scan_requests int NOT NULL DEFAULT 0;

-- Compte une utilisation (photo, phrase ou scan) selon le plan. Renvoie { allowed, limit, used, remaining, plan, source }.
CREATE OR REPLACE FUNCTION public.consume_feature(p_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_plan jsonb;
  v_limit int;
  v_used int;
BEGIN
  IF v_uid IS NULL OR p_kind NOT IN ('photo', 'text', 'scan') THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  v_plan := public.get_my_plan();
  SELECT CASE p_kind WHEN 'photo' THEN photo_per_day WHEN 'text' THEN text_per_day ELSE scan_per_day END
    INTO v_limit FROM public.plan_limits WHERE plan = v_plan ->> 'plan';
  v_limit := COALESCE(v_limit, 0);

  INSERT INTO public.ai_usage (user_id, day) VALUES (v_uid, v_day) ON CONFLICT (user_id, day) DO NOTHING;

  IF p_kind = 'photo' THEN
    UPDATE public.ai_usage SET photo_requests = photo_requests + 1
      WHERE user_id = v_uid AND day = v_day AND photo_requests < v_limit RETURNING photo_requests INTO v_used;
  ELSIF p_kind = 'text' THEN
    UPDATE public.ai_usage SET text_requests = text_requests + 1
      WHERE user_id = v_uid AND day = v_day AND text_requests < v_limit RETURNING text_requests INTO v_used;
  ELSE
    UPDATE public.ai_usage SET scan_requests = scan_requests + 1
      WHERE user_id = v_uid AND day = v_day AND scan_requests < v_limit RETURNING scan_requests INTO v_used;
  END IF;

  IF v_used IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'limit', v_limit, 'used', v_limit, 'remaining', 0,
                              'plan', v_plan ->> 'plan', 'source', v_plan ->> 'source');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'limit', v_limit, 'used', v_used, 'remaining', GREATEST(v_limit - v_used, 0),
                            'plan', v_plan ->> 'plan', 'source', v_plan ->> 'source');
END;
$$;
REVOKE ALL ON FUNCTION public.consume_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_feature(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Plan complet pour l'app : limites, options, usage du jour et du mois
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_plan_full()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p || jsonb_build_object(
    'ai_plans_active', pl.ai_plans_active,
    'ai_plan_weeks_max', pl.ai_plan_weeks_max,
    'photo_per_day', pl.photo_per_day,
    'text_per_day', pl.text_per_day,
    'scan_per_day', pl.scan_per_day,
    'smart_vision', pl.smart_vision,
    'adaptive_target', pl.adaptive_target,
    'weekly_report', pl.weekly_report,
    'pdf_export', pl.pdf_export,
    'has_coach', public._athlete_has_coach(auth.uid()),
    'usage_today', jsonb_build_object(
      'photo', COALESCE((SELECT photo_requests FROM public.ai_usage WHERE user_id = auth.uid() AND day = (now() AT TIME ZONE 'Europe/Paris')::date), 0),
      'text',  COALESCE((SELECT text_requests  FROM public.ai_usage WHERE user_id = auth.uid() AND day = (now() AT TIME ZONE 'Europe/Paris')::date), 0),
      'scan',  COALESCE((SELECT scan_requests  FROM public.ai_usage WHERE user_id = auth.uid() AND day = (now() AT TIME ZONE 'Europe/Paris')::date), 0),
      'chat',  COALESCE((SELECT requests       FROM public.ai_usage WHERE user_id = auth.uid() AND day = (now() AT TIME ZONE 'Europe/Paris')::date), 0)
    ),
    'usage_month', (
      SELECT jsonb_build_object('photo', COALESCE(SUM(photo_requests), 0), 'text', COALESCE(SUM(text_requests), 0),
                                'scan', COALESCE(SUM(scan_requests), 0), 'chat', COALESCE(SUM(requests), 0))
      FROM public.ai_usage
      WHERE user_id = auth.uid() AND day >= date_trunc('month', now() AT TIME ZONE 'Europe/Paris')::date
    ),
    'subscription', (
      SELECT jsonb_build_object('plan', s.plan, 'status', s.status, 'current_period_end', s.current_period_end,
                                'will_renew', s.will_renew, 'store', s.store, 'source', s.source)
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid() AND s.status <> 'expired' AND s.current_period_end > now()
      ORDER BY s.current_period_end DESC LIMIT 1
    )
  )
  FROM (SELECT public.get_my_plan() AS p) x
  JOIN public.plan_limits pl ON pl.plan = x.p ->> 'plan';
$$;
REVOKE ALL ON FUNCTION public.get_my_plan_full() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_full() TO authenticated;
