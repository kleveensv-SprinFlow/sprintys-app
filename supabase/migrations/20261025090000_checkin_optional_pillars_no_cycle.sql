-- 20261025090000_checkin_optional_pillars_no_cycle.sql
-- Check-in : (1) le cycle menstruel n'est plus collecté du tout -> colonne supprimée
--            (2) un pilier non renseigné vaut NULL (plus de valeurs par défaut inventées côté app) :
--                les heures de coucher/réveil deviennent facultatives.

-- 1) Le trigger de consentement santé ne doit plus référencer la colonne : on le réécrit AVANT de la supprimer.
CREATE OR REPLACE FUNCTION public.check_health_data_consent()
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
        -- Pas de consentement santé : les douleurs ne sont pas conservées
        NEW.pains := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Suppression de la colonne (données déjà purgées par 20261014090000_legal_consents_blocks.sql)
ALTER TABLE public.check_ins DROP COLUMN IF EXISTS menstruation;

-- 3) Heures facultatives
ALTER TABLE public.check_ins ALTER COLUMN bedtime DROP NOT NULL;
ALTER TABLE public.check_ins ALTER COLUMN wakeup_time DROP NOT NULL;
