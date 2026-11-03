-- 20261103120000_ai_access_keys.sql
-- Clés d'accès IA : un athlète crée une clé personnelle, en lecture seule, qu'il donne à l'IA de son choix
-- (ChatGPT, Claude, Gemini…). La clé n'est jamais stockée : seule son empreinte SHA-256 l'est.
-- L'athlète coche les catégories partagées et peut les changer ou révoquer la clé à tout moment.
-- Lecture des données : Edge Function ai-data (service role) via _ai_key_consume. Idempotente.

CREATE TABLE IF NOT EXISTS public.ai_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Mon IA' CHECK (char_length(label) BETWEEN 1 AND 40),
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ai_access_keys_athlete_idx ON public.ai_access_keys (athlete_id);

CREATE TABLE IF NOT EXISTS public.ai_access_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id uuid NOT NULL REFERENCES public.ai_access_keys(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  scopes text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ai_access_log_key_time_idx ON public.ai_access_log (key_id, used_at DESC);
CREATE INDEX IF NOT EXISTS ai_access_log_athlete_idx ON public.ai_access_log (athlete_id);

-- Aucun accès direct : tout passe par les fonctions ci-dessous
ALTER TABLE public.ai_access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_access_keys, public.ai_access_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._ai_scopes_valid(p_scopes text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(p_scopes <@ ARRAY['profil','poids','forme','nutrition','seances','resultats','records','objectifs']::text[], false)
$$;

-- Création : renvoie la clé en clair UNE seule fois
CREATE OR REPLACE FUNCTION public.create_ai_access_key(p_label text, p_scopes text[], p_days integer DEFAULT 90)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_id uuid;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF COALESCE((SELECT role FROM public.profiles WHERE id = v_uid), '') <> 'athlete' THEN
    RAISE EXCEPTION 'Réservé aux athlètes';
  END IF;
  IF NOT public._ai_scopes_valid(p_scopes) OR COALESCE(array_length(p_scopes, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Catégories invalides';
  END IF;
  IF (SELECT count(*) FROM public.ai_access_keys WHERE athlete_id = v_uid AND revoked_at IS NULL AND expires_at > now()) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 clés actives atteinte';
  END IF;

  v_key := 'spk_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_exp := now() + make_interval(days => LEAST(GREATEST(COALESCE(p_days, 90), 1), 365));

  INSERT INTO public.ai_access_keys (athlete_id, label, key_hash, key_prefix, scopes, expires_at)
  VALUES (v_uid, COALESCE(NULLIF(btrim(p_label), ''), 'Mon IA'),
          encode(extensions.digest(v_key, 'sha256'), 'hex'), left(v_key, 10),
          (SELECT array_agg(DISTINCT s) FROM unnest(p_scopes) s), v_exp)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'key', v_key, 'prefix', left(v_key, 10), 'expires_at', v_exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ai_access_keys()
RETURNS TABLE(id uuid, label text, key_prefix text, scopes text[], created_at timestamptz, expires_at timestamptz,
              revoked_at timestamptz, last_used_at timestamptz, use_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, k.label, k.key_prefix, k.scopes, k.created_at, k.expires_at, k.revoked_at, k.last_used_at, k.use_count
  FROM public.ai_access_keys k
  WHERE k.athlete_id = auth.uid()
  ORDER BY (k.revoked_at IS NULL AND k.expires_at > now()) DESC, k.created_at DESC
$$;

-- L'athlète coche / décoche ce qu'il partage, sans changer de clé
CREATE OR REPLACE FUNCTION public.update_ai_access_key_scopes(p_id uuid, p_scopes text[])
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public._ai_scopes_valid(p_scopes) THEN RAISE EXCEPTION 'Catégories invalides'; END IF;
  UPDATE public.ai_access_keys SET scopes = (SELECT COALESCE(array_agg(DISTINCT s), '{}') FROM unnest(p_scopes) s)
  WHERE id = p_id AND athlete_id = auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clé introuvable'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_ai_access_key(p_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.ai_access_keys SET revoked_at = now()
  WHERE id = p_id AND athlete_id = auth.uid() AND revoked_at IS NULL;
END;
$$;

-- Appelée uniquement par l'Edge Function (service role) : valide la clé, applique la limite d'appels,
-- journalise et renvoie l'athlète et ses catégories. NULL si la clé est invalide, expirée ou révoquée.
CREATE OR REPLACE FUNCTION public._ai_key_consume(p_key text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  k public.ai_access_keys%ROWTYPE;
BEGIN
  IF p_key IS NULL OR p_key !~ '^spk_[0-9a-f]{48}$' THEN RETURN NULL; END IF;
  SELECT * INTO k FROM public.ai_access_keys
  WHERE key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
    AND revoked_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Rôle vérifié à chaque appel : un compte qui n'est plus athlète perd l'accès
  IF COALESCE((SELECT role FROM public.profiles WHERE id = k.athlete_id), '') <> 'athlete' THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM public.ai_access_log WHERE key_id = k.id AND used_at > now() - interval '1 hour') >= 120 THEN
    RETURN jsonb_build_object('rate_limited', true);
  END IF;

  UPDATE public.ai_access_keys SET last_used_at = now(), use_count = use_count + 1 WHERE id = k.id;
  INSERT INTO public.ai_access_log (key_id, athlete_id, scopes) VALUES (k.id, k.athlete_id, k.scopes);
  DELETE FROM public.ai_access_log WHERE key_id = k.id AND used_at < now() - interval '90 days';

  RETURN jsonb_build_object('athlete_id', k.athlete_id, 'scopes', to_jsonb(k.scopes), 'key_id', k.id);
END;
$$;

REVOKE ALL ON FUNCTION public._ai_scopes_valid(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_ai_access_key(text, text[], integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ai_access_keys() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ai_access_key_scopes(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_ai_access_key(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_key_consume(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_access_key(text, text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_access_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ai_access_key_scopes(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_ai_access_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._ai_key_consume(text) TO service_role;
GRANT EXECUTE ON FUNCTION public._ai_scopes_valid(text[]) TO authenticated, service_role;
