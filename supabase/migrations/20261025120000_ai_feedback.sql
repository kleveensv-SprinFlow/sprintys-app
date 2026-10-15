-- 20261025120000_ai_feedback.sql
-- Avis des utilisateurs sur les réponses de Sprinty (pouce haut / pouce bas).
-- RLS stricte : chaque utilisateur ne peut lire, insérer, modifier ou supprimer que ses propres avis.

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  conversation_id text,
  rating smallint NOT NULL CHECK (rating IN (1, -1)),
  comment text CHECK (comment IS NULL OR length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_feedback_user_message_unique UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message ON public.ai_feedback(message_id);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feedback_select_own"
  ON public.ai_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ai_feedback_insert_own"
  ON public.ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_feedback_update_own"
  ON public.ai_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_feedback_delete_own"
  ON public.ai_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
