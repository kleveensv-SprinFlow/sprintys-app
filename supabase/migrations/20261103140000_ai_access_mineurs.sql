-- 20261103140000_ai_access_mineurs.sql
-- Accès IA et mineurs : avant 18 ans (ou sans date de naissance), seules les catégories séances, résultats,
-- records et objectifs peuvent être partagées. Profil, poids, forme et nutrition restent privés.
-- La règle est appliquée à la création, à la modification et à chaque lecture (_ai_key_consume),
-- donc aussi aux clés déjà créées. Idempotente.

CREATE OR REPLACE FUNCTION public._ai_minor_scopes()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY['seances','resultats','records','objectifs']::text[]
$$;

-- Même règle que src/legal/age.ts (isMinorAthlete) : date de naissance absente = mineur
CREATE OR REPLACE FUNCTION public._ai_is_minor(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT date_part('year', age((now() AT TIME ZONE 'Europe/Paris')::date, p.date_of_birth)) < 18
     FROM public.profiles p WHERE p.id = p_uid AND p.date_of_birth IS NOT NULL),
    true)
$$;

CREATE OR REPLACE FUNCTION public.create_ai_access_key(p_label text, p_scopes text[], p_days integer DEFAULT 30)
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
  IF public._ai_is_minor(v_uid) AND NOT (p_scopes <@ public._ai_minor_scopes()) THEN
    RAISE EXCEPTION 'Catégories réservées aux majeurs';
  END IF;
  IF (SELECT count(*) FROM public.ai_access_keys WHERE athlete_id = v_uid AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 clés actives atteinte';
  END IF;

  v_key := 'spk_' || encode(extensions.gen_random_bytes(24), 'hex');
  IF p_days IS NOT NULL AND p_days NOT IN (7, 30, 365) THEN RAISE EXCEPTION 'Durée invalide'; END IF;
  v_exp := CASE WHEN p_days IS NULL THEN NULL ELSE now() + make_interval(days => p_days) END;

  INSERT INTO public.ai_access_keys (athlete_id, label, key_hash, key_prefix, scopes, expires_at)
  VALUES (v_uid, COALESCE(NULLIF(btrim(p_label), ''), 'Mon IA'),
          encode(extensions.digest(v_key, 'sha256'), 'hex'), left(v_key, 10),
          (SELECT array_agg(DISTINCT s) FROM unnest(p_scopes) s), v_exp)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'key', v_key, 'prefix', left(v_key, 10), 'expires_at', v_exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_access_key_scopes(p_id uuid, p_scopes text[])
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public._ai_scopes_valid(p_scopes) THEN RAISE EXCEPTION 'Catégories invalides'; END IF;
  IF public._ai_is_minor(auth.uid()) AND NOT (p_scopes <@ public._ai_minor_scopes()) THEN
    RAISE EXCEPTION 'Catégories réservées aux majeurs';
  END IF;
  UPDATE public.ai_access_keys SET scopes = (SELECT COALESCE(array_agg(DISTINCT s), '{}') FROM unnest(p_scopes) s)
  WHERE id = p_id AND athlete_id = auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clé introuvable'; END IF;
END;
$$;

-- Les catégories renvoyées sont filtrées à chaque appel : une clé créée avant cette règle,
-- ou un profil dont la date de naissance change, ne peut pas lire plus que ce que l'âge permet.
CREATE OR REPLACE FUNCTION public._ai_key_consume(p_key text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  k public.ai_access_keys%ROWTYPE;
  v_minor boolean;
  v_scopes text[];
BEGIN
  IF p_key IS NULL OR p_key !~ '^spk_[0-9a-f]{48}$' THEN RETURN NULL; END IF;
  SELECT * INTO k FROM public.ai_access_keys
  WHERE key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
    AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Rôle vérifié à chaque appel : un compte qui n'est plus athlète perd l'accès
  IF COALESCE((SELECT role FROM public.profiles WHERE id = k.athlete_id), '') <> 'athlete' THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM public.ai_access_log WHERE key_id = k.id AND used_at > now() - interval '1 hour') >= 120 THEN
    RETURN jsonb_build_object('rate_limited', true);
  END IF;

  v_minor := public._ai_is_minor(k.athlete_id);
  v_scopes := CASE WHEN v_minor
    THEN COALESCE((SELECT array_agg(s) FROM unnest(k.scopes) s WHERE s = ANY (public._ai_minor_scopes())), '{}')
    ELSE k.scopes END;

  UPDATE public.ai_access_keys SET last_used_at = now(), use_count = use_count + 1 WHERE id = k.id;
  INSERT INTO public.ai_access_log (key_id, athlete_id, scopes) VALUES (k.id, k.athlete_id, v_scopes);
  DELETE FROM public.ai_access_log WHERE key_id = k.id AND used_at < now() - interval '90 days';

  RETURN jsonb_build_object('athlete_id', k.athlete_id, 'scopes', to_jsonb(v_scopes), 'key_id', k.id, 'minor', v_minor);
END;
$$;

-- L'app lit cette règle pour griser les cases (le serveur reste seul juge)
CREATE OR REPLACE FUNCTION public.ai_access_allowed_scopes()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN '{}'::text[]
              WHEN public._ai_is_minor(auth.uid()) THEN public._ai_minor_scopes()
              ELSE ARRAY['profil','poids','forme','nutrition','seances','resultats','records','objectifs']::text[] END
$$;

REVOKE ALL ON FUNCTION public._ai_minor_scopes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_is_minor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_access_allowed_scopes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_ai_access_key(text, text[], integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ai_access_key_scopes(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_key_consume(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ai_minor_scopes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ai_is_minor(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_access_allowed_scopes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_access_key(text, text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ai_access_key_scopes(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public._ai_key_consume(text) TO service_role;
