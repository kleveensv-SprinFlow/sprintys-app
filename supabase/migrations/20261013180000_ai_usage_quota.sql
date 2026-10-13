-- Suivi de l'usage de l'IA (edge function "chat") : filet anti-abus par jour et par compte,
-- et tokens consommés pour suivre le coût. Ne touche à aucune table existante.

CREATE TABLE IF NOT EXISTS public.ai_usage (
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    day date NOT NULL,
    requests int NOT NULL DEFAULT 0,
    tokens int NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);

-- Aucune policy : seules les fonctions ci-dessous (SECURITY DEFINER) y écrivent.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Compte une requête pour l'utilisateur courant. Renvoie false si la limite du jour est atteinte
-- (la requête n'est alors pas comptée). Jour calculé à l'heure de Paris.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage (user_id, day, requests)
  VALUES (v_uid, v_day, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET requests = public.ai_usage.requests + 1
  WHERE public.ai_usage.requests < p_limit
  RETURNING requests INTO v_count;

  -- No row returned: the conflict update was skipped because the limit is reached
  RETURN v_count IS NOT NULL;
END;
$$;

-- Ajoute les tokens consommés par la dernière réponse.
CREATE OR REPLACE FUNCTION public.add_ai_tokens(p_tokens int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_usage
  SET tokens = tokens + GREATEST(p_tokens, 0)
  WHERE user_id = auth.uid()
    AND day = (now() AT TIME ZONE 'Europe/Paris')::date;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_ai_tokens(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_ai_tokens(int) TO authenticated;
