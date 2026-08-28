-- 1. Table des groupes (Teams)
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table des sous-groupes (Sprint, Demi-fond, etc.)
CREATE TABLE public.subgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Table de liaison Athlète <-> Groupe (Team Members)
CREATE TABLE public.team_members (
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subgroup_id UUID REFERENCES public.subgroups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- 4. Table des Compétitions
CREATE TABLE public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    comp_type TEXT NOT NULL,
    location TEXT NOT NULL,
    comp_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Convocations des athlètes aux compétitions
CREATE TABLE public.competition_participants (
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (competition_id, user_id)
);
