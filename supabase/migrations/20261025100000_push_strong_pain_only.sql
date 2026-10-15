-- 20261025100000_push_strong_pain_only.sql
-- Notification « À surveiller » au coach : seulement pour une douleur FORTE (même règle que l'app,
-- src/features/checkin/painTaxonomy.ts : intensité >= 7, ou >= 5 pour un type aigu) ou une forme <= 40.
-- Avant : n'importe quelle douleur, même une courbature à 2/10, notifiait le coach.

CREATE OR REPLACE FUNCTION public._checkin_strong_pain(p_pains jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  -- Première douleur forte de la liste (la plus intense), ou NULL
  SELECT pn
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_pains) = 'array' THEN p_pains ELSE '[]'::jsonb END) pn
  WHERE (pn->>'intensity') ~ '^[0-9]+$'
    AND ((pn->>'intensity')::int >= 7
         OR ((pn->>'intensity')::int >= 5 AND pn->>'type' IN ('Déchirure', 'Claquage', 'Articulaire', 'Élongation', 'Tendinite')))
  ORDER BY (pn->>'intensity')::int DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.push_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_low boolean := COALESCE(NEW.health_score, 100) <= 40;
  v_strong jsonb := public._checkin_strong_pain(NEW.pains);
  v_pain boolean := v_strong IS NOT NULL;
  v_was_low boolean := false;
  v_was_pain boolean := false;
  v_name text;
  v_zone text;
  r record;
BEGIN
  BEGIN
    IF NOT (v_low OR v_pain) OR NOT public._push_on() THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' THEN
      v_was_low := COALESCE(OLD.health_score, 100) <= 40;
      v_was_pain := public._checkin_strong_pain(OLD.pains) IS NOT NULL;
      -- Seulement ce qui est nouveau : un check-in déjà inquiétant a déjà alerté
      IF (v_low = v_was_low OR NOT v_low) AND (v_pain = v_was_pain OR NOT v_pain) THEN RETURN NEW; END IF;
    END IF;
    SELECT COALESCE(NULLIF(p.first_name, ''), NULLIF(p.full_name, ''), 'Un athlète') INTO v_name FROM public.profiles p WHERE p.id = NEW.athlete_id;
    IF v_pain THEN
      v_zone := COALESCE(NULLIF(v_strong->>'muscle_name', ''), 'une zone')
        || CASE WHEN v_strong->>'side' IN ('Gauche', 'Droit') THEN ' ' || lower(v_strong->>'side')
                WHEN v_strong->>'side' = 'Bilatéral' THEN ' (des deux côtés)' ELSE '' END
        || ', ' || (v_strong->>'intensity') || '/10';
    END IF;
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
        v_name || ' : ' || CASE
          WHEN v_pain AND v_low THEN 'forme basse et douleur forte (' || v_zone || ')'
          WHEN v_pain THEN 'douleur forte (' || v_zone || ')'
          ELSE 'forme basse (' || NEW.health_score || '/100)' END,
        jsonb_build_object('route', '/(coach)/athlete/' || NEW.athlete_id::text, 'athlete', NEW.athlete_id::text)
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._checkin_strong_pain(jsonb) FROM PUBLIC, anon;
