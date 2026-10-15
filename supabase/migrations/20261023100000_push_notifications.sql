-- 20261023100000_push_notifications.sql
-- Notifications push (séance planifiée ou déplacée, message, alerte d'un athlète).
--  * push_tokens : jeton d'appareil (FCM Android / APNs iOS) de chaque personne connectée
--  * push_outbox : file des notifications à envoyer ; remplie par des triggers (aucun appel réseau dans une transaction)
--  * un job pg_cron appelle chaque minute l'edge function `push` qui envoie et regroupe
-- Tout reste inerte tant que app_config.push_enabled = 'false' (aucune ligne n'est créée).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

INSERT INTO public.app_config (key, value) VALUES ('push_enabled', 'false') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.push_outbox (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  error text
);
CREATE INDEX IF NOT EXISTS push_outbox_pending_idx ON public.push_outbox (created_at) WHERE sent_at IS NULL;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_outbox FROM anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Jetons : un appareil appartient à la dernière personne connectée dessus
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_token IS NULL OR length(p_token) < 20 OR length(p_token) > 4096 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF p_platform NOT IN ('ios', 'android') THEN RAISE EXCEPTION 'Invalid platform'; END IF;
  INSERT INTO public.push_tokens (user_id, token, platform, updated_at)
  VALUES (auth.uid(), p_token, p_platform, now())
  ON CONFLICT (token) DO UPDATE SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_tokens WHERE token = p_token AND user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- File d'envoi
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._push_on()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.app_config WHERE key = 'push_enabled'), 'false') = 'true'
$$;

CREATE OR REPLACE FUNCTION public._push_enqueue(p_user uuid, p_kind text, p_title text, p_body text, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user IS NULL OR NOT public._push_on() THEN RETURN; END IF;
  -- Nobody to notify on a phone without a registered token
  IF NOT EXISTS (SELECT 1 FROM public.push_tokens WHERE user_id = p_user) THEN RETURN; END IF;
  INSERT INTO public.push_outbox (user_id, kind, title, body, data)
  VALUES (p_user, p_kind, left(p_title, 80), left(p_body, 180), COALESCE(p_data, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public._push_on() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._push_enqueue(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Séance planifiée pour un athlète par son coach
CREATE OR REPLACE FUNCTION public.push_on_workout_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_workout_insert ON public.workouts;
CREATE TRIGGER trg_push_workout_insert AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.push_on_workout_insert();

-- Séance déplacée à un autre jour
CREATE OR REPLACE FUNCTION public.push_on_workout_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_workout_move ON public.workouts;
CREATE TRIGGER trg_push_workout_move AFTER UPDATE OF date_prevue ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.push_on_workout_move();

-- Nouveau message (direct ou groupe), sauf pour qui a bloqué l'expéditeur
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
  IF NOT public._push_on() OR NEW.content IS NULL OR btrim(NEW.content) = '' THEN RETURN NEW; END IF;
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_message ON public.messages;
CREATE TRIGGER trg_push_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.push_on_message();

-- Check-in inquiétant : le coach est prévenu (une fois par athlète et par jour)
CREATE OR REPLACE FUNCTION public.push_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_low boolean := COALESCE(NEW.health_score, 100) <= 40;
  v_pain boolean := NEW.pains IS NOT NULL AND NEW.pains::text NOT IN ('[]', '{}', 'null', '');
  v_name text;
  r record;
BEGIN
  IF NOT (v_low OR v_pain) OR NOT public._push_on() THEN RETURN NEW; END IF;
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_checkin ON public.check_ins;
CREATE TRIGGER trg_push_checkin AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.push_on_checkin();

-- ---------------------------------------------------------------------------------------------------------------
-- Envoi : chaque minute, s'il y a de quoi envoyer, on réveille l'edge function `push` (qui regroupe et envoie)
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.push_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.push_outbox WHERE created_at < now() - interval '7 days';
  IF NOT public._push_on() THEN RETURN; END IF;
  -- A short delay lets several rows of the same planning (a copied week) be grouped in one notification
  IF EXISTS (SELECT 1 FROM public.push_outbox WHERE sent_at IS NULL AND claimed_at IS NULL AND created_at < now() - interval '20 seconds') THEN
    PERFORM net.http_post(
      url := 'https://tmmhznwstzmgnwoqlgqu.supabase.co/functions/v1/push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.push_dispatch() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('push-dispatch');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('push-dispatch', '* * * * *', 'select public.push_dispatch()');
