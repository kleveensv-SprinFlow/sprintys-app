# Abonnements Sprintys : mise en place pas à pas

Tout le code est prêt et **désactivé par défaut** : tant que `app_config.billing_enabled` vaut `'false'`, tout le monde garde le comportement actuel. Ce guide décrit ce que tu dois faire dans les stores et dans RevenueCat, puis comment activer.

## 0. Rappel des formules

| | Gratuit | Plus | Pro |
|---|---|---|---|
| Prix | 0 | 2,99 €/mois · 24,99 €/an | 5,99 €/mois · 49,99 €/an |
| Photo IA / phrase / scan | 3 / 5 / 5 par jour | illimité (plafonds de sécurité 30 / 60 / 200) | idem, modèle de vision plus précis |
| Sprinty | 10 messages/jour | 40 | 150 |
| PDF | non | oui | oui |
| Plans coach IA | 1 plan de 4 semaines | 1 plan de 4 semaines | jusqu'à 12 semaines, 3 actifs, ajustement hebdomadaire |
| Objectif calorique adaptatif, bilan de la semaine, recherche de compétitions | non | non | oui |

Un athlète dont le coach offre Premium a le niveau **Plus**. Les offres coach (Coach Plus 6,99 €, Coach Pro 14,99 €) existent côté serveur ; leur page d'achat dans l'app n'est pas encore construite.

Les **plafonds** se modifient sans mise à jour de l'app (table `plan_limits`). Les **prix** se modifient dans les stores.

## 1. Identifiants de produits (à créer à l'identique dans les deux stores)

| Produit | Identifiant | Durée |
|---|---|---|
| Plus mensuel | `athlete_plus_monthly` | 1 mois |
| Plus annuel | `athlete_plus_yearly` | 1 an |
| Pro mensuel | `athlete_pro_monthly` | 1 mois |
| Pro annuel | `athlete_pro_yearly` | 1 an |
| (plus tard) Coach Plus / Pro | `coach_plus_monthly`, `coach_plus_yearly`, `coach_pro_monthly`, `coach_pro_yearly` | |

Pour chaque produit : essai gratuit de **7 jours** (offre d'introduction), prix de départ ci-dessus.

## 2. Apple (App Store Connect)

1. **Accords, fiscalité, banque** : Business → Accords → « Paid Apps Agreement » : renseigne société, coordonnées bancaires et formulaires fiscaux. Sans cet accord actif, aucun achat ne fonctionne.
2. Inscris-toi au **App Store Small Business Program** (commission 15 % au lieu de 30 % si tu fais moins d'1 M$ par an).
3. App → Monétisation → Abonnements → crée un **groupe d'abonnements** « Sprintys Premium ». Niveaux : Pro (niveau 1), Plus (niveau 2) pour que passer de Plus à Pro soit une mise à niveau immédiate.
4. Dans le groupe, crée les 4 produits (identifiants ci-dessus), avec noms et descriptions localisés (français), prix, et **offre d'introduction : essai gratuit 7 jours**.
5. Ajoute une capture de la page d'offre pour la review de chaque produit.
6. Codes promo (facultatif) : sur chaque produit, « Offer Codes » pour offrir des mois à tes premiers testeurs.
7. Clé de l'App Store Connect API / « In-App Purchase key » : Utilisateurs et accès → Intégrations → Achats intégrés → génère une clé, tu la déposeras dans RevenueCat.
8. Les premiers abonnements doivent être soumis **avec une nouvelle version de l'app** pour être validés.

## 3. Google Play Console

1. **Profil de paiement** marchand créé (Configuration → Profil de paiement).
2. Monétiser → Produits → **Abonnements** → crée les 4 abonnements avec les identifiants ci-dessus ; pour chacun, un **plan de base** (mensuel ou annuel, renouvellement automatique) et une **offre d'essai gratuit de 7 jours** pour les nouveaux abonnés.
3. Active les produits. L'app doit avoir été importée au moins une fois en piste de test (interne) avec la permission de facturation.
4. Programme « 15 % de commission » : inscris-toi (abonnements : 15 % dès le premier euro).
5. Codes promo : Monétiser → Codes promotionnels.
6. Ajoute les testeurs de licence (Configuration → Test de licence) pour tester sans payer.
7. Compte de service pour RevenueCat : crée un compte de service Google Cloud avec accès « Voir les informations financières » et « Gérer les commandes », lie-le dans Play Console, télécharge la clé JSON pour RevenueCat.

## 4. RevenueCat (revenuecat.com, gratuit jusqu'à 2,5 k$ de revenu mensuel suivi)

1. Crée un projet « Sprintys ».
2. Ajoute l'app **iOS** (bundle `com.sprintflow.inc`) avec la clé In-App Purchase d'Apple, et l'app **Android** (package de l'app) avec la clé JSON Google.
3. Récupère les clés publiques (Project settings → API keys) : une clé **iOS** (`appl_…`) et une clé **Android** (`goog_…`).
4. Products : importe les 4 produits de chaque store.
5. **Entitlements** : crée `plus` (rattache `athlete_plus_*` **et** `athlete_pro_*`) et `pro` (rattache `athlete_pro_*`). Le serveur lit directement l'identifiant du produit, donc ces noms servent surtout aux tableaux de bord.
6. **Offering** : crée l'offering « default », marqué comme courant, avec 4 packages contenant les 4 produits. L'app lit `offerings.current` : le prix affiché est celui du store (localisé).
7. **Webhook** : Integrations → Webhooks → Add :
   - URL : `https://tmmhznwstzmgnwoqlgqu.supabase.co/functions/v1/revenuecat_webhook`
   - Header `Authorization` : `Bearer <le secret>`. Le secret t'a été donné à part dans la conversation ; il est déjà enregistré côté Supabase (`RC_WEBHOOK_SECRET`). Pour en générer un nouveau : `openssl rand -hex 24`, puis mets-le à jour dans Supabase → Edge Functions → Secrets (nom `RC_WEBHOOK_SECRET`) et dans RevenueCat.
   - Environnements : sandbox **et** production.
8. L'app identifie l'utilisateur dans RevenueCat par son identifiant Sprintys (`logIn`), ce qui permet au webhook de rattacher l'achat au bon compte.

## 5. Clés dans l'app (GitHub)

Dépôt → Settings → Secrets and variables → Actions → ajoute :
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

Les trois workflows (APK, AAB Play Store, TestFlight) les lisent. Sans clé, l'app n'ouvre jamais d'achat (la page d'offre affiche seulement que les offres ne sont pas encore disponibles). Il faut un **nouveau build** : `react-native-purchases` est un module natif.

## 6. Tester avant d'ouvrir à tout le monde

- iOS : TestFlight + compte « Sandbox Tester » (App Store Connect → Utilisateurs et accès → Sandbox). Les durées sont raccourcies (1 mois = 5 minutes).
- Android : piste de test interne + testeurs de licence.
- Pour voir les écrans sans billing : mets `billing_enabled` à `'true'` uniquement sur un environnement de test, ou garde-le à `'false'` et teste l'achat via un compte à qui tu as donné un droit RevenueCat.
- À vérifier : achat Plus → compteurs illimités ; achat Pro → carte « Ajuster mon objectif » ; résiliation → retour au gratuit à l'échéance ; restauration ; offre d'essai ; changement Plus → Pro.
- Surveille dans Supabase la table `subscriptions` (écrite uniquement par le webhook) et les journaux de `revenuecat_webhook`.

## 7. Activer pour tous

1. Dépose les clés (section 5), publie un build avec les achats sur les deux stores (les produits doivent avoir été validés par Apple / actifs chez Google).
2. **Droit de transition pour les utilisateurs actuels** : dans RevenueCat, accorde à chaque utilisateur existant un droit promotionnel **Pro de 60 jours** (Customers → Grant entitlement), ou laisse-les tomber sur le plan gratuit si tu préfères. Le plus simple : ne pas activer le billing avant d'avoir accordé ce droit. Le webhook recopie ce droit dans `subscriptions`.
3. Active la facturation côté serveur :
   ```sql
   update public.app_config set value = 'true' where key = 'billing_enabled';
   ```
   Retour arrière immédiat : même requête avec `'false'` (tout le monde revient au plan « legacy » généreux).
4. Passe les textes légaux : les pages `docs/` sont à jour (Conditions 4 ter, Confidentialité : RevenueCat, Apple, Google). Vérifie que GitHub Pages est actif.

## 8. Choses à savoir

- **Rien n'est supprimé** quand un abonnement se termine : on revient au gratuit avec les compteurs du jour.
- **Supprimer son compte n'annule pas l'abonnement du store** : les Conditions le disent ; l'app propose « Gérer l'abonnement ».
- **Codes promo** : uniquement ceux des stores (Offer Codes Apple, codes Google Play) et les droits promotionnels RevenueCat. Aucun code maison dans l'app (règle 3.1.1 d'Apple).
- **Marge** : après TVA (20 %) et commission (15 %), il reste environ 2,10 € sur Plus et 4,25 € sur Pro par mois. Le coût IA est borné par les plafonds de sécurité ; relis `ai_usage` après un mois pour ajuster plafonds et prix.
- **Concurrents** : les tarifs de Yazio et autres n'ont pas été revérifiés ; compare avant de communiquer dessus.
- **Conformité** : les mentions de l'écran d'offre (prix, renouvellement automatique, résiliation, Conditions, Confidentialité, Restaurer) sont celles qu'Apple exige ; ne les retire pas.
