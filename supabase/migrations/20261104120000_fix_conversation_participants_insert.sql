-- Faille : la règle d'ajout d'un participant (« coach or self ») avait with_check = true.
-- N'importe quel compte connecté pouvait donc s'inscrire dans une conversation dont il connaissait l'identifiant,
-- puis lire tous ses messages (can_access_conversation devenait vrai).
--
-- Désormais, on ne peut ajouter QUE soi-même, dans une conversation déjà accessible (cas d'une conversation d'équipe
-- où l'on est coach ou membre approuvé). La création d'une conversation privée passe par la fonction
-- get_or_create_direct_conversation (SECURITY DEFINER), qui ne dépend pas de cette règle.
drop policy if exists "Users can insert participants if they are coach or self" on public.conversation_participants;

create policy "Users can add themselves to an accessible conversation" on public.conversation_participants
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_conversation(conversation_id));
