-- Sourdine par conversation : plus de notification pour cette conversation (les messages restent reçus).
alter table public.conversation_participants add column if not exists muted boolean not null default false;

create or replace function public.push_on_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_type text;
  v_team uuid;
  v_name text;
  r record;
BEGIN
  BEGIN
    IF NOT public._push_on() OR NEW.content IS NULL OR btrim(NEW.content) = '' THEN RETURN NEW; END IF;
    IF COALESCE(NEW.type::text, 'text') <> 'text' THEN RETURN NEW; END IF; -- polls, system messages…
    SELECT c.type::text, c.team_id INTO v_type, v_team FROM public.conversations c WHERE c.id = NEW.conversation_id;
    SELECT COALESCE(NULLIF(p.first_name, ''), NULLIF(p.full_name, ''), 'Nouveau message') INTO v_name FROM public.profiles p WHERE p.id = NEW.sender_id;
    FOR r IN
      SELECT cp.user_id FROM public.conversation_participants cp
      WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id
        AND cp.muted = false
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = cp.user_id AND b.blocked_id = NEW.sender_id)
    LOOP
      PERFORM public._push_enqueue(
        r.user_id, 'message', COALESCE(v_name, 'Nouveau message'), NEW.content,
        jsonb_build_object('route', CASE WHEN v_type = 'team' AND v_team IS NOT NULL THEN '/chat/team/' || v_team::text ELSE '/chat/direct/' || NEW.sender_id::text END,
                           'conversation', NEW.conversation_id::text)
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;
