---
paths:
  - "src/legal/**"
  - "src/features/legal/**"
  - "legal/**"
  - "docs/**"
  - "store/**"
---

# Règles légales
- N'invente jamais de donnée d'éditeur/société/mentions : source de vérité `src/legal/publisher.ts`. Champ inconnu → on le laisse et on demande.
- `docs/*.html` sont générées par `node scripts/build-legal-pages.js` : modifier `src/legal/`, puis régénérer.
- Toute modification de CGU/confidentialité incrémente la version (ré-acceptation).
- Pas d'allégation médicale ; la mention « Sprinty est une IA, pas un avis médical » doit rester.
