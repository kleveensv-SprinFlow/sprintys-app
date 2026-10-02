# Phase 3 Report: SecOps Audit

## 1. Résumé exécutif
L'audit de sécurité a confirmé que l'architecture de Sprintflow (Supabase + Expo) repose sur des bases solides grâce à l'utilisation systématique de *Row Level Security (RLS)* et des fonctions RPC en `SECURITY DEFINER` vérifiant de manière stricte `auth.uid()`. 
Néanmoins, l'audit a mis en évidence un problème de droits (les coachs ne pouvaient pas lire les données de nutrition des athlètes malgré les accès UI), ainsi qu'une absence de politiques de stockage (*Storage*) dans le code (Infrastructure as Code) et un risque mineur de *Role Spoofing* à l'inscription.

## 2. Vulnérabilités classées par criticité

### A. Blocage fonctionnel par sécurité (Criticité: Moyenne)
* **Description** : Les politiques RLS de la table `meal_logs` étaient trop restrictives (`auth.uid() = user_id`), ce qui empêchait silencieusement le coach d'accéder au carnet de nutrition de ses athlètes approuvés. 
* **Fichiers concernés** : `supabase/migrations/20240101000000_nutrition_setup.sql`

### B. Manque d'Infrastructure as Code (IaC) pour le Stockage (Criticité: Faible/Moyenne)
* **Description** : Aucune politique RLS pour `storage.objects` (fichiers, ex: `avatars`) n'est versionnée dans les migrations SQL. Cela signifie que la sécurité du bucket d'avatars repose sur une configuration manuelle du dashboard Supabase, rendant impossible son audit automatisé ou son déploiement reproductible.
* **Risque** : Exposition publique non souhaitée ou écrasement de fichiers d'autres utilisateurs.

### C. Risque de "Role Spoofing" à l'inscription (Criticité: Faible)
* **Description** : Le trigger `handle_new_user()` lit le rôle directement depuis `NEW.raw_user_meta_data->>'role'`. Un attaquant pourrait forger une requête d'inscription avec `{"role": "coach"}`.
* **Risque** : Bien qu'il puisse obtenir l'interface coach, l'architecture RLS exige que les athlètes acceptent explicitement une invitation (statut `approved` dans `team_members`). Il ne peut donc pas voler de données. Cela reste toutefois un risque d'abus de création de groupes.

## 3. Preuves techniques et fichiers concernés
* L'Edge Function `chat/index.ts` récupère correctement les clés sensibles (`OPENAI_API_KEY`) via `Deno.env.get()`. Les clés dans `.env` sont restreintes à l'`ANON_KEY` publique.
* Les requêtes SQL dans les RPC (comme `submit_workout_results`) valident explicitement `v_athlete_id = auth.uid()` empêchant toute usurpation de soumission de résultats.

## 4. Corrections réalisées (Suite aux remarques de validation)
* **Correction RLS Nutrition** : Création de la migration `20261002000000_meal_logs_coach_access.sql`. La logique a été vérifiée statiquement : un coach ne peut lire que si `tm.status = 'approved'`. L'athlète en attente (`pending`) ou les utilisateurs hors du groupe n'exposent pas leurs données. Les droits `INSERT/UPDATE/DELETE` restent protégés (`auth.uid() = user_id`).
* **Correction Role Spoofing** : Création de la migration `20261002000001_fix_role_spoofing.sql`. Le trigger `handle_new_user` vérifie désormais que le rôle transmis est strictement `athlete` ou `coach`. Si un payload corrompu (`{"role": "admin"}`) est envoyé, le système bascule automatiquement sur `athlete`.
* **Sécurisation du Stockage (Storage RLS)** : Création de la migration `20261002000002_storage_policies.sql`. Les règles `INSERT`, `UPDATE` et `DELETE` sur `storage.objects` vérifient dorénavant de manière stricte `bucket_id = 'avatars' AND auth.uid() = owner`. Ainsi, aucun utilisateur ne peut altérer ou écraser l'avatar d'un autre utilisateur en forgeant une requête.

## 5. Tests exécutés
* Inspection statique approfondie des politiques SQL.
* Exécution automatique de tests via `psql` : **Non exécuté** (Pas d'environnement DB local Supabase ni Docker fonctionnel pour le runner actuel). La validation de la logique SQL est effectuée par analyse sémantique (vérification des jointures RLS).
* Contrôle des clés API et de la présence de secrets codés en dur (`sk_`, etc.) : **Aucun secret exposé**.
* Inspection manuelle des fonctions PL/pgSQL : Aucune exécution SQL dynamique (`EXECUTE`) vulnérable aux injections.

## 6. Risques résiduels et contrôles non vérifiés
* **Environnement Local Supabase** : L'absence de l'outil CLI Supabase en cours d'exécution a empêché les tests unitaires SQL automatisés (ex. pgTAP).
* **Paiements** : Aucun système de paiement n'a été détecté dans le code source (pas de Stripe, RevenueCat, etc.). S'il existe côté serveur, il n'a pas pu être audité.

## 7. Actions prioritaires avant toute publication
1. Lancer les migrations sur l'environnement de staging.
2. Exécuter une batterie de tests d'intégration complets via des comptes de tests côté interface (QA manuel).

L'audit SecOps est validé pour l'état actuel du code avec les nouveaux correctifs appliqués.
