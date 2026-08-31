# Database Migration for Team Members Status

Le système de demande pour rejoindre un groupe (athlète) avec validation par le coach nécessitait que l'athlète soit dans un état d'attente. Or, le schéma initial de la base de données ne prévoyait pas de colonne `status` sur la table `team_members`.

C'est pourquoi les demandes "ne fonctionnaient pas" ou n'apparaissaient pas dans les requêtes de l'interface qui cherchaient un statut précis.

## Solution

Il faut exécuter la requête SQL suivante dans la console Supabase (SQL Editor) :

```sql
-- Ajouter la colonne status à la table team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Optionnel : Mettre à jour les membres existants pour qu'ils soient déjà approuvés
UPDATE public.team_members SET status = 'approved';
```

Le fichier de migration `supabase/migrations/20240101000001_add_status_team_members.sql` a été créé dans le projet.
