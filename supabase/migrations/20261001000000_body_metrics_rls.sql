-- Migration: 20261001000000_body_metrics_rls.sql
-- Description: Ajout des politiques RLS pour la table body_metrics.
-- La table existe déjà avec RLS activé, mais il manque les politiques INSERT/SELECT/UPDATE/DELETE.

-- Supprimer d'éventuelles anciennes politiques
DROP POLICY IF EXISTS "body_metrics_select_policy" ON public.body_metrics;
DROP POLICY IF EXISTS "body_metrics_insert_policy" ON public.body_metrics;
DROP POLICY IF EXISTS "body_metrics_update_policy" ON public.body_metrics;
DROP POLICY IF EXISTS "body_metrics_delete_policy" ON public.body_metrics;

-- SELECT: L'athlète peut voir ses propres données, le coach peut voir celles de ses athlètes approuvés
CREATE POLICY "body_metrics_select_policy" ON public.body_metrics FOR SELECT
USING (
    athlete_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = body_metrics.athlete_id
        AND tm.status = 'approved'
        AND t.coach_id = auth.uid()
    )
);

-- INSERT: L'athlète peut insérer ses propres données
CREATE POLICY "body_metrics_insert_policy" ON public.body_metrics FOR INSERT
WITH CHECK (athlete_id = auth.uid());

-- UPDATE: L'athlète peut modifier ses propres données
CREATE POLICY "body_metrics_update_policy" ON public.body_metrics FOR UPDATE
USING (athlete_id = auth.uid());

-- DELETE: L'athlète peut supprimer ses propres données
CREATE POLICY "body_metrics_delete_policy" ON public.body_metrics FOR DELETE
USING (athlete_id = auth.uid());
