-- Fix: get_athlete_group_discussions failed with 'record v_last_direct_msg is not assigned yet'
-- for any athlete without a direct conversation with their coach (the Messages tab could not load the discussions).

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
