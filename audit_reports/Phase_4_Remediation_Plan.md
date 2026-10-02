# Phase 4 : Plan de Remédiation Technique (RGPD & Privacy)

## 1. Matrice des Traitements de Données
| Catégorie de données | Finalité | Base légale envisagée | Accès | Sous-traitant (Prestataire) | Durée de conservation envisagée | Droits applicables |
| --- | --- | --- | --- | --- | --- | --- |
| **Identité & Compte** (Nom, email, rôle) | Création et gestion du profil | Exécution du contrat (Art. 6.1.b) | Athlète, Coach de l'équipe | Supabase (Auth/DB) | Durée d'utilisation + X années (à valider) | Accès, Rectification, Effacement, Portabilité |
| **Morphologie & Objectifs** (Poids, taille) | Suivi de la composition corporelle | Exécution du contrat | Athlète, Coach approuvé | Supabase | Durée d'utilisation | Accès, Rectification, Effacement, Portabilité |
| **Entraînements & Repas** (`athlete_efforts`, `meal_logs`) | Coaching sportif et suivi diététique | Exécution du contrat | Athlète, Coach approuvé | Supabase | Durée d'utilisation | Accès, Rectification, Effacement, Portabilité |
| **Données de Santé** (`check_ins` : douleurs, cycle menstruel) | Adaptation sécurisée de la charge d'entraînement | Consentement explicite (Art. 9.2.a) | Athlète, Coach approuvé | Supabase | Jusqu'au retrait du consentement | Accès, Rectification, Effacement, Portabilité, Révocation |
| **Messages (Chat)** | Communication Coach/Athlète | Exécution du contrat ou Intérêt légitime | Participants à la conversation | Supabase, OpenAI (via Edge Function) | Durée d'utilisation de l'app | Accès, Effacement (Anonymisation) |
| **Fichiers** (Avatars) | Personnalisation du profil | Consentement ou Exécution du contrat | Public (URL Storage) | Supabase (Storage) | Durée d'utilisation | Accès, Rectification, Effacement |

## 2. Distinctions : Actions Techniques vs Décisions Métier/Juridiques

**Corrections techniques certaines (Pouvant être implémentées dès validation)** :
* Implémentation du bouton d'export de données (JSON).
* Création de la mécanique de purge des avatars orphelins (Webhooks/API).
* Paramétrage de la transmission des requêtes à OpenAI (ajout de garde-fous ou d'un system prompt de minimisation).

**Décisions exigeant une validation métier ou juridique préalable** :
* La formulation juridique des mentions d'information et des demandes de consentement.
* La politique d'âge minimum (autorisation des mineurs ou blocage strict).
* La durée exacte de conservation des logs inactifs (ex: 1 an, 3 ans, 5 ans ?).

## 3. Spécifications Techniques des Remédiations

### A. Information et Consentement (Données de Santé)
* **Risque** : Collecte de `pains` et `menstruation` sans consentement (Élevé).
* **Modification proposée** :
  * Créer une table `user_consents (user_id, consent_type, version, ip_address, created_at, revoked_at)`.
  * Modifier le module de "Check-in" (`app/(athlete)/checkin.tsx` ou modal) pour bloquer la saisie des champs sensibles tant qu'un écran d'Opt-In spécifique n'a pas été validé.
  * Ne pas lier ce consentement à la Politique de Confidentialité générale.
* **Fichiers impactés** : `supabase/migrations/xxxx_consents_table.sql`, `app/(athlete)/checkin.tsx`, `src/store/bodyStore.ts`.

### B. Export sécurisé des données personnelles (Portabilité)
* **Risque** : Impossibilité pour l'utilisateur de récupérer ses données (Moyen).
* **Modification proposée** :
  * Créer une Edge Function `export_user_data`.
  * La fonction consolide les lignes de `profiles`, `body_metrics`, `athlete_efforts`, `meal_logs` et `check_ins` du requérant.
  * Retourner un objet JSON formaté de manière structurée.
* **Fichiers impactés** : `supabase/functions/export_data/index.ts`, `app/(athlete)/settings.tsx`.

### C. Suppression de compte et avatars orphelins
* **Risque** : `delete_user()` ne supprime pas les fichiers du bucket (Faible/Moyen). *Note technique : Un trigger SQL seul ne peut pas effacer de fichier Storage.*
* **Modification proposée** :
  * Créer une Edge Function `delete_account_and_assets` qui effectue les requêtes d'API de Storage (`supabase.storage.from('avatars').remove(...)`) avant d'invoquer `delete_user()` dans la base.
  * Ou utiliser un Webhook asynchrone sur la table `auth.users`.
* **Fichiers impactés** : `supabase/functions/delete_account/index.ts`, `app/(athlete)/settings.tsx`.

### D. Politique de conservation et comptes inactifs
* **Risque** : Conservation indéfinie (Moyen).
* **Modification proposée** :
  * Utiliser `pg_cron` ou un trigger cron externe pour identifier les `auth.users` dont le `last_sign_in_at` dépasse le délai métier validé, et déclencher une Edge Function de purge (pour traiter BDD + Storage).

### E. Transmission à OpenAI (Minimisation)
* **Risque** : Transfert de PII vers un LLM tiers (Élevé).
* **Modification proposée** :
  * Renforcer le `systemPrompt` transmis à OpenAI dans `chat/index.ts` pour exiger expressément l'ignorance des informations médicales directes (instructions).
  * (Optionnel) Intégrer un parseur de masque (PII Anonymizer) côté serveur avant l'envoi à l'API OpenAI si la volumétrie des messages le permet.

### F. Protection des mineurs
* **Risque** : Collecte sans autorisation parentale (Élevé).
* **Modification proposée** :
  * Ajouter un champ Date de Naissance à l'inscription (`StepAccount.tsx`).
  * Interdire l'inscription si l'âge est inférieur au seuil local, ou basculer vers un flux de consentement parental via email d'un tuteur.

## 4. Plan de Tests en Staging

1. **Test de Consentement Santé** :
   * *Protocole* : Se connecter avec un nouveau compte fictif. Tenter d'enregistrer une blessure dans le check-in sans donner le consentement.
   * *Critère de réussite* : Requête d'insertion rejetée (ou champ masqué côté UI), puis acceptée après clic sur l'Opt-In.
2. **Test de l'Export** :
   * *Protocole* : Renseigner un set de données d'entraînement. Déclencher l'export via Edge Function.
   * *Critère de réussite* : Fichier JSON complet obtenu contenant les efforts et excluant ceux des autres comptes.
3. **Test de la Purge (Compte & Storage)** :
   * *Protocole* : Créer un profil, uploader un avatar dans le Storage, puis invoquer la suppression.
   * *Critère de réussite* : `auth.users` effacé, URL de l'avatar renvoie 404, messages du chat restants ont `sender_id = NULL`.

## 5. Décisions métier et juridiques indispensables (Action Requise)

Avant de développer et déployer ces remédiations, le propriétaire du produit (ou le service juridique) doit répondre aux questions suivantes :
1. **Âge minimum** : Acceptons-nous les mineurs sur Sprintflow ? Si oui, à partir de quel âge sans autorisation parentale ?
2. **Durée de conservation** : Au bout de combien d'années d'inactivité supprimons-nous les comptes ?
3. **Rédaction légale** : Rédiger le texte exact de l'opt-in pour le consentement aux données de santé.
4. **Validité IA** : Confirmez-vous le maintien d'OpenAI pour le chat en sachant que les utilisateurs pourraient y écrire des données sensibles ? Un modèle auto-hébergé a-t-il été envisagé ?

*(Aucun de ces correctifs n'a été appliqué sur le code pour le moment. Le déploiement commencera dès réception de vos consignes).*
