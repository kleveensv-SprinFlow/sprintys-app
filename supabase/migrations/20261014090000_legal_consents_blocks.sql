-- Conformité stores / RGPD :
-- 1. profiles.date_of_birth (l'inscription l'envoyait déjà : sans la colonne, tout l'upsert du profil échouait)
--    + âge minimum 15 ans vérifié côté serveur.
-- 2. Accords (user_consents) : preuve non modifiable. Plus de suppression, et une mise à jour ne peut que
--    poser la date de retrait.
-- 3. Blocage entre utilisateurs (exigence Apple 1.2) et signalements plus précis.
-- 4. Purge des anciennes données de cycle menstruel, qui ne sont plus collectées.

-- 1. Date de naissance + âge minimum ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

CREATE OR REPLACE FUNCTION public.enforce_minimum_age()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > (current_date - interval '15 years')::date THEN
    RAISE EXCEPTION 'Sprintys est réservé aux personnes d''au moins 15 ans.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_minimum_age_trigger ON public.profiles;
CREATE TRIGGER enforce_minimum_age_trigger
BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_minimum_age();

-- 2. Accords non modifiables --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own consents" ON public.user_consents;

CREATE OR REPLACE FUNCTION public.protect_consent_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only allowed change: withdrawing an active consent (revoked_at from NULL to a date)
  IF OLD.revoked_at IS NOT NULL
     OR NEW.revoked_at IS NULL
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.consent_type IS DISTINCT FROM OLD.consent_type
     OR NEW.consent_text IS DISTINCT FROM OLD.consent_text
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un accord enregistré ne peut pas être modifié, seulement retiré.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_consent_record_trigger ON public.user_consents;
CREATE TRIGGER protect_consent_record_trigger
BEFORE UPDATE ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.protect_consent_record();

-- created_at is set by the server, never by the app
CREATE OR REPLACE FUNCTION public.stamp_consent_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_at := now();
  NEW.revoked_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_consent_record_trigger ON public.user_consents;
CREATE TRIGGER stamp_consent_record_trigger
BEFORE INSERT ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.stamp_consent_record();

-- 3. Blocage et signalements --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS message_id uuid;
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

-- 4. Données de cycle menstruel : plus collectées, on efface l'historique ------------------------
UPDATE public.check_ins SET menstruation = NULL WHERE menstruation IS NOT NULL;
