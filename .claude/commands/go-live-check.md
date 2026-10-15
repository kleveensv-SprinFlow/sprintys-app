---
description: Checklist complète de mise en production (technique, sécurité, légal, stores, marketing) avec verdict GO / NO-GO
---

Orchestre une revue de pré-lancement de Sprintys en déléguant en parallèle (lecture seule, aucune modification) :

1. `qa-testeur` : `npx tsc --noEmit`, flux critiques, régressions.
2. `securite-appsec` : secrets, RLS, Edge Functions, dépendances, CI.
3. `juriste-conformite` : documents légaux, RGPD, consentements, abonnement, déclarations stores.
4. `release-stores` : version/build number, signature, fiches stores, captures, permissions, privacy manifest.
5. `marketing-growth` : landing, fiche store, messages cohérents.

Consolide en un tableau par domaine (OK / à corriger / bloquant) avec fichier:ligne, mets à jour `.claude/FINALISATION.md`, et termine par un verdict **GO / NO-GO** et les 5 actions les plus urgentes. Contexte additionnel : $ARGUMENTS
