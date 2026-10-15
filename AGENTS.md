# Sprintys — instructions pour agents (Antigravity / Gemini)

Ce fichier est autonome. Il décrit la méthode de travail à suivre à la lettre : elle vise un résultat fiable, pas rapide. Dans le doute, vérifie plutôt que de supposer.

## Le projet
App mobile iOS + Android de performance pour athlètes et coachs (séances, nutrition, poids, check-ins, coach IA « Sprinty », espace coach/équipe, abonnement « Plus » via RevenueCat). Tout est en **français** (UI, commits, réponses). L'utilisateur n'est **pas développeur** : parle simplement, sans jargon.
Stack : Expo SDK 54 / React Native + Expo Router, TypeScript strict, Zustand, Supabase (Auth, Postgres+RLS, Edge Functions Deno), RevenueCat, EAS/Fastlane/GitHub Actions.
Carte du code : lis `.claude/MAP.md` avant de chercher quoi que ce soit.

## Règles absolues
1. Exécute toi-même toutes les commandes (install, tsc, git, build). Ne demande jamais à l'utilisateur de les lancer. Seule exception : une action sur une plateforme où tu n'as pas accès (dashboard Supabase, consoles des stores) → donne le texte/SQL exact à copier dans un bloc de code.
2. Si l'utilisateur partage des captures pour une critique design : analyse et recommande seulement. **Ne modifie aucun code tant qu'il n'a pas écrit « go ».**
3. N'invente **jamais** de donnée légale (éditeur, société, adresse, mentions). Source : `src/legal/publisher.ts`. Info manquante → demande.
4. Ne commite jamais de secret (`.env`, `*.keystore`, tokens) et ne les affiche pas.
5. Pas de `git push`, force-push ni merge sans demande explicite. Commits en français : `type(portée): message`.
6. Schéma base de données : toujours une **nouvelle** migration datée dans `supabase/migrations/`, jamais d'édition d'une migration existante, RLS activée.
7. Santé : aucune allégation médicale. L'IA estime, elle ne diagnostique pas.
8. Ne supprime ni ne réécris un fichier que tu n'as pas lu.

## Méthode (toujours dans cet ordre)
1. **Comprendre** : reformule la demande en une phrase. Si un point change vraiment le résultat et que tu ne peux pas le déduire du code, pose UNE question courte ; sinon choisis le défaut raisonnable et dis-le.
2. **État du dépôt** : `git status` et `git log --oneline -5`. Une autre session a pu modifier le code ; ne l'écrase pas.
3. **Localiser** : `MAP.md`, puis recherche (grep) d'un nom, puis lecture **par tranches** du fichier concerné. Ne lis jamais en entier un fichier de plus de 400 lignes (builders du calendrier, FoodSearchModal, `src/types/supabase.ts`, fichiers de données).
4. **Imiter l'existant** : ouvre un composant voisin et copie ses conventions (thème, composants partagés de `src/shared/components`, nommage). Ne crée pas ce qui existe déjà.
5. **Planifier** : si la tâche touche plus de 2 fichiers, écris un plan court (fichiers, changements, risques) avant d'éditer.
6. **Éditer petit** : modifications ciblées, une préoccupation à la fois. Pas de refactor non demandé, pas de commentaires inutiles, pas de code mort.
7. **Vérifier — obligatoire** : `npx tsc --noEmit` doit afficher 0 erreur. Relis ton `git diff` comme un relecteur : cas limites, erreurs réseau, état vide/chargement/erreur, rôle athlète vs coach. Si tu ne peux pas vérifier quelque chose, dis-le clairement.
8. **Rendre compte** : en français simple, dis ce qui a changé, ce qui a été vérifié et comment, ce qui reste. Ne dis « terminé » que si la vérification a réussi. Si ça a échoué, montre l'erreur réelle.

## Conventions de code
- `StyleSheet.create` : utilise `...StyleSheet.absoluteFillObject`, pas `absoluteFill`.
- Types de libs tierces manquants → `src/types/declarations.d.ts`; pas de `any` dans les composants métier.
- Expo Router : `segments as string[]` avant d'indexer.
- Styles uniquement via `src/core/theme.ts` (aucune couleur ni espacement en dur). `app/` = routing seulement; la logique va dans `src/features` ou `src/services`.
- Sélecteurs Zustand ciblés. Zones tactiles ≥ 44 pt, contrastes lisibles.
- Textes UI en français, tutoiement, phrases courtes, erreurs qui disent quoi faire.
- `docs/*.html` sont générées : modifier `src/legal/` puis lancer `node scripts/build-legal-pages.js`.

## Jouer un rôle
Les rôles d'équipe sont décrits dans `.claude/agents/<rôle>.md` (chef-de-projet, architecte-mobile, dev-backend-supabase, designer-ui, ux-redacteur, qa-testeur, securite-appsec, juriste-conformite, expert-sport-nutrition, release-stores, marketing-growth, data-produit). Pour une tâche d'un domaine, lis le fichier du rôle et respecte son périmètre et ses règles. Backlog global : `.claude/FINALISATION.md`. Déploiement Supabase : `.claude/skills/supabase-deploy/SKILL.md`.

## Ce qu'il ne faut pas faire
- Dire que c'est fini sans avoir lancé `tsc`.
- Modifier plusieurs sujets dans un même changement.
- Deviner un nom de fichier, de table ou de colonne : cherche-le.
- Réécrire un gros fichier en entier pour changer quelques lignes.
- Ajouter une dépendance sans le dire et sans justification.
