-- Activation des abonnements (à lancer UNE fois, au moment de soumettre la version avec les abonnements).
-- 1. Chaque compte existant reçoit 60 jours de Plus offerts (athlète : athlete_plus ; coach : coach_plus),
--    pour que personne ne perde une fonction le jour de l'activation. Ligne à part (product_id 'launch_gift_60d'),
--    donc un achat réel ne l'écrase pas et l'accès offert s'arrête seul à l'échéance.
-- 2. La facturation est activée.
-- Retour arrière immédiat : UPDATE public.app_config SET value = 'false' WHERE key = 'billing_enabled';

BEGIN;

INSERT INTO public.subscriptions (user_id, product_id, plan, store, status, current_period_end, will_renew, source)
SELECT p.id,
       'launch_gift_60d',
       CASE WHEN p.role = 'coach' THEN 'coach_plus' ELSE 'athlete_plus' END,
       NULL,
       'active',
       now() + interval '60 days',
       false,
       'promo'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email NOT LIKE '%@sprintys.test'          -- comptes de démonstration et de test : restent gratuits
ON CONFLICT (user_id, product_id) DO NOTHING;

UPDATE public.app_config SET value = 'true' WHERE key = 'billing_enabled';

COMMIT;
