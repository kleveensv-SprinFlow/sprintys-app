-- Test des règles d'ajout de participants (conversation_participants).
-- Se joue tel quel dans l'éditeur SQL Supabase : il choisit ses données, simule des comptes,
-- puis ANNULE TOUT (l'exception finale contient le compte rendu). Rien n'est conservé en base.
-- Attendu : chaque ligne du compte rendu commence par « OK ». Une ligne « ÉCHEC » = règle trop ouverte ou trop stricte.
do $$
declare
  v_conv uuid; v_team uuid; v_coach uuid; v_member uuid; v_outsider uuid; v_direct uuid; v_other uuid;
  v_report text[] := '{}';
  v_n int;

begin
  -- Données réelles : une conversation d'équipe, son coach, un membre approuvé, un compte étranger, une conversation privée
  select c.id, c.team_id, t.coach_id into v_conv, v_team, v_coach
    from conversations c join teams t on t.id = c.team_id where c.type = 'team' limit 1;
  select user_id into v_member from team_members where team_id = v_team and status = 'approved' limit 1;
  select p.id into v_outsider from profiles p
    where p.id not in (select coach_id from teams) and p.id not in (select user_id from team_members)
      and p.id not in (select user_id from conversation_participants) limit 1;
  select conversation_id into v_direct from conversation_participants
    where conversation_id in (select id from conversations where type = 'direct') limit 1;
  select user_id into v_other from conversation_participants where conversation_id = v_direct limit 1;
  if v_conv is null or v_member is null or v_outsider is null or v_direct is null then
    raise exception 'DONNÉES INSUFFISANTES pour le test';
  end if;

  -- Règle de la migration appliquée à l'intérieur du test (annulée à la fin)
  drop policy if exists "Users can insert participants if they are coach or self" on public.conversation_participants;
  drop policy if exists "Users can add themselves to an accessible conversation" on public.conversation_participants;
  create policy "Users can add themselves to an accessible conversation" on public.conversation_participants
    for insert to authenticated
    with check (user_id = auth.uid() and public.can_access_conversation(conversation_id));

  -- 1. Un compte étranger ne peut pas s'ajouter à une conversation privée
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into conversation_participants(conversation_id, user_id) values (v_direct, v_outsider);
    v_report := v_report || 'ÉCHEC 1 : un étranger a pu rejoindre une conversation privée'::text;
  exception when others then
    v_report := v_report || 'OK 1 : un étranger ne peut pas rejoindre une conversation privée'::text;
  end;

  -- 2. ... ni une conversation d'équipe dont il ne fait pas partie
  begin
    insert into conversation_participants(conversation_id, user_id) values (v_conv, v_outsider);
    v_report := v_report || 'ÉCHEC 2 : un étranger a pu rejoindre une conversation d''équipe'::text;
  exception when others then
    v_report := v_report || 'OK 2 : un étranger ne peut pas rejoindre une conversation d''équipe'::text;
  end;

  -- 3. Il ne voit aucun message de ces conversations
  select count(*) into v_n from messages where conversation_id in (v_conv, v_direct);
  v_report := v_report || case when v_n = 0 then 'OK 3 : l''étranger ne lit aucun message' else 'ÉCHEC 3 : l''étranger lit ' || v_n || ' messages' end;

  -- 4. Un membre approuvé peut s'ajouter lui-même à la conversation de son équipe (cas ensureParticipant)
  reset role;
  delete from conversation_participants where conversation_id = v_conv and user_id = v_member;
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into conversation_participants(conversation_id, user_id) values (v_conv, v_member);
    v_report := v_report || 'OK 4 : un membre approuvé peut rejoindre la conversation de son équipe'::text;
  exception when others then
    v_report := v_report || 'ÉCHEC 4 : un membre approuvé ne peut plus rejoindre sa conversation d''équipe (' || sqlerrm || ')';
  end;

  -- 5. Un membre ne peut pas ajouter quelqu'un d'autre
  begin
    insert into conversation_participants(conversation_id, user_id) values (v_conv, v_outsider);
    v_report := v_report || 'ÉCHEC 5 : un membre a pu ajouter un tiers'::text;
  exception when others then
    v_report := v_report || 'OK 5 : un membre ne peut pas ajouter un tiers'::text;
  end;

  -- 6. Un visiteur non connecté ne peut rien ajouter
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    insert into conversation_participants(conversation_id, user_id) values (v_conv, v_outsider);
    v_report := v_report || 'ÉCHEC 6 : un visiteur non connecté a pu s''ajouter'::text;
  exception when others then
    v_report := v_report || 'OK 6 : un visiteur non connecté ne peut rien ajouter'::text;
  end;
  reset role;

  -- 7. La création d'une conversation privée par la fonction interne fonctionne toujours (coach -> membre)
  perform set_config('request.jwt.claims', json_build_object('sub', v_coach, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.get_or_create_direct_conversation(v_member);
    v_report := v_report || 'OK 7 : get_or_create_direct_conversation fonctionne (coach vers membre)'::text;
  exception when others then
    v_report := v_report || 'ÉCHEC 7 : get_or_create_direct_conversation (' || sqlerrm || ')';
  end;
  reset role;

  -- Compte rendu, puis annulation de tout
  raise exception E'COMPTE RENDU (tout est annulé) :\n%', array_to_string(v_report, E'\n');
end $$;
