---
name: supabase_deploy
description: Runbook for deploying Supabase Edge Functions and running migrations in Sprintflow
---

# Supabase Deployment Runbook

### Environment Files
- Ensure `.env` is encoded in pure UTF-8 without BOM or null bytes (`\0`). Avoid PowerShell default redirect operators (`>`) which can introduce UTF-16 encoding with null bytes.

### Edge Functions Deployment (without local Docker)
Use server-side bundling via Supabase CLI with `SUPABASE_ACCESS_TOKEN`:

```powershell
$env:SUPABASE_ACCESS_TOKEN="<token>"
npx supabase functions deploy --project-ref tmmhznwstzmgnwoqlgqu chat
npx supabase functions deploy --project-ref tmmhznwstzmgnwoqlgqu search-competitions
npx supabase functions deploy --project-ref tmmhznwstzmgnwoqlgqu delete_account_and_assets
```
