-- 20261103160000_ai_notes_journal.sql
-- Accès IA, suite :
--  * Notes de l'IA (catégorie « notes », décochée par défaut) : l'IA de l'athlète enregistre des notes courtes
--    (habitudes, demandes de l'athlète, infos utiles) et les relit aux appels suivants. Elle ne modifie jamais
--    les autres données. L'athlète voit et supprime les notes dans l'app.
--  * Mineurs : « profil » (âge, sexe, disciplines seulement, filtré par ai-data) et « notes » deviennent partageables.
--  * Journal des lectures visible par l'athlète (app et export RGPD).
--  * Alerte push à la première utilisation d'une clé et à 60 appels dans l'heure.
-- Idempotente.

-- ---- Catégories -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ai_scopes_valid(p_scopes text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(p_scopes <@ ARRAY['profil','poids','forme','nutrition','seances','resultats','records','objectifs','notes']::text[], false)
$$;

CREATE OR REPLACE FUNCTION public._ai_minor_scopes()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ARRAY['profil','seances','resultats','records','objectifs','notes']::text[]
$$;

CREATE OR REPLACE FUNCTION public.ai_access_allowed_scopes()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN '{}'::text[]
              WHEN public._ai_is_minor(auth.uid()) THEN public._ai_minor_scopes()
              ELSE ARRAY['profil','poids','forme','nutrition','seances','resultats','records','objectifs','notes']::text[] END
$$;

-- ---- Notes ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id uuid REFERENCES public.ai_access_keys(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'Mon IA', -- nom de la clé au moment de l'écriture (reste lisible si la clé est supprimée)
  categorie text NOT NULL CHECK (categorie IN ('habitude','demande','info')),
  texte text NOT NULL CHECK (char_length(btrim(texte)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_notes_athlete_time_idx ON public.ai_notes (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_notes_key_idx ON public.ai_notes (key_id);

ALTER TABLE public.ai_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_notes FROM anon, authenticated;
-- L'athlète lit et supprime ses notes ; seule l'Edge Function (service role) en écrit
GRANT SELECT, DELETE ON public.ai_notes TO authenticated;
DROP POLICY IF EXISTS ai_notes_select_own ON public.ai_notes;
CREATE POLICY ai_notes_select_own ON public.ai_notes FOR SELECT TO authenticated USING (athlete_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS ai_notes_delete_own ON public.ai_notes;
CREATE POLICY ai_notes_delete_own ON public.ai_notes FOR DELETE TO authenticated USING (athlete_id = (SELECT auth.uid()));

-- Écriture par l'IA : la clé doit être active et partager « notes ». 200 notes au plus par athlète.
CREATE OR REPLACE FUNCTION public._ai_note_add(p_key_id uuid, p_categorie text, p_texte text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k public.ai_access_keys%ROWTYPE;
  v_texte text := btrim(COALESCE(p_texte, ''));
  v_id uuid;
BEGIN
  SELECT * INTO k FROM public.ai_access_keys
  WHERE id = p_key_id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND 'notes' = ANY (scopes);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Les notes ne sont pas partagées par cette clé.'); END IF;
  IF p_categorie IS NULL OR p_categorie NOT IN ('habitude','demande','info') THEN
    RETURN jsonb_build_object('error', 'Catégorie invalide : habitude, demande ou info.');
  END IF;
  IF char_length(v_texte) NOT BETWEEN 1 AND 500 THEN RETURN jsonb_build_object('error', 'La note doit faire entre 1 et 500 caractères.'); END IF;
  IF (SELECT count(*) FROM public.ai_notes WHERE athlete_id = k.athlete_id) >= 200 THEN
    RETURN jsonb_build_object('error', 'Limite de 200 notes atteinte : supprime d''abord des notes devenues inutiles.');
  END IF;
  INSERT INTO public.ai_notes (athlete_id, key_id, source, categorie, texte)
  VALUES (k.athlete_id, k.id, k.label, p_categorie, v_texte)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'categorie', p_categorie, 'texte', v_texte);
END;
$$;

-- Suppression par l'IA : seulement une note de l'athlète de la clé
CREATE OR REPLACE FUNCTION public._ai_note_delete(p_key_id uuid, p_note_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_athlete uuid;
BEGIN
  SELECT athlete_id INTO v_athlete FROM public.ai_access_keys
  WHERE id = p_key_id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) AND 'notes' = ANY (scopes);
  IF v_athlete IS NULL THEN RETURN false; END IF;
  DELETE FROM public.ai_notes WHERE id = p_note_id AND athlete_id = v_athlete;
  RETURN FOUND;
END;
$$;

-- ---- Journal des lectures, pour l'athlète ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_ai_access_log(p_limit integer DEFAULT 30)
RETURNS TABLE(used_at timestamptz, key_label text, scopes text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.used_at, k.label, l.scopes
  FROM public.ai_access_log l JOIN public.ai_access_keys k ON k.id = l.key_id
  WHERE l.athlete_id = auth.uid()
  ORDER BY l.used_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 5000)
$$;

-- ---- Lecture d'une clé : + alertes ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ai_key_consume(p_key text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  k public.ai_access_keys%ROWTYPE;
  v_minor boolean;
  v_scopes text[];
  v_hour integer;
BEGIN
  IF p_key IS NULL OR p_key !~ '^spk_[0-9a-f]{48}$' THEN RETURN NULL; END IF;
  SELECT * INTO k FROM public.ai_access_keys
  WHERE key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
    AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Rôle vérifié à chaque appel : un compte qui n'est plus athlète perd l'accès
  IF COALESCE((SELECT role FROM public.profiles WHERE id = k.athlete_id), '') <> 'athlete' THEN RETURN NULL; END IF;
  v_hour := (SELECT count(*) FROM public.ai_access_log WHERE key_id = k.id AND used_at > now() - interval '1 hour');
  IF v_hour >= 120 THEN RETURN jsonb_build_object('rate_limited', true); END IF;

  -- Catégories filtrées à chaque appel selon l'âge (clés anciennes ou date de naissance modifiée)
  v_minor := public._ai_is_minor(k.athlete_id);
  v_scopes := CASE WHEN v_minor
    THEN COALESCE((SELECT array_agg(s) FROM unnest(k.scopes) s WHERE s = ANY (public._ai_minor_scopes())), '{}')
    ELSE k.scopes END;

  -- Alertes : première utilisation, puis usage intense (60e appel de l'heure, une seule fois)
  IF k.use_count = 0 THEN
    PERFORM public._push_enqueue(k.athlete_id, 'ai_access', 'Accès IA',
      format('Ta clé « %s » vient d''être utilisée pour la première fois.', k.label),
      jsonb_build_object('route', '/(athlete)/ai-access'));
  ELSIF v_hour = 59 THEN
    PERFORM public._push_enqueue(k.athlete_id, 'ai_access', 'Accès IA',
      format('Ta clé « %s » a été utilisée 60 fois en une heure. Si ce n''est pas toi, révoque-la.', k.label),
      jsonb_build_object('route', '/(athlete)/ai-access'));
  END IF;

  UPDATE public.ai_access_keys SET last_used_at = now(), use_count = use_count + 1 WHERE id = k.id;
  INSERT INTO public.ai_access_log (key_id, athlete_id, scopes) VALUES (k.id, k.athlete_id, v_scopes);
  DELETE FROM public.ai_access_log WHERE key_id = k.id AND used_at < now() - interval '90 days';

  RETURN jsonb_build_object('athlete_id', k.athlete_id, 'scopes', to_jsonb(v_scopes), 'key_id', k.id, 'minor', v_minor);
END;
$$;

-- ---- Droits ---------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._ai_scopes_valid(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_minor_scopes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_access_allowed_scopes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_note_add(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._ai_note_delete(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_ai_access_log(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._ai_key_consume(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._ai_scopes_valid(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ai_minor_scopes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_access_allowed_scopes() TO authenticated;
GRANT EXECUTE ON FUNCTION public._ai_note_add(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public._ai_note_delete(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_ai_access_log(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public._ai_key_consume(text) TO service_role;
