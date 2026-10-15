---
description: Ajouter ou modifier une fonctionnalité de l'app, de la demande à la vérification
---

1. Reformule la demande en une phrase. Pose au plus une question, seulement si elle change vraiment le résultat.
2. `git status`, puis lis `.claude/MAP.md` pour localiser les fichiers.
3. Ouvre un écran ou composant voisin et note ses conventions (thème, composants partagés, store).
4. Écris un plan court : fichiers touchés, changements, risques. Pour un changement de parcours ou de design, présente-le et attends le « go » de l'utilisateur.
5. Implémente par petites modifications. Si la base change : nouvelle migration dans `supabase/migrations/`.
6. Exécute le workflow `verifier`.
7. Commit local en français (`feat(portée): …`). Ne pousse pas sans demande.
