-- Voix de Sprinty (synthèse vocale IA) : quota de caractères lus par jour et par utilisateur.
-- Aucune donnée de contenu n'est gardée : seulement le nombre de caractères par jour.

CREATE TABLE IF NOT EXISTS public.tts_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Paris')::date),
  chars integer NOT NULL DEFAULT 0 CHECK (chars >= 0),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tts_usage_select ON public.tts_usage;
CREATE POLICY tts_usage_select ON public.tts_usage FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Réserve p_chars caractères pour l'utilisateur courant si la limite du jour le permet (une seule requête, sans course)
CREATE OR REPLACE FUNCTION public.consume_tts_chars(p_chars integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_limit integer := 8000;
  v_used integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_chars IS NULL OR p_chars <= 0 OR p_chars > 4000 THEN RAISE EXCEPTION 'invalid_length'; END IF;

  INSERT INTO public.tts_usage AS t (user_id, day, chars) VALUES (v_uid, v_day, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  UPDATE public.tts_usage SET chars = chars + p_chars
  WHERE user_id = v_uid AND day = v_day AND chars + p_chars <= v_limit
  RETURNING chars INTO v_used;

  IF v_used IS NULL THEN
    SELECT chars INTO v_used FROM public.tts_usage WHERE user_id = v_uid AND day = v_day;
    RETURN jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_tts_chars(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_tts_chars(integer) TO authenticated;
