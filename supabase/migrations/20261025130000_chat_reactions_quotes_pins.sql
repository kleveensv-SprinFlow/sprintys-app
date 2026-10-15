-- 20261025130000_chat_reactions_quotes_pins.sql
-- Évolution du chat d'équipe : réactions emoji, messages épinglés par le coach.

-- 1. Réactions sur message_likes (ajout de la colonne reaction, défaut ❤️)
ALTER TABLE public.message_likes
  ADD COLUMN IF NOT EXISTS reaction text NOT NULL DEFAULT '❤️';

-- Permettre la mise à jour de sa propre réaction (changement d'emoji)
DROP POLICY IF EXISTS "Users can update their reaction" ON public.message_likes;
CREATE POLICY "Users can update their reaction"
  ON public.message_likes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Message épinglé sur conversations (annonce du coach)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Fonction RPC sécurisée pour épingler / désépingler une annonce
CREATE OR REPLACE FUNCTION public.pin_conversation_message(
  p_conversation_id uuid,
  p_message_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_is_coach boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found'; END IF;

  -- Vérification des droits : coach de l'équipe pour un salon d'équipe, ou participant en direct
  IF v_conv.team_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = v_conv.team_id AND coach_id = v_uid) INTO v_is_coach;
    IF NOT v_is_coach THEN
      RAISE EXCEPTION 'Only team coach can pin announcements';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = p_conversation_id AND user_id = v_uid) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  -- Si un message_id est spécifié, vérifier qu'il appartient bien à cette conversation
  IF p_message_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.messages WHERE id = p_message_id AND conversation_id = p_conversation_id) THEN
      RAISE EXCEPTION 'Message does not belong to this conversation';
    END IF;
  END IF;

  UPDATE public.conversations
  SET pinned_message_id = p_message_id,
      pinned_by = CASE WHEN p_message_id IS NOT NULL THEN v_uid ELSE NULL END,
      pinned_at = CASE WHEN p_message_id IS NOT NULL THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'pinned_message_id', p_message_id,
    'pinned_by', CASE WHEN p_message_id IS NOT NULL THEN v_uid ELSE NULL END,
    'pinned_at', CASE WHEN p_message_id IS NOT NULL THEN now() ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pin_conversation_message(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_conversation_message(uuid, uuid) TO authenticated;
