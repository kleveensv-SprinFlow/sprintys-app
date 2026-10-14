-- Une seule formule payante athlète : « Plus ». Le gratuit devient un essai par SEMAINE (lundi à dimanche, heure de Paris) :
--   * 3 analyses de repas au total, photo OU phrase (même réserve) ;
--   * 7 messages Sprinty ;
--   * 1 seul plan Sprinty, de 2 semaines, une seule fois.
-- Le scan de code-barres et la recherche d'aliments restent libres pour tout le monde.
-- Plus débloque tout le reste : photo / phrase / Sprinty en volume, PDF, objectif calorique adaptatif, bilan de la semaine,
-- recherche de compétitions, plans jusqu'à 12 semaines.
-- Tant que app_config.billing_enabled = 'false', tout le monde reste en plan « legacy » : rien ne change.

-- ---------------------------------------------------------------------------------------------------------------------
-- Limites hebdomadaires et plan unique à vie (NULL = pas de limite de ce type)
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS photo_text_per_week int;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS sprinty_per_week int;
ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS ai_plan_lifetime_max int;

-- (plan, sprinty/jour, sprinty/semaine, photo/jour, phrase/jour, scan/jour, repas IA/semaine, objectif adaptatif, bilan, PDF, semaines de plan, plans à vie, compétitions)
UPDATE public.plan_limits p SET
    sprinty_per_day = v.sprinty, sprinty_per_week = v.sprinty_w, photo_per_day = v.photo, text_per_day = v.txt, scan_per_day = v.scan,
    photo_text_per_week = v.meals_w, smart_vision = false, adaptive_target = v.paid, weekly_report = v.paid, pdf_export = v.paid,
    ai_plan_weeks_max = v.weeks, ai_plan_lifetime_max = v.life, competition_search = v.paid
FROM (VALUES
    ('legacy',          150, NULL::int, 150, 150, 500, NULL::int, true,  12, NULL::int),
    ('free_athlete',      7, 7,           3,   3, 500, 3,         false,  2, 1),
    ('free_coach',        7, 7,           3,   3, 500, 3,         false,  2, 1),
    ('sponsored',        60, NULL,       20,  60, 500, NULL,      true,  12, NULL),
    ('athlete_premium',  60, NULL,       20,  60, 500, NULL,      true,  12, NULL),
    ('athlete_plus',     60, NULL,       20,  60, 500, NULL,      true,  12, NULL),
    ('athlete_pro',      60, NULL,       20,  60, 500, NULL,      true,  12, NULL),
    ('coach_plus',      100, NULL,       20,  60, 500, NULL,      true,  12, NULL),
    ('coach_pro',       150, NULL,       20,  60, 500, NULL,      true,  12, NULL)
) AS v(plan, sprinty, sprinty_w, photo, txt, scan, meals_w, paid, weeks, life)
WHERE p.plan = v.plan;

-- ---------------------------------------------------------------------------------------------------------------------
-- Début de semaine (lundi) à Paris
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._paris_week_start()
RETURNS date
LANGUAGE sql STABLE
AS $$ SELECT date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- consume_feature : photo et phrase partagent la réserve hebdomadaire du gratuit ; le scan n'est plus limité en pratique
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_feature(p_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week date := public._paris_week_start();
  v_plan jsonb;
  v_name text;
  v_limit int;
  v_weekly int;
  v_used int;
BEGIN
  IF v_uid IS NULL OR p_kind NOT IN ('photo', 'text', 'scan') THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  v_plan := public.get_my_plan();
  v_name := v_plan ->> 'plan';
  SELECT CASE p_kind WHEN 'photo' THEN photo_per_day WHEN 'text' THEN text_per_day ELSE scan_per_day END, photo_text_per_week
    INTO v_limit, v_weekly FROM public.plan_limits WHERE plan = v_name;
  v_limit := COALESCE(v_limit, 0);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':feature', 0));
  INSERT INTO public.ai_usage (user_id, day) VALUES (v_uid, v_day) ON CONFLICT (user_id, day) DO NOTHING;

  -- Réserve commune photo + phrase sur la semaine (plan gratuit)
  IF v_weekly IS NOT NULL AND p_kind IN ('photo', 'text') THEN
    SELECT COALESCE(SUM(photo_requests + text_requests), 0) INTO v_used
      FROM public.ai_usage WHERE user_id = v_uid AND day >= v_week;
    IF v_used >= v_weekly THEN
      RETURN jsonb_build_object('allowed', false, 'limit', v_weekly, 'used', v_used, 'remaining', 0, 'window', 'week',
                                'plan', v_name, 'source', v_plan ->> 'source');
    END IF;
    IF p_kind = 'photo' THEN
      UPDATE public.ai_usage SET photo_requests = photo_requests + 1 WHERE user_id = v_uid AND day = v_day;
    ELSE
      UPDATE public.ai_usage SET text_requests = text_requests + 1 WHERE user_id = v_uid AND day = v_day;
    END IF;
    RETURN jsonb_build_object('allowed', true, 'limit', v_weekly, 'used', v_used + 1, 'remaining', GREATEST(v_weekly - v_used - 1, 0),
                              'window', 'week', 'plan', v_name, 'source', v_plan ->> 'source');
  END IF;

  -- Autres plans : plafond de sécurité par jour
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
    RETURN jsonb_build_object('allowed', false, 'limit', v_limit, 'used', v_limit, 'remaining', 0, 'window', 'day',
                              'plan', v_name, 'source', v_plan ->> 'source');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'limit', v_limit, 'used', v_used, 'remaining', GREATEST(v_limit - v_used, 0),
                            'window', 'day', 'plan', v_name, 'source', v_plan ->> 'source');
END;
$$;
REVOKE ALL ON FUNCTION public.consume_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_feature(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- consume_ai_quota_plan : Sprinty hebdomadaire pour le gratuit
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_ai_quota_plan(p_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week date := public._paris_week_start();
  v_plan jsonb;
  v_limit int;
  v_weekly int;
  v_count int;
  v_used int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  v_plan := public.get_my_plan();
  v_limit := CASE WHEN p_kind = 'meal' THEN (v_plan ->> 'meal_ai_per_day')::int ELSE (v_plan ->> 'sprinty_per_day')::int END;
  SELECT sprinty_per_week INTO v_weekly FROM public.plan_limits WHERE plan = v_plan ->> 'plan';

  IF p_kind <> 'meal' AND v_weekly IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':chat', 0));
    SELECT COALESCE(SUM(requests), 0) INTO v_used FROM public.ai_usage WHERE user_id = v_uid AND day >= v_week;
    IF v_used >= v_weekly THEN
      RETURN jsonb_build_object('allowed', false, 'limit', v_weekly, 'window', 'week', 'plan', v_plan ->> 'plan', 'source', v_plan ->> 'source');
    END IF;
    INSERT INTO public.ai_usage (user_id, day, requests) VALUES (v_uid, v_day, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET requests = public.ai_usage.requests + 1;
    RETURN jsonb_build_object('allowed', true, 'limit', v_weekly, 'window', 'week', 'plan', v_plan ->> 'plan', 'source', v_plan ->> 'source');
  END IF;

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

  RETURN jsonb_build_object('allowed', v_count IS NOT NULL, 'limit', v_limit, 'window', 'day',
                            'plan', v_plan ->> 'plan', 'source', v_plan ->> 'source');
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_quota_plan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota_plan(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Plans Sprinty : durée maximale et nombre de plans à vie, vérifiés aussi à l'écriture
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_plans_limits_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan jsonb;
  v_weeks int;
  v_life int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.athlete_id THEN
    RETURN NEW;
  END IF;
  v_plan := public.get_my_plan();
  SELECT ai_plan_weeks_max, ai_plan_lifetime_max INTO v_weeks, v_life FROM public.plan_limits WHERE plan = v_plan ->> 'plan';
  IF v_weeks IS NOT NULL AND NEW.weeks > v_weeks THEN
    RAISE EXCEPTION 'sprinty_plan_limit: % semaines maximum avec ton offre', v_weeks USING ERRCODE = 'P0001';
  END IF;
  IF v_life IS NOT NULL AND (SELECT COUNT(*) FROM public.ai_plans WHERE athlete_id = NEW.athlete_id) >= v_life THEN
    RAISE EXCEPTION 'sprinty_plan_limit: plan gratuit déjà utilisé' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ai_plans_limits_guard ON public.ai_plans;
CREATE TRIGGER ai_plans_limits_guard BEFORE INSERT ON public.ai_plans
  FOR EACH ROW EXECUTE FUNCTION public.ai_plans_limits_guard();

-- ---------------------------------------------------------------------------------------------------------------------
-- Plan complet pour l'app
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_plan_full()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p || jsonb_build_object(
    'ai_plans_active', pl.ai_plans_active,
    'ai_plan_weeks_max', pl.ai_plan_weeks_max,
    'ai_plan_lifetime_max', pl.ai_plan_lifetime_max,
    'plans_created', (SELECT COUNT(*) FROM public.ai_plans WHERE athlete_id = auth.uid()),
    'photo_per_day', pl.photo_per_day,
    'text_per_day', pl.text_per_day,
    'scan_per_day', pl.scan_per_day,
    'photo_text_per_week', pl.photo_text_per_week,
    'sprinty_per_week', pl.sprinty_per_week,
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
    'usage_week', (
      SELECT jsonb_build_object('photo_text', COALESCE(SUM(photo_requests + text_requests), 0), 'chat', COALESCE(SUM(requests), 0))
      FROM public.ai_usage WHERE user_id = auth.uid() AND day >= public._paris_week_start()
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
