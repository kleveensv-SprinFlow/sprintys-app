-- Hardening after review:
-- 1. sync: a pending copy of the same group is updated (member approved without subgroup, then assigned one)
-- 2. get_athlete_group_discussions: caller must belong to the team

CREATE OR REPLACE FUNCTION sync_athlete_group_workouts(
    p_athlete_id UUID,
    p_team_id UUID,
    p_subgroup_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_inserted_count INT := 0;
    v_record RECORD;
    v_blocks jsonb;
    v_exercises jsonb;
    v_measures jsonb;
    v_notes jsonb;
    v_desc text;
    v_had_exercises boolean;
    v_pending_id uuid;
BEGIN
    -- SÉCURITÉ: Vérifier l'authentification
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- SÉCURITÉ: Vérifier que l'appelant est bien le coach de l'équipe
    SELECT coach_id INTO v_coach_id FROM public.teams WHERE id = p_team_id;
    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RAISE EXCEPTION 'Forbidden: You are not the coach of this team';
    END IF;

    -- SÉCURITÉ: Vérifier que l'athlète fait bien partie de l'équipe et est approuvé
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE user_id = p_athlete_id AND team_id = p_team_id AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Athlete is not an approved member of this team';
    END IF;

    -- 1. Si un sous-groupe spécifique est défini : supprimer les séances futures d'autres sous-groupes (non encore réalisées)
    IF p_subgroup_id IS NOT NULL THEN
        DELETE FROM public.workouts
        WHERE athlete_id = p_athlete_id
          AND team_id = p_team_id
          AND subgroup_id IS NOT NULL
          AND subgroup_id != p_subgroup_id
          AND status = 'pending'
          AND date_prevue >= (now() - interval '2 hours');
    END IF;

    -- 2. Modèles de séances futures de l'équipe : un par group_assignment_id (ou date + type), en préférant la copie maître
    FOR v_record IN (
        SELECT DISTINCT ON (COALESCE(group_assignment_id::text, date_prevue::text || '_' || type_seance))
            coach_id, team_id, subgroup_id, group_assignment_id, date_prevue, type_seance,
            blocks, exercises, intensity, description, measures
        FROM public.workouts
        WHERE team_id = p_team_id
          AND date_prevue >= (now() - interval '2 hours')
        ORDER BY COALESCE(group_assignment_id::text, date_prevue::text || '_' || type_seance),
                 (COALESCE(measures->>'is_master', 'false') = 'true') DESC,
                 created_at DESC
    ) LOOP
        -- Sous-groupe précis : ne synchroniser que les séances communes ou celles de son sous-groupe
        IF p_subgroup_id IS NOT NULL AND v_record.subgroup_id IS NOT NULL AND v_record.subgroup_id != p_subgroup_id THEN
            CONTINUE;
        END IF;

        -- L'athlète possède déjà cette séance ? Une copie encore « pending » du même groupe est remise à jour
        -- (cas : approuvé sans sous-groupe, puis affecté à un sous-groupe : il doit recevoir les exercices de son sous-groupe)
        v_pending_id := NULL;
        IF v_record.group_assignment_id IS NOT NULL THEN
            SELECT id INTO v_pending_id FROM public.workouts
            WHERE athlete_id = p_athlete_id AND group_assignment_id = v_record.group_assignment_id AND status = 'pending'
            LIMIT 1;
        END IF;
        IF v_pending_id IS NULL AND EXISTS (
            SELECT 1 FROM public.workouts
            WHERE athlete_id = p_athlete_id
              AND (
                  (group_assignment_id IS NOT NULL AND group_assignment_id = v_record.group_assignment_id)
                  OR (date_prevue = v_record.date_prevue AND type_seance = v_record.type_seance)
              )
        ) THEN
            CONTINUE;
        END IF;

        -- Ce qui appartient à un autre (copie maître, commentaire d'athlète) ne suit pas
        v_measures := COALESCE(v_record.measures, '{}'::jsonb) - 'is_master' - 'athlete_feedback';
        IF jsonb_typeof(v_measures->'athlete_notes') = 'string' THEN
            v_measures := v_measures - 'athlete_notes';
        END IF;
        v_desc := v_record.description;

        -- Séance technique : seulement les consignes qui le concernent
        IF jsonb_typeof(v_measures->'technical_notes') = 'array' THEN
            SELECT COALESCE(jsonb_agg(n), '[]'::jsonb) INTO v_notes
            FROM jsonb_array_elements(v_measures->'technical_notes') n
            WHERE n->>'targetType' = 'team'
               OR (n->>'targetType' = 'subgroup' AND p_subgroup_id IS NOT NULL AND n->>'targetId' = p_subgroup_id::text)
               OR (n->>'targetType' = 'athlete' AND n->>'targetId' = p_athlete_id::text);
            IF jsonb_array_length(v_notes) = 0 THEN CONTINUE; END IF;
            v_measures := jsonb_set(v_measures, '{athlete_notes}', v_notes);
            SELECT string_agg(
                '[' || COALESCE(NULLIF(btrim(n->>'title'), ''), n->>'targetName', '') || E']\n' || btrim(COALESCE(n->>'content', '')),
                E'\n\n') INTO v_desc
            FROM jsonb_array_elements(v_notes) n;
        END IF;

        -- Blocs et exercices : seulement ceux ciblés pour cet athlète
        v_blocks := v_record.blocks;
        IF jsonb_typeof(v_record.blocks) = 'array' THEN
            v_had_exercises := EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_record.blocks) b
                WHERE jsonb_typeof(b->'exercises') = 'array' AND jsonb_array_length(b->'exercises') > 0
            );
            SELECT COALESCE(jsonb_agg(q.nb ORDER BY q.ord), '[]'::jsonb) INTO v_blocks
            FROM (
                SELECT y.ord,
                       (jsonb_typeof(y.b->'exercises') = 'array' AND jsonb_array_length(y.b->'exercises') > 0) AS had_ex,
                       CASE WHEN jsonb_typeof(y.b->'exercises') = 'array' THEN
                           jsonb_set(y.b, '{exercises}', COALESCE((
                               SELECT jsonb_agg(x.e ORDER BY x.eo)
                               FROM jsonb_array_elements(y.b->'exercises') WITH ORDINALITY x(e, eo)
                               WHERE public._target_applies(COALESCE(x.e->'targets', x.e->'target'), p_athlete_id, p_subgroup_id)
                           ), '[]'::jsonb))
                       ELSE y.b END AS nb
                FROM jsonb_array_elements(v_record.blocks) WITH ORDINALITY y(b, ord)
            ) q
            WHERE NOT q.had_ex OR jsonb_array_length(q.nb->'exercises') > 0;

            IF v_had_exercises AND NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_blocks) b
                WHERE jsonb_typeof(b->'exercises') = 'array' AND jsonb_array_length(b->'exercises') > 0
            ) THEN
                CONTINUE; -- rien dans cette séance ne le concerne
            END IF;
        END IF;

        v_exercises := v_record.exercises;
        IF jsonb_typeof(v_record.exercises) = 'array' THEN
            SELECT COALESCE(jsonb_agg(x.e ORDER BY x.eo), '[]'::jsonb) INTO v_exercises
            FROM jsonb_array_elements(v_record.exercises) WITH ORDINALITY x(e, eo)
            WHERE public._target_applies(COALESCE(x.e->'targets', x.e->'target'), p_athlete_id, p_subgroup_id);
        END IF;

        IF v_pending_id IS NOT NULL THEN
            UPDATE public.workouts
            SET subgroup_id = COALESCE(p_subgroup_id, v_record.subgroup_id, subgroup_id),
                blocks = v_blocks, exercises = v_exercises, description = v_desc,
                measures = v_measures
            WHERE id = v_pending_id;
        ELSE
            INSERT INTO public.workouts (
                athlete_id, coach_id, team_id, subgroup_id, group_assignment_id, date_prevue, type_seance,
                status, blocks, exercises, intensity, description, measures
            ) VALUES (
                p_athlete_id, v_record.coach_id, v_record.team_id, COALESCE(p_subgroup_id, v_record.subgroup_id),
                v_record.group_assignment_id, v_record.date_prevue, v_record.type_seance,
                'pending', v_blocks, v_exercises, v_record.intensity, v_desc, v_measures
            );
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN v_inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_athlete_group_discussions(p_team_id uuid, p_coach_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_convo_id uuid;
  v_direct_convo_id uuid;
  v_last_team_msg record;
  v_last_direct_msg record;
  v_team_unread int := 0;
  v_direct_unread int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  -- Only the coach of the team or one of its approved members may read its discussions
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND coach_id = v_user_id)
     AND NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = v_user_id AND status = 'approved') THEN
    RETURN jsonb_build_object('error', 'Accès refusé');
  END IF;

  -- Records must have a structure even when no conversation / message exists (otherwise reading
  -- v_last_*.id raises "record is not assigned yet" for anyone who has never written to their coach)
  SELECT NULL::uuid AS id, NULL::text AS content, NULL::timestamptz AS created_at, NULL::text AS type,
         NULL::text AS first_name, NULL::text AS full_name
  INTO v_last_team_msg;
  SELECT NULL::uuid AS id, NULL::text AS content, NULL::timestamptz AS created_at, NULL::text AS type,
         NULL::uuid AS sender_id
  INTO v_last_direct_msg;

  -- 1. Conversation d'équipe
  SELECT id INTO v_team_convo_id
  FROM conversations
  WHERE team_id = p_team_id AND type = 'team'
  LIMIT 1;

  IF v_team_convo_id IS NOT NULL THEN
    SELECT m.id, m.content, m.created_at, m.type, p.first_name, p.full_name
    INTO v_last_team_msg
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = v_team_convo_id
    ORDER BY m.created_at DESC
    LIMIT 1;

    SELECT COUNT(*) INTO v_team_unread
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = v_user_id
    WHERE m.conversation_id = v_team_convo_id
      AND m.sender_id != v_user_id
      AND (cp.last_read_message_id IS NULL OR m.created_at > (SELECT created_at FROM messages WHERE id = cp.last_read_message_id));
  END IF;

  -- 2. Conversation directe avec le coach
  SELECT c.id INTO v_direct_convo_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_coach_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_direct_convo_id IS NOT NULL THEN
    SELECT m.id, m.content, m.created_at, m.type, m.sender_id
    INTO v_last_direct_msg
    FROM messages m
    WHERE m.conversation_id = v_direct_convo_id
    ORDER BY m.created_at DESC
    LIMIT 1;

    SELECT COUNT(*) INTO v_direct_unread
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = v_user_id
    WHERE m.conversation_id = v_direct_convo_id
      AND m.sender_id != v_user_id
      AND (cp.last_read_message_id IS NULL OR m.created_at > (SELECT created_at FROM messages WHERE id = cp.last_read_message_id));
  END IF;

  RETURN jsonb_build_object(
    'team', jsonb_build_object(
      'conversation_id', v_team_convo_id,
      'last_message', CASE WHEN v_last_team_msg.id IS NOT NULL THEN jsonb_build_object(
        'content', v_last_team_msg.content,
        'created_at', v_last_team_msg.created_at,
        'sender_name', COALESCE(v_last_team_msg.first_name, v_last_team_msg.full_name, 'Membre')
      ) ELSE NULL END,
      'unread_count', v_team_unread
    ),
    'coach', jsonb_build_object(
      'conversation_id', v_direct_convo_id,
      'last_message', CASE WHEN v_last_direct_msg.id IS NOT NULL THEN jsonb_build_object(
        'content', v_last_direct_msg.content,
        'created_at', v_last_direct_msg.created_at,
        'is_me', (v_last_direct_msg.sender_id = v_user_id)
      ) ELSE NULL END,
      'unread_count', v_direct_unread
    )
  );
END;
$function$
;
