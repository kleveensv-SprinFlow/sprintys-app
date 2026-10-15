# Sprintys (SprintFlow) — guide pour Claude

App mobile (iOS + Android) de performance pour athlètes et coachs : séances, nutrition, poids, check-ins, coach IA « Sprinty », espace coach/équipe, abonnement « Plus » (RevenueCat). Langue de l'app et du support : **français**.

## Stack
Expo SDK 54 / React Native (nouvelle archi) + Expo Router · TypeScript strict · Zustand · thème `src/core/theme.ts` · Supabase (Auth, Postgres+RLS, Edge Functions Deno) · RevenueCat · EAS + Fastlane + GitHub Actions · pages légales `docs/` générées depuis `src/legal/`.
**Carte du code : `.claude/MAP.md` (lis-la avant de chercher).** Conventions détaillées par zone : `.claude/rules/` (chargées automatiquement).

## Commandes
`npm install` · `npx expo start` · `npx tsc --noEmit` (0 erreur avant tout commit/release) · Edge Functions : skill `supabase-deploy`.

## Règles non négociables
1. **Exécute toi-même les commandes** ; l'utilisateur n'est pas développeur. Seule exception : actions sur plateforme externe sans accès (dashboard Supabase, consoles stores) → texte/SQL **prêt à copier** en bloc de code.
2. **Design/UX** : sur des captures pour critique, recommande seulement. **Aucune modification de code avant son « go ».**
3. **Légal** : n'invente jamais de données d'éditeur/mentions ; demande les infos manquantes.
4. **Secrets** (`.env`, keystores, tokens) : jamais commités ni affichés. `.env` en UTF-8 sans BOM (pas de `>` PowerShell).
5. **Git** : commits en français `type(portée): message`. Pas de push/force-push/merge sans demande. `git status` avant d'éditer (autres sessions possibles).
6. **Santé** : pas d'allégation médicale, l'IA estime et ne diagnostique pas. Mineurs : `src/legal/age.ts`.

## Sobriété en tokens (sans baisser la qualité du code)
- Chercher avant de lire : `MAP.md` → `Grep` → `Read` avec `offset`/`limit`. Ne jamais lire en entier un fichier > 400 lignes, `src/types/supabase.ts`, ni les données (`exercises_db.json`, `foodCatalogData.ts`, seeds SQL).
- Ne relis pas un fichier que tu viens d'éditer, ne re-fais pas une recherche déjà faite, groupe les appels indépendants en parallèle.
- Édite par petits `Edit` ciblés, pas de réécriture de fichier entier.
- Pas d'agent pour une tâche de quelques appels d'outils. Agents en lecture seule pour les audits larges ; rapport de retour ≤ 300 mots, avec `fichier:ligne`, sans recopier de code.
- Vérifie toujours avant de conclure (`tsc`, relecture du diff) : la sobriété ne supprime jamais la vérification.
- Une tâche = une conversation : `/clear` entre deux sujets, `/compact` si la session s'allonge.

## Équipe d'agents (`.claude/agents/`)
`chef-de-projet` orchestre ; rôles : `architecte-mobile`, `dev-backend-supabase`, `designer-ui`, `ux-redacteur`, `qa-testeur`, `securite-appsec`, `juriste-conformite`, `expert-sport-nutrition`, `release-stores`, `marketing-growth`, `data-produit`. Un agent n'édite que son périmètre. Backlog : `.claude/FINALISATION.md`. Commandes : `/go-live-check`, `/audit-domaine`.

## Points d'attention
- `README.md` périmé (dark mode alors que `app.json` force `light`, « V2 »). À réécrire.
- `audit_reports/` = audit du 2 oct. 2026 : vérifier ce qui est réellement corrigé avant de s'y fier.
