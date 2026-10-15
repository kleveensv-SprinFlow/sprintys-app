---
paths:
  - "supabase/**"
  - "*.sql"
---

# Règles Supabase
- Schéma : toujours une **nouvelle migration** `AAAAMMJJHHMMSS_nom.sql`, idempotente ; jamais d'édition d'une migration déjà appliquée.
- RLS active sur chaque table ; tester athlète / coach de l'équipe / tiers. Vues analytiques en `security_invoker`.
- Edge Functions : valider JWT et entrées, pas de secret dans les logs, quotas sur l'IA.
- Export RGPD et suppression de compte doivent couvrir toute nouvelle table/bucket.
- `src/types/supabase.ts` est généré : le régénérer, ne pas l'éditer à la main. Déploiement : skill `supabase-deploy`.
