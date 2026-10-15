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
- Historique : `supabase_migrations.schema_migrations` doit avoir une ligne par fichier de `supabase/migrations/` (version = préfixe du nom de fichier). Réaligné le 2026-10-15 (sauvegarde : `schema_migrations_backup_20261015`). Après un `apply_migration` MCP (qui crée sa propre version horodatée), renommer la ligne : `update supabase_migrations.schema_migrations set version = '<préfixe du fichier>' where name = '<nom>';`. Ne jamais appliquer une migration à la main dans le dashboard sans l'enregistrer.
- `coach_philosophy` (20260930000000) et `delete_user` (20260930000001) ne sont PAS en base mais marquées appliquées : inutilisées, ne pas les réappliquer.
- `src/types/supabase.ts` est généré : le régénérer, ne pas l'éditer à la main. Déploiement : skill `supabase-deploy`.
