-- Athletes with a coach may add gentle recovery sessions proposed by Sprinty (type "Mobilité") to their own
-- calendar. Any other Sprinty session stays refused: the coach is the only one planning training.
CREATE OR REPLACE FUNCTION public._check_sprinty_workout()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'sprinty' AND (TG_OP = 'INSERT' OR OLD.source IS DISTINCT FROM 'sprinty') THEN
    IF NEW.athlete_id IS DISTINCT FROM auth.uid() OR NEW.coach_id IS DISTINCT FROM NEW.athlete_id THEN
      RAISE EXCEPTION 'sprinty_self_only';
    END IF;
    IF public._athlete_has_coach(NEW.athlete_id) AND NEW.type_seance IS DISTINCT FROM 'Mobilité' THEN
      RAISE EXCEPTION 'sprinty_has_coach';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
