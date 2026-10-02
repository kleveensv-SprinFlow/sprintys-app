-- Migration pour l'optimisation des performances (Phase 6)
-- Ajout d'index sur les colonnes fréquemment requêtées (clés étrangères, dates).

-- 1. Table meal_logs
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, consumed_at);

-- 2. Table teams
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);

-- 3. Table subgroups
CREATE INDEX IF NOT EXISTS idx_subgroups_team_id ON public.subgroups(team_id);

-- 4. Table team_members (user_id car team_id est au début de la PK)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- 5. Table competitions
CREATE INDEX IF NOT EXISTS idx_competitions_team_date ON public.competitions(team_id, comp_date);

-- 6. Table body_metrics (si elle existe avec ces colonnes)
CREATE INDEX IF NOT EXISTS idx_body_metrics_athlete_date ON public.body_metrics(athlete_id, created_at);

-- 7. Table profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
