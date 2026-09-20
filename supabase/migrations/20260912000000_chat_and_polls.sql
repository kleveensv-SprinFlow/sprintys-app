-- conversations table
CREATE TYPE conversation_type AS ENUM ('team', 'direct');

CREATE TABLE public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type conversation_type NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- conversation_participants
CREATE TABLE public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_message_id UUID,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- messages table
CREATE TYPE message_type AS ENUM ('text', 'poll', 'system');

CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type message_type DEFAULT 'text'::message_type NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- message_likes
CREATE TABLE public.message_likes (
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (message_id, user_id)
);

-- poll_votes
CREATE TABLE public.poll_votes (
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (message_id, option_id, user_id)
);

-- RLS Enable
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Participants can read their conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
    id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
);

-- Participants can view the participants list of their conversations
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants FOR SELECT 
USING (
    conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
);

-- Users can update their own last_read_message_id
CREATE POLICY "Users can update their own participant record" 
ON public.conversation_participants FOR UPDATE 
USING (user_id = auth.uid());

-- Participants can insert participants (e.g. coach creates a direct chat)
DROP POLICY IF EXISTS "Users can insert participants if they are coach or self" ON public.conversation_participants;
CREATE POLICY "Users can insert participants if they are coach or self"
ON public.conversation_participants FOR INSERT
WITH CHECK (
    -- 1. L'appelant est le coach de l'équipe liée à la conversation
    EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.teams t ON c.team_id = t.id
        WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    OR
    -- 2. L'appelant est un membre approuvé de l'équipe (peut rejoindre le chat d'équipe)
    (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.team_members tm ON c.team_id = tm.team_id
            WHERE c.id = conversation_id AND tm.user_id = auth.uid() AND tm.status = 'approved'
        )
    )
    OR
    -- 3. L'appelant est DEJA participant (permet d'inviter l'autre personne dans un chat direct)
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR
    -- 4. Initialisation : S'ajouter soi-même dans une nouvelle conversation vide
    (
        user_id = auth.uid() AND
        NOT EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
        )
    )
);

-- Allow creating conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
    conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
    conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
);

-- Likes
CREATE POLICY "Users can view likes in their conversations" 
ON public.message_likes FOR SELECT 
USING (
    message_id IN (
        SELECT id FROM public.messages WHERE conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own likes" 
ON public.message_likes FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
        SELECT id FROM public.messages WHERE conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their own likes" 
ON public.message_likes FOR DELETE 
USING (user_id = auth.uid());

-- Poll Votes
CREATE POLICY "Users can view poll votes in their conversations" 
ON public.poll_votes FOR SELECT 
USING (
    message_id IN (
        SELECT id FROM public.messages WHERE conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own poll votes" 
ON public.poll_votes FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
        SELECT id FROM public.messages WHERE type = 'poll' AND conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their own poll votes" 
ON public.poll_votes FOR DELETE 
USING (user_id = auth.uid());

BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_likes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
COMMIT;
