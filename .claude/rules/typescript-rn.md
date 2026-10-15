---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "app/**/*.tsx"
---

# Conventions TypeScript / React Native
- `StyleSheet.create` : `...StyleSheet.absoluteFillObject` (pas `absoluteFill`) → évite TS2698.
- Types manquants de libs tierces → `src/types/declarations.d.ts`, jamais de `any` dans les composants métier.
- Expo Router : caster `segments as string[]` avant d'indexer (TS2493).
- Styles uniquement via `src/core/theme.ts` (aucune couleur/espacement en dur) ; réutiliser `src/shared/components` avant de créer un composant.
- `app/` = routing seulement, logique dans `src/features` / `src/services`. Sélecteurs Zustand ciblés (pas de store entier).
- Textes UI en français, tutoiement, ton cohérent.
- Fichiers énormes (builders du calendrier, FoodSearchModal…) : `Grep` puis `Read` avec `offset`/`limit`, jamais en entier.
