-- Active l'envoi des notifications push (à lancer quand les identifiants Firebase / Apple sont en place
-- et que les secrets de la fonction `push` sont renseignés : voir store/PUSH_SETUP.md).
UPDATE public.app_config SET value = 'true' WHERE key = 'push_enabled';

-- Retour arrière : plus aucune notification n'est mise en file
-- UPDATE public.app_config SET value = 'false' WHERE key = 'push_enabled';
