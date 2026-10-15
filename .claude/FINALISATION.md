# Finalisation de Sprintys — backlog par domaine

Tenu à jour par `chef-de-projet`. Cocher uniquement avec preuve (commande, diff, capture).
Point de départ : état du dépôt le 2026-10-15 (v1.1.0, build 130). À confirmer par un audit avant d'agir.

## Technique (architecte-mobile, qa-testeur)
- [ ] `npx tsc --noEmit` à 0 erreur (l'audit du 2 oct. en signalait 9 : vérifier si corrigées)
- [ ] Mettre en place Jest + tests sur la logique pure (calculs, `src/legal`)
- [ ] Ajouter scripts `typecheck`, `lint`, `test` dans `package.json`
- [ ] Parcours critiques athlète / coach / abonnement testés sur appareil réel
- [ ] Gestion hors-ligne et erreurs réseau uniformes
- [ ] Rapport de crashs (ex. Sentry) — avec `data-produit`

## Backend (dev-backend-supabase)
- [ ] RLS vérifiée sur toutes les tables (advisors Supabase)
- [ ] Export et suppression de compte couvrent toutes les tables + storage
- [ ] Quotas / anti-abus sur les fonctions IA
- [ ] Migrations rejouables de zéro sur une base vide

## Sécurité (securite-appsec)
- [ ] Aucun secret dans git ni dans l'historique ; `sprintflow-release.keystore` hors du dépôt (vérifier s'il est tracké, sinon rotation)
- [ ] `npm audit` traité
- [ ] Permissions des workflows GitHub minimales

## UI / UX (designer-ui, ux-redacteur)
- [ ] Audit de cohérence du design system (tokens, composants partagés)
- [ ] États vide / chargement / erreur sur chaque écran
- [ ] Contrastes AA, cibles tactiles, texte agrandi
- [ ] Onboarding → première valeur en < 2 minutes
- [ ] Paywall transparent (prix, essai, résiliation)
- [ ] Ton et messages unifiés en français

## Légal (juriste-conformite)
- [ ] CGU, confidentialité, mentions légales cohérentes avec `src/legal/publisher.ts`
- [ ] Consentement explicite données de santé ; politique mineurs cohérente
- [ ] Sous-traitants et transferts hors UE listés
- [ ] Mentions abonnement conformes (Apple 3.1.2, Google, droit de rétractation)
- [ ] Data Safety (Google) et App Privacy (Apple) alignés avec le code réel

## Contenu métier (expert-sport-nutrition)
- [ ] Formules (calories, macros, charge) validées avec sources
- [ ] Base exercices et Ciqual nettoyées
- [ ] Prompts de Sprinty : garde-fous santé

## Stores (release-stores)
- [ ] Version/build alignés, builds CI verts (APK, AAB, TestFlight)
- [ ] Fiches stores FR complètes, mots-clés ASO, captures aux bons formats
- [ ] Produits d'abonnement créés et testés (achat, restauration)
- [ ] Compte de démo pour la review

## Marketing (marketing-growth)
- [ ] Positionnement et proposition de valeur rédigés
- [ ] Landing `docs/index.html` à jour (captures, liens stores, légal)
- [ ] Séquences email onboarding / réengagement
- [ ] Plan de lancement (clubs, coachs, réseaux)

## Hygiène du dépôt
- [ ] Réécrire `README.md` (périmé : dark mode, « V2 »)
- [ ] Décider du sort de `audit_reports/`, `README_DB_FIX.md` (migration déjà présente), `build_to_drive.ps1` (chemin Google Drive personnel), `ciqual.xlsx` / `exercises_db.json` / `supabase_coach_tables.sql` / `ciqual_schema.sql` (fichiers de données à la racine)
