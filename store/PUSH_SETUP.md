# Notifications : ce qui marche déjà et ce qu'il reste à brancher

## Déjà en place (rien à faire)
- **Rappels de séance sur le téléphone** : l'athlète les active (carte « Un rappel avant tes séances ? » sur l'accueil, ou Profil → Notifications). Un rappel 1 h avant une séance qui a une heure, sinon à 8 h le jour même. Ils sont programmés sur le téléphone, sans serveur ni compte Firebase/Apple.
- **Côté serveur, tout est prêt mais éteint** : file d'envoi, déclencheurs (séance planifiée ou déplacée, message, check-in inquiétant pour le coach), fonction d'envoi `push`, tâche planifiée chaque minute. Interrupteur : `app_config.push_enabled` (= `false` aujourd'hui, donc aucune notification n'est mise en file).

## Pour allumer les notifications du serveur (à faire une fois)

### 1. Android : Firebase (gratuit)
1. https://console.firebase.google.com → **Ajouter un projet** (« Sprintys »). Google Analytics : non.
2. Dans le projet → icône Android → nom du package **com.sprintflow.inc** → enregistrer → **télécharger `google-services.json`**.
3. ⚙ Paramètres du projet → onglet **Comptes de service** → **Générer une nouvelle clé privée** → un fichier `.json` se télécharge.

### 2. iOS : Apple Developer
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Identifiers** → `com.sprintflow.inc` → cocher **Push Notifications** → Save.
2. **Keys** → **+** → nom « Sprintys push » → cocher **Apple Push Notifications service (APNs)** → Continue → Register → **Download** le fichier `.p8` (une seule fois !). Noter le **Key ID** (10 caractères).
3. Noter aussi le **Team ID** (en haut à droite du compte, 10 caractères).

### 3. GitHub (dépôt → Settings → Secrets and variables → Actions)
- **Secret** `GOOGLE_SERVICES_JSON_BASE64` = contenu de `google-services.json` encodé en base64 (sur Mac : `base64 -i google-services.json | pbcopy`).
- **Variable** (onglet *Variables*) `PUSH_ENABLED` = `1`. C'est elle qui ajoute le module de notifications aux builds. Sans elle, les builds restent exactement comme avant.

### 4. Supabase (Edge Functions → Secrets), pour la fonction `push`
| Nom | Valeur |
|---|---|
| `FCM_SERVICE_ACCOUNT` | tout le contenu du fichier `.json` de la clé de compte de service (étape 1.3) |
| `APNS_KEY` | tout le contenu du fichier `.p8` (étape 2.2), lignes `-----BEGIN…` comprises |
| `APNS_KEY_ID` | le Key ID |
| `APNS_TEAM_ID` | le Team ID |
| `APNS_BUNDLE_ID` | `com.sprintflow.inc` |
| `APNS_ENV` | `production` (TestFlight et App Store) |

### 5. Me dire « c'est fait »
- Je lance `supabase/scripts/activate_push.sql` (met `push_enabled` à `true`).
- Tu relances les builds **TestFlight** et **Play** (le module de notifications y entre grâce à `PUSH_ENABLED`).
- Test : installer le build, activer les notifications, puis depuis le compte coach planifier une séance : l'athlète reçoit « Nouvelle séance » dans la minute.

## À savoir
- Plusieurs séances planifiées d'un coup (semaine copiée) = **une seule** notification « Planning mis à jour ».
- Un coach est prévenu au plus **une fois par jour et par athlète** pour un check-in inquiétant (forme ≤ 40 ou douleur).
- Un athlète qui a bloqué quelqu'un ne reçoit plus ses messages en notification.
- Désactiver les notifications dans le profil supprime l'identifiant du téléphone côté serveur.
- Fiches des stores : déclarer l'**identifiant de l'appareil** (Play : *Device or other IDs*, usage « fonctionnement de l'app » ; Apple : *Identifiants → ID de l'appareil*, non lié à l'identité si possible, pas de suivi). La politique de confidentialité le mentionne déjà.
- Retour arrière à tout moment : `UPDATE public.app_config SET value='false' WHERE key='push_enabled';`
