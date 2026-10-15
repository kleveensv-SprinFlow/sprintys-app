-- 20261024100000_coach_feedback.sql
-- Réponse du coach sous une séance validée : measures.coach_feedback = {text, at} sur la ligne de l'athlète.
-- Écriture uniquement par le coach qui a programmé la séance (RPC), lecture par l'athlète via sa propre ligne.
-- L'athlète est prévenu (si les notifications serveur sont actives).

CREATE OR REPLACE FUNCTION public.set_coach_feedback(p_workout uuid, p_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  w public.workouts;
  v_text text := btrim(COALESCE(p_text, ''));
  v_fb jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO w FROM public.workouts WHERE id = p_workout;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workout not found'; END IF;
  IF w.coach_id IS DISTINCT FROM v_uid OR w.athlete_id IS NULL OR w.athlete_id = w.coach_id THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF COALESCE(w.measures->>'is_master', 'false') = 'true' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(v_text) > 1000 THEN RAISE EXCEPTION 'Too long'; END IF;

  IF v_text = '' THEN
    UPDATE public.workouts SET measures = COALESCE(measures, '{}'::jsonb) - 'coach_feedback' WHERE id = p_workout;
    RETURN NULL;
  END IF;
  v_fb := jsonb_build_object('text', v_text, 'at', now());
  UPDATE public.workouts SET measures = COALESCE(measures, '{}'::jsonb) || jsonb_build_object('coach_feedback', v_fb) WHERE id = p_workout;
  RETURN v_fb;
END;
$$;

REVOKE ALL ON FUNCTION public.set_coach_feedback(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_coach_feedback(uuid, text) TO authenticated;

-- Notification à l'athlète quand le coach répond (ou modifie sa réponse)
CREATE OR REPLACE FUNCTION public.push_on_coach_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.athlete_id IS NULL OR NEW.athlete_id = NEW.coach_id THEN RETURN NEW; END IF;
    IF (NEW.measures->'coach_feedback'->>'at') IS NULL
       OR (NEW.measures->'coach_feedback'->>'at') IS NOT DISTINCT FROM (OLD.measures->'coach_feedback'->>'at') THEN RETURN NEW; END IF;
    PERFORM public._push_enqueue(
      NEW.athlete_id, 'message', 'Ton coach a répondu',
      COALESCE(NEW.type_seance, 'Séance') || ' : ' || (NEW.measures->'coach_feedback'->>'text'),
      jsonb_build_object('route', '/(athlete)/day/' || to_char(NEW.date_prevue AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'),
                         'conversation', 'feedback-' || NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_coach_feedback ON public.workouts;
CREATE TRIGGER trg_push_coach_feedback AFTER UPDATE OF measures ON public.workouts
  FOR EACH ROW WHEN (NEW.measures IS DISTINCT FROM OLD.measures)
  EXECUTE FUNCTION public.push_on_coach_feedback();
