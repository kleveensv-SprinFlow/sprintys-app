# Sprintys

Application pour les athlètes et leurs coachs : séances, forme du jour, nutrition, discussions d’équipe et assistant Sprinty.

L’application s’appelle **Sprintys**. L’écran est en thème clair. Le dossier technique s’appelle encore `sprintflow-v2` : c’est normal, ce n’est pas le nom affiché.

## Lancer

1. `npm install`
2. Créer un fichier `.env` à la racine, sans le partager ni le publier :

```
EXPO_PUBLIC_SUPABASE_URL=votre_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_clef
```

3. `npm start`

## Vérifier

- `npm test`
- `npm run typecheck`

## Textes officiels

Les textes de l’application (conditions, confidentialité, mentions) sont dans `src/legal/`. Le nom, l’adresse, le SIREN et l’e-mail de contact viennent uniquement de `src/legal/publisher.ts`.

Les pages du site public se régénèrent avec :

```
node scripts/build-legal-pages.js
```

Ne pas modifier les fichiers `docs/*.html` à la main.

Contact : sprinty.flow@gmail.com

## Stores

Les textes à coller dans l’App Store et sur Google Play, et l’état des captures, sont dans `store/STORE_LISTING.md`.
