-- Les règles de conversation_participants se lisaient elles-mêmes : « infinite recursion detected in policy ».
-- Résultat : plus aucun message ne pouvait être envoyé ni lu. On passe par une fonction qui lit sans re-déclencher les règles.
create or replace function public.can_access_conversation(p_conversation uuid)
returns boolean
language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation and cp.user_id = auth.uid()
  ) or exists (
    select 1 from public.conversations c
    where c.id = p_conversation and c.type = 'team' and c.team_id is not null
      and (
        exists (select 1 from public.teams t where t.id = c.team_id and t.coach_id = auth.uid())
        or exists (select 1 from public.team_members tm
                   where tm.team_id = c.team_id and tm.user_id = auth.uid() and tm.status = 'approved')
      )
  )
$$;
revoke all on function public.can_access_conversation(uuid) from public;
grant execute on function public.can_access_conversation(uuid) to authenticated;

drop policy if exists "Users can view participants of their conversations" on public.conversation_participants;
create policy "Users can view participants of their conversations" on public.conversation_participants
  for select using (public.can_access_conversation(conversation_id));

drop policy if exists "Users can view conversations they participate in" on public.conversations;
create policy "Users can view conversations they participate in" on public.conversations
  for select using (public.can_access_conversation(id));

drop policy if exists "Users can view messages in their conversations" on public.messages;
create policy "Users can view messages in their conversations" on public.messages
  for select using (public.can_access_conversation(conversation_id));

drop policy if exists "Users can insert messages in their conversations" on public.messages;
create policy "Users can insert messages in their conversations" on public.messages
  for insert with check (public.can_access_conversation(conversation_id) and sender_id = auth.uid());
