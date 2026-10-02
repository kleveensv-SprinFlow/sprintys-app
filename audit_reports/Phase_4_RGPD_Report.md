# Phase 4 Report: Audit RGPD et Protection des Données (Révisé)

## 1. Constats vérifiés et preuve technique
L'audit du code, des types TypeScript (`src/types/supabase.ts`) et des migrations SQL a permis d'établir la réalité des traitements techniques :
* **Données d'identité** (`profiles`) : Nom, rôle, genre, poids, taille. Données supprimées en cascade lors du `delete_user()`.
* **Données physiologiques et bien-être** (`check_ins`) : Champs `pains` (Json) et `menstruation` (boolean). **Preuve** : Définis dans `src/types/supabase.ts` et manipulés par l'application. Ces données peuvent être qualifiées de données concernant la santé.
* **Architecture de suppression** : La fonction RPC `delete_user()` (définie dans `20260920000001_sprint1_part2_security_fixes.sql`) supprime l'enregistrement racine dans `auth.users`. Les contraintes `ON DELETE CASCADE` garantissent la purge automatique des métriques corporelles, repas et entraînements. 
* **Anonymisation des conversations** : Les messages de la table `chat_messages` utilisent une clé étrangère `sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` (`20260912000000_chat_and_polls.sql`). À la suppression d'un compte, le texte du message demeure mais le lien technique avec l'utilisateur est rompu.
* **Isolation post-départ** : La politique `profiles_select_policy` exige explicitement `tm.status = 'approved'` et `t.coach_id = auth.uid()` pour qu'un coach lise le profil. Dès que l'athlète quitte le groupe (ligne retirée de `team_members`), le coach perd tout accès.
* **Sous-traitants externes identifiés techniquement** : 
  * `OpenAI` : L'Edge Function `chat/index.ts` transmet le contenu brut des `messages` à l'API OpenAI sans filtrage d'éventuelles informations personnelles (PII) intégrées par l'utilisateur dans le texte.
  * `Open-Meteo` & `OpenFoodFacts` : Requêtes `fetch` directes depuis le client. Aucune donnée utilisateur n'est transmise dans l'URL.

## 2. Erreurs et incertitudes du rapport initial corrigées
* **Base légale de santé (Art. 9)** : Le rapport initial présentait le "consentement explicite" (Art 9.2.a) comme l'unique base. S'il est le plus probable pour une application de coaching sportif, un juriste doit valider si d'autres exceptions pourraient s'appliquer et qualifier avec précision si `pains` et `menstruation` constituent strictement des "données de santé" dans ce contexte précis.
* **Durée de conservation de 3 ans** : Affirmer que les comptes inactifs doivent être supprimés après 3 ans est une extrapolation d'une recommandation CNIL française (orientée prospection commerciale). Les durées de conservation doivent être définies par le responsable de traitement en fonction des finalités réelles et des obligations légales locales.
* **L'AIPD (Analyse d'Impact)** : Une AIPD n'est pas "automatiquement obligatoire". Elle dépend de critères (ex: données sensibles + personnes vulnérables comme des mineurs + grande échelle). L'évaluation de ces critères relève d'une décision juridique et métier, non d'un constat technique.

## 3. Risques classés par priorité
1. **[Élevé] Absence d'information et de base légale valide pour les données physiologiques** : L'interface d'inscription actuelle ne recueille aucun consentement explicite ni n'affiche de mentions d'information préalables. Si les douleurs et cycles menstruels sont qualifiés de données de santé, le traitement actuel s'effectue sans mécanisme de conformité visible dans le code.
2. **[Élevé] Transferts vers des LLM (OpenAI)** : Les utilisateurs pourraient confier des informations personnelles ou de santé au chat. Le transfert de ces données vers OpenAI (États-Unis) sans information claire préalable expose à un risque de conformité.
3. **[Moyen] Exercice du droit à la portabilité (Art. 20)** : Techniquement, le code source ne propose aucun mécanisme UI ni point d'API pour permettre à l'athlète de récupérer ses historiques d'entraînement sous un format structuré lisible par machine (JSON/CSV).
4. **[Moyen] Données conservées dans les backups/Storage** : `delete_user()` ne nettoie pas explicitement les fichiers du bucket `avatars` (la base de données supprime le lien, mais le fichier physique pourrait rester orphelin si un trigger spécifique n'est pas configuré sur le Storage).

## 4. Mesures techniques à réaliser (Propositions de conception)
* **Système d'Opt-In Santé** : Modifier le flux d'onboarding (`StepPhysical`) ou le premier `CheckIn` pour afficher une interface distincte demandant l'accord de l'utilisateur (ex: case à cocher non pré-cochée) et l'informant de l'utilisation des données. Stocker l'horodatage de ce consentement dans une table dédiée (ex: `user_consents`).
* **Fonction d'export (Portabilité)** : Créer une fonction Edge ou un endpoint RPC (ex: `export_user_data()`) qui consolide les lignes de `profiles`, `body_metrics`, `athlete_efforts` et `meal_logs` en un blob JSON téléchargeable via l'interface.
* **Nettoyage Storage post-suppression** : Ajouter un Webhook ou un trigger Database-to-Storage pour purger définitivement les avatars liés à un ID utilisateur lors d'un effacement.
* **Politique de Rétention (CRON)** : Implémenter une Edge Function programmée via `pg_cron` qui repère les utilisateurs dont le `last_sign_in_at` dépasse la durée légale (définie par l'équipe juridique) et effectue une purge.

## 5. Décisions métier et juridiques à valider par un humain
* Qualifier légalement les champs `pains` et `menstruation` au regard de l'Art. 9 du RGPD et valider la base légale de leur traitement.
* Définir l'âge minimum d'utilisation de l'application. Si les mineurs sont acceptés, choisir le seuil d'âge local (13 à 16 ans selon les pays de l'UE) imposant le consentement de l'autorité parentale.
* Rédiger la Politique de Confidentialité et les CGU, ainsi que définir les durées exactes de conservation (comptes actifs, comptes inactifs, logs de connexion).
* Conclure un Accord de Traitement des Données (DPA) avec Supabase et OpenAI, vérifiant notamment les Clauses Contractuelles Types (CCT) en cas de transferts vers les États-Unis, et s'assurer (pour OpenAI) que les données API ne sont pas utilisées pour l'entraînement des modèles.

## 6. Tests nécessaires et statuts
* **Test de la purge en cascade (`delete_user`)** : *Non exécuté automatiquement*. Nécessite la création d'un compte, l'ajout de données et l'appel de l'API pour vérifier l'état du bucket `avatars` (orphelin ou supprimé).
* **Vérification du transfert de PII vers OpenAI** : *Inspecté statiquement*. Le code transmet tout le texte de l'utilisateur. Aucune fonction de masquage des PII (PII anonymizer) n'est implémentée côté serveur.

## 7. Informations manquantes pour préparer un lancement international
* Territoires de lancement exacts (Détermine l'application du RGPD, du CCPA en Californie, etc.).
* Identité légale et coordonnées du Responsable de Traitement (pour intégration aux textes légaux).
* Emplacement physique (Région AWS/GCP) du cluster Supabase hébergeant le projet de production.
* Modèle économique (gratuit vs payant) qui pourrait impliquer un processeur de paiement (ex: Stripe) à ajouter à la liste des sous-traitants.
