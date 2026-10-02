-- Migration: 20261002000003_health_data_consents.sql
-- Description: Architecture for GDPR explicit consent for health data (pains, menstruation).

CREATE TABLE public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- e.g., 'health_data'
    consent_text TEXT NOT NULL, -- The exact text the user agreed to
    version TEXT NOT NULL, -- The version of the privacy policy or text
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_user_consents_user_type ON public.user_consents(user_id, consent_type);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consents" ON public.user_consents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents" ON public.user_consents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consents" ON public.user_consents
FOR UPDATE USING (auth.uid() = user_id);

-- Enforce health data restrictions in check_ins
-- We modify check_ins policies to prevent saving 'pains' or 'menstruation' if no valid consent exists.
-- A check_in can still be created, but those specific fields must be null unless consented.

-- Supabase RLS cannot easily throw errors or modify incoming data inside the policy silently 
-- based on complex logic without slowing down queries.
-- Instead, we will use a trigger to NULL out the restricted fields if the user has no valid consent.

CREATE OR REPLACE FUNCTION check_health_data_consent()
RETURNS trigger AS $$
DECLARE
    v_has_consent BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_consents
        WHERE user_id = NEW.athlete_id
        AND consent_type = 'health_data'
        AND revoked_at IS NULL
    ) INTO v_has_consent;

    IF NOT v_has_consent THEN
        -- Strip health-related data
        NEW.pains := NULL;
        NEW.menstruation := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_health_data_consent_trigger
BEFORE INSERT OR UPDATE ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION check_health_data_consent();
