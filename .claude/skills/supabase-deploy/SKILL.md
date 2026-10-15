---
name: supabase-deploy
description: Runbook de déploiement des Edge Functions Supabase et des migrations pour Sprintys. À utiliser pour déployer chat, search-competitions, delete_account_and_assets, export_data, sprinty, revenuecat_webhook ou appliquer une migration.
---

# Déploiement Supabase

## Fichier `.env`
UTF-8 **sans BOM** et sans octet nul. Ne jamais créer/modifier `.env` avec l'opérateur `>` de PowerShell (produit de l'UTF-16). Utiliser l'outil Write.

## Edge Functions (sans Docker local)
Bundling côté serveur via la CLI Supabase. Le jeton `SUPABASE_ACCESS_TOKEN` est demandé à l'utilisateur au besoin (jamais écrit dans un fichier versionné, jamais répété dans le chat). L'identifiant du projet est dans `supabase/.temp/project-ref`.

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<jeton>"
$ref = (Get-Content supabase/.temp/project-ref).Trim()
npx supabase functions deploy --project-ref $ref chat
npx supabase functions deploy --project-ref $ref search-competitions
npx supabase functions deploy --project-ref $ref delete_account_and_assets
npx supabase functions deploy --project-ref $ref export_data
npx supabase functions deploy --project-ref $ref sprinty
npx supabase functions deploy --project-ref $ref revenuecat_webhook
```

## Migrations
- Nouvelle migration datée dans `supabase/migrations/`, idempotente.
- Application : `npx supabase db push --project-ref $ref` ou outil MCP Supabase `apply_migration`. Si seul le dashboard est possible, fournir le SQL prêt à copier-coller à l'utilisateur.
- Après application : vérifier les advisors sécurité/perf (MCP `get_advisors`) et que la RLS est active.

## Avant de déployer
Demander confirmation à l'utilisateur : un déploiement touche la production.
