# Sprintys (SprintFlow) — guide pour Claude

App mobile (iOS + Android) de performance pour athlètes et coachs : séances, nutrition, poids, check-ins, coach IA « Sprinty », espace coach/équipe. Abonnement « Plus » via RevenueCat. Langue de l'app et du support : **français**.

## Stack
- Expo SDK 54 / React Native (nouvelle archi), **Expo Router** (`app/` = routing uniquement, zéro logique métier)
- TypeScript strict, **Zustand** (`src/store/`), thème centralisé `src/core/theme.ts`
- **Supabase** : Auth, Postgres + RLS, Edge Functions Deno (`supabase/functions/`), migrations (`supabase/migrations/`)
- `react-native-purchases` (RevenueCat, webhook `revenuecat_webhook`), Open-Meteo (météo)
- Build/livraison : EAS (`eas.json`), Fastlane, GitHub Actions (`.github/workflows/`)
- Pages légales publiques : `docs/` (GitHub Pages), générées par `scripts/build-legal-pages.js` depuis `src/legal/`

## Structure
- `app/` routes (`(athlete)`, `(coach)`, `(auth)`, `chat`, `legal`)
- `src/features/<domaine>/` modules fonctionnels (account, auth, billing, body, calendar, chat, checkin, coach, nutrition, onboarding, sprinty, workout…)
- `src/services/` API et moteurs de calcul · `src/shared/` composants/hooks/utils · `src/legal/` consentements, âge, éditeur
- `store/` fiches stores et captures · `legal/` notes légales · `fastlane/` · `scripts/`

## Commandes
- `npm install` · `npx expo start` · `npx tsc --noEmit` (doit passer à 0 erreur avant tout commit/release)
- Edge Functions : voir la skill `supabase-deploy`

## Règles de travail (non négociables)
1. **Exécute toi-même les commandes** (install, tsc, git, build). Ne demande jamais à l'utilisateur de les lancer — il n'est pas développeur. Exception : actions sur une plateforme externe sans accès (dashboard Supabase, consoles stores) → donne le texte/SQL **prêt à copier-coller** dans un bloc de code.
2. **Design/UX** : quand l'utilisateur partage des captures pour critique, analyse et recommande seulement. **Aucune modification de code tant qu'il n'a pas écrit « go ».**
3. **Légal** : n'invente jamais de données d'éditeur/société/mentions dans `src/legal/*`, les CGU, la politique de confidentialité. Laisse les champs inconnus intacts et demande-les.
4. **Secrets** : `.env`, `*.keystore`, tokens ne sont jamais commités, jamais affichés dans le chat. `.env` en UTF-8 sans BOM (pas de `>` PowerShell).
5. **Git** : commits en français, format `type(portée): message` (feat, fix, docs, chore…). Pas de push/force-push/merge sans demande explicite. Vérifier `git status` avant d'éditer : une autre session peut travailler sur le même dépôt.
6. **Base de données** : toute modif de schéma = nouvelle migration datée dans `supabase/migrations/` + RLS vérifiée. Jamais d'édition d'une migration déjà appliquée.
7. **Santé/nutrition** : pas d'allégations médicales ; l'IA donne des estimations, pas des diagnostics. Mineurs : voir `src/legal/age.ts`.

## Conventions TypeScript / RN
- Dans `StyleSheet.create`, utiliser `...StyleSheet.absoluteFillObject` (pas `absoluteFill`) pour éviter TS2698.
- Types manquants de libs tierces → `src/types/declarations.d.ts`, pas de `any` dans les composants métier.
- Expo Router : caster `segments as string[]` avant d'indexer (TS2493).
- Styles via le thème, pas de couleurs/espacements en dur. Textes UI en français, via un ton cohérent (tutoiement).

## Équipe d'agents (`.claude/agents/`)
Le **chef-de-projet** orchestre et délègue. Rôles : `architecte-mobile`, `dev-backend-supabase`, `designer-ui`, `ux-redacteur`, `qa-testeur`, `securite-appsec`, `juriste-conformite`, `expert-sport-nutrition`, `release-stores`, `marketing-growth`, `data-produit`.
Backlog de finalisation par domaine : `.claude/FINALISATION.md`. Commandes : `/go-live-check`, `/audit-domaine`.
Règle : un agent n'édite que son périmètre ; le reste passe par une recommandation au chef-de-projet.

## Points d'attention connus
- Le `README.md` est périmé (parle de dark mode alors que `app.json` force `light`, nom « SprintFlow V2 »). À réécrire.
- `audit_reports/` = audit historique du 2 oct. 2026 ; vérifier ce qui est réellement corrigé avant de s'y fier.
