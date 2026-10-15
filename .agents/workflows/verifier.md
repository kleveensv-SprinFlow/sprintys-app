---
description: Vérification complète avant de dire qu'une tâche est terminée
---

1. Lance `npx tsc --noEmit`. S'il y a des erreurs, corrige-les (ou explique pourquoi elles préexistaient en comparant avec `git stash`/`git diff`).
2. Lance `git status` puis `git diff` et relis chaque changement comme un relecteur : bug possible, cas limite, état vide/chargement/erreur, hors-ligne, rôle athlète vs coach, secret oublié, `console.log` oublié.
3. Vérifie que seuls les fichiers prévus sont modifiés.
4. Si une migration SQL est ajoutée : RLS présente, idempotente, export RGPD et suppression de compte à jour.
5. Résume en français simple : ce qui change, ce qui a été vérifié, ce qui n'a pas pu l'être.
