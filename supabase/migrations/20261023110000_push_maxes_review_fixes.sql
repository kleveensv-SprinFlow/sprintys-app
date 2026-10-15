-- 20261023110000_push_maxes_review_fixes.sql
-- Corrections après revue :
--  * push : l'alerte « check-in inquiétant » se déclenche aussi quand un check-in existant est modifié (upsert),
--    les triggers n'empêchent jamais l'écriture qu'ils accompagnent, seuls les messages texte sont notifiés
--  * 1RM : un vrai 1 répétition vaut son poids, l'estimation est limitée aux séries de 1 à 6 répétitions et bornée,
--    clé d'exercice normalisée (trim), lecture limitée à l'athlète demandé

-- ---------------------------------------------------------------------------------------------------------------
-- Push : séance planifiée / déplacée (mêmes règles, mais jamais bloquant)
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.push_on_workout_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.athlete_id IS NULL OR NEW.athlete_id = NEW.coach_id THEN RETURN NEW; END IF;
    IF COALESCE(NEW.measures->>'is_master', 'false') = 'true' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.status, 'pending') <> 'pending' OR NEW.date_prevue < now() - interval '1 day' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.type_seance, '') ~* 'repos' THEN RETURN NEW; END IF;
    PERFORM public._push_enqueue(
      NEW.athlete_id, 'session', 'Nouvelle séance',
      COALESCE(NULLIF(NEW.type_seance, ''), 'Séance') || ' · ' || to_char(NEW.date_prevue AT TIME ZONE 'Europe/Paris', 'DD/MM'),
      jsonb_build_object('route', '/(athlete)/day/' || to_char(NEW.date_prevue AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'))
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- a notification problem must never block the planning
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_on_workout_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.athlete_id IS NULL OR NEW.athlete_id = NEW.coach_id THEN RETURN NEW; END IF;
    IF COALESCE(NEW.measures->>'is_master', 'false') = 'true' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.status, 'pending') <> 'pending' THEN RETURN NEW; END IF;
    IF (OLD.date_prevue AT TIME ZONE 'Europe/Paris')::date = (NEW.date_prevue AT TIME ZONE 'Europe/Paris')::date THEN RETURN NEW; END IF;
    IF NEW.date_prevue < now() - interval '1 day' THEN RETURN NEW; END IF;
    PERFORM public._push_enqueue(
      NEW.athlete_id, 'session', 'Séance déplacée',
      COALESCE(NULLIF(NEW.type_seance, ''), 'Séance') || ' · maintenant le ' || to_char(NEW.date_prevue AT TIME ZONE 'Europe/Paris', 'DD/MM'),
      jsonb_build_object('route', '/(athlete)/day/' || to_char(NEW.date_prevue AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'))
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_team uuid;
  v_name text;
  r record;
BEGIN
  BEGIN
    IF NOT public._push_on() OR NEW.content IS NULL OR btrim(NEW.content) = '' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.type::text, 'text') <> 'text' THEN RETURN NEW; END IF; -- polls, system messages…
    SELECT c.type::text, c.team_id INTO v_type, v_team FROM public.conversations c WHERE c.id = NEW.conversation_id;
    SELECT COALESCE(NULLIF(p.first_name, ''), NULLIF(p.full_name, ''), 'Nouveau message') INTO v_name FROM public.profiles p WHERE p.id = NEW.sender_id;
    FOR r IN
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = cp.user_id AND b.blocked_id = NEW.sender_id)
    LOOP
      PERFORM public._push_enqueue(
        r.user_id, 'message', COALESCE(v_name, 'Nouveau message'), NEW.content,
        jsonb_build_object('route', CASE WHEN v_type = 'team' AND v_team IS NOT NULL THEN '/chat/team/' || v_team::text ELSE '/chat/direct/' || NEW.sender_id::text END,
                           'conversation', NEW.conversation_id::text)
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- Check-in inquiétant (nouveau, ou modifié vers un état inquiétant qu'il n'avait pas)
CREATE OR REPLACE FUNCTION public.push_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_low boolean := COALESCE(NEW.health_score, 100) <= 40;
  v_pain boolean := NEW.pains IS NOT NULL AND NEW.pains::text NOT IN ('[]', '{}', 'null', '');
  v_was_low boolean := false;
  v_was_pain boolean := false;
  v_name text;
  r record;
BEGIN
  BEGIN
    IF NOT (v_low OR v_pain) OR NOT public._push_on() THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' THEN
      v_was_low := COALESCE(OLD.health_score, 100) <= 40;
      v_was_pain := OLD.pains IS NOT NULL AND OLD.pains::text NOT IN ('[]', '{}', 'null', '');
      -- Only what is new: a check-in that was already worrying has already alerted
      IF (v_low = v_was_low OR NOT v_low) AND (v_pain = v_was_pain OR NOT v_pain) THEN RETURN NEW; END IF;
    END IF;
    SELECT COALESCE(NULLIF(p.first_name, ''), NULLIF(p.full_name, ''), 'Un athlète') INTO v_name FROM public.profiles p WHERE p.id = NEW.athlete_id;
    FOR r IN
      SELECT DISTINCT t.coach_id FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = NEW.athlete_id AND tm.status = 'approved'
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.push_outbox o
        WHERE o.user_id = r.coach_id AND o.kind = 'alert' AND o.data->>'athlete' = NEW.athlete_id::text AND o.created_at > now() - interval '20 hours'
      ) THEN CONTINUE; END IF;
      PERFORM public._push_enqueue(
        r.coach_id, 'alert', 'À surveiller',
        v_name || ' : ' || CASE WHEN v_pain AND v_low THEN 'forme basse et douleur signalée' WHEN v_pain THEN 'douleur signalée' ELSE 'forme basse (' || NEW.health_score || '/100)' END,
        jsonb_build_object('route', '/(coach)/athlete/' || NEW.athlete_id::text, 'athlete', NEW.athlete_id::text)
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_checkin ON public.check_ins;
CREATE TRIGGER trg_push_checkin AFTER INSERT OR UPDATE ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.push_on_checkin();

-- ---------------------------------------------------------------------------------------------------------------
-- 1RM
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_athlete_maxes(p_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public._can_view_athlete(p_athlete) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  WITH est AS (
    SELECT btrim(public._effort_exercise_key(e)) AS k,
           COALESCE(NULLIF(e.actual_extra->>'exercise', ''), NULLIF(e.planned_extra->>'exercise_name', ''), e.exercise_catalog_id) AS label,
           -- A real single is its own weight; beyond that Epley, on short sets only (long sets overestimate)
           max(LEAST(public._effort_weight(e) * CASE WHEN e.actual_reps = 1 THEN 1 ELSE 1 + e.actual_reps::numeric / 30 END, 500)) AS est_kg,
           max(e.date_achieved) AS last_at
    FROM public.athlete_efforts e
    WHERE e.athlete_id = p_athlete
      AND lower(COALESCE(e.exercise_category, '')) ~ 'muscu|force'
      AND COALESCE(e.actual_extra->>'repsOk', 'true') <> 'false'
      AND e.actual_reps BETWEEN 1 AND 6
      AND public._effort_weight(e) > 0
      AND e.date_achieved > now() - interval '12 months'
    GROUP BY 1, 2
  ),
  est1 AS (
    SELECT DISTINCT ON (k) k, label, est_kg, last_at FROM est WHERE k <> '' ORDER BY k, est_kg DESC
  ),
  mine AS (
    SELECT exercise_key, label, one_rm_kg, updated_at FROM public.athlete_maxes WHERE athlete_id = p_athlete
  ),
  merged AS (
    SELECT COALESCE(m.exercise_key, e.k) AS k,
           COALESCE(m.label, e.label) AS label,
           m.one_rm_kg AS manual_kg,
           round(e.est_kg * 2) / 2 AS estimated_kg,
           COALESCE(e.last_at, m.updated_at) AS last_at
    FROM mine m
    FULL JOIN est1 e ON e.k = m.exercise_key
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'key', k, 'label', label, 'manual_kg', manual_kg, 'estimated_kg', estimated_kg,
           'best_kg', COALESCE(manual_kg, estimated_kg)
         ) ORDER BY last_at DESC NULLS LAST), '[]'::jsonb)
  INTO v FROM merged;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_athlete_maxes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_athlete_maxes(uuid) TO authenticated;

-- Export des données (RGPD) : les appareils enregistrés pour les notifications (sans le jeton lui-même)
CREATE OR REPLACE FUNCTION public.my_push_devices()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('platform', platform, 'registered_at', updated_at) ORDER BY updated_at DESC), '[]'::jsonb)
  FROM public.push_tokens WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_push_devices() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_push_devices() TO authenticated;
