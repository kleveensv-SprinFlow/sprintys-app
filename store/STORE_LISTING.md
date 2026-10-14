# Sprintys : fiche store et publication

Ce document regroupe tout ce qu'il faut saisir dans la **Play Console** et dans **App Store Connect**, ainsi que la checklist avant d'envoyer l'app en review.

Les réponses sur la confidentialité correspondent à ce que l'app fait réellement (voir `src/legal/documents.ts`). Si une fonction change, il faut mettre à jour les deux.

---

## 1. Identité

| Champ | Valeur |
|---|---|
| Nom de l'app | **Sprintys** |
| Sous-titre App Store (30 car. max) | `Coach, séances et forme` |
| Catégorie principale | Santé et forme (Health & Fitness) |
| Catégorie secondaire (Apple) | Sports |
| Bundle iOS / package Android | `com.sprintflow.inc` (déjà publié sous cet identifiant, ne pas le changer) |
| Langue principale | Français (France) |
| Site / assistance | `support@sprintflow.app` (à remplacer par l'adresse définitive dans `src/legal/publisher.ts`) |
| Politique de confidentialité | https://kleveensv-sprinflow.github.io/sprintys-app/confidentialite.html |
| Conditions d'utilisation | https://kleveensv-sprinflow.github.io/sprintys-app/cgu.html |
| Suppression du compte (Google Play) | https://kleveensv-sprinflow.github.io/sprintys-app/suppression-compte.html |

---

## 2. Textes

### Description courte (Google Play, 80 caractères max)

```
Ton coach d'athlétisme : séances, forme du jour, nutrition et assistant IA.
```

### Texte promotionnel (App Store, 170 caractères max, modifiable sans review)

```
Planifie, suis et analyse chaque séance avec ton coach. Forme du jour, nutrition, poids et Sprinty, l'assistant qui connaît ton entraînement.
```

### Description longue (les deux stores)

```
Sprintys réunit athlètes et coachs autour de l'entraînement, de la séance à la performance.

POUR LES ATHLÈTES
• Tes séances du jour et de la semaine : sprint, piste, côtes, escaliers, musculation, technique, compétitions.
• Ton check-in quotidien en 30 secondes : sommeil, énergie, stress, motivation et douleurs éventuelles, pour un score de forme clair.
• Ta nutrition : recherche d'aliments, scan de code-barres, objectifs caloriques et macros, repas favoris.
• Ton poids et ta composition corporelle, avec une courbe d'évolution lisible.
• Sprinty, ton assistant IA : il répond à tes questions sur l'entraînement, la récupération et la nutrition à partir de tes vraies données, avec des graphiques clairs.
• Pas encore de coach ? Sprinty fixe un objectif avec toi, pose les bonnes questions (y compris de sécurité) et te propose un plan semaine par semaine que tu ajoutes à ton calendrier.
• Exporte un plan ou une analyse en PDF.

POUR LES COACHS
• Crée tes groupes et sous-groupes ; tes athlètes te rejoignent avec un code.
• Construis des séances détaillées (blocs, répétitions, charges, récupérations) et assigne-les à l'équipe, un sous-groupe ou un athlète.
• Visualise la forme de ton équipe chaque matin et repère qui a besoin de récupérer.
• Discute avec ton équipe, publie des annonces et des sondages.
• Demande à Sprinty une analyse complète de la progression d'un athlète, compare tes athlètes en graphique, repère qui est fatigué, programme des séances pour un groupe, rédige une annonce ou cherche une compétition : tu valides toujours avant que quoi que ce soit soit enregistré.

TES DONNÉES T'APPARTIENNENT
• Hébergement dans l'Union européenne.
• Accords explicites pour les données de santé et les fonctions d'IA, modifiables à tout moment.
• Export de toutes tes données et suppression du compte depuis l'app.
• Ni publicité, ni revente de données.

Sprintys ne remplace pas un avis médical. En cas de douleur ou de doute, consulte un professionnel de santé.
```

### Mots-clés (App Store, 100 caractères max, séparés par des virgules)

```
athlétisme,sprint,coach,entraînement,piste,forme,nutrition,check-in,course,musculation,équipe
```

### Notes de version (première version)

```
Bienvenue sur Sprintys : séances, forme du jour, nutrition, discussions d'équipe et assistant Sprinty.
```

---

## 3. Classification

- **Âge minimum dans l'app : 15 ans.** C'est vérifié à l'inscription et côté serveur une fois la migration appliquée.
- **Apple (questionnaire d'âge) :**
  - contenu généré par les utilisateurs : **oui** (messagerie d'équipe), avec signalement et blocage ;
  - informations médicales / de santé : **oui, sans diagnostic** ;
  - pas de violence, jeux d'argent, contenu sexuel ni accès web libre.
  - Classification attendue : **12+**. Les conditions d'utilisation imposent 15 ans, ce qui est compatible.
- **Google Play (questionnaire IARC) :** mêmes réponses, avec « Les utilisateurs peuvent interagir » cochée. Classification attendue : PEGI 12 / USK 12.
- **Public cible (Google Play) :** 16 ans et plus. Ne pas cocher les tranches « enfants », sinon les règles « Familles » s'appliquent.

---

## 4. Google Play : Sécurité des données (Data safety)

**Collecte et partage :**
- L'app collecte des données : **Oui**.
- Données chiffrées en transit : **Oui** (HTTPS).
- Possibilité de demander la suppression : **Oui**, dans l'app (Profil → Supprimer mon compte) et via le lien web ci-dessus.
- Partage avec des tiers : **Non** au sens de Google. Les prestataires qui traitent les données pour notre compte (Supabase, OpenAI) ne comptent pas comme du partage.

| Catégorie Google | Données | Collectée | Obligatoire ? | Finalités |
|---|---|---|---|---|
| Informations personnelles | Nom, adresse e-mail, ID utilisateur | Oui | Obligatoire | Fonctionnement de l'app, gestion du compte |
| Informations personnelles | Autres infos (date de naissance, sexe) | Oui | Obligatoire | Fonctionnement de l'app (âge minimum, repères) |
| Santé et remise en forme | Infos sur la santé (poids, composition, sommeil, fatigue, stress, douleurs) | Oui | Facultatif (accord explicite) | Fonctionnement de l'app, personnalisation |
| Santé et remise en forme | Infos sur la forme physique (séances, performances) | Oui | Obligatoire | Fonctionnement de l'app |
| Messages | Autres messages dans l'app (discussions coach / équipe) | Oui | Facultatif | Fonctionnement de l'app |
| Photos et vidéos | Photos (photo de profil ; photo de repas analysée puis non conservée) | Oui | Facultatif | Fonctionnement de l'app |
| Position | Position approximative | Oui, **non stockée** | Facultatif | Fonctionnement de l'app (météo) |
| Activité dans l'app | Autres actions (nombre de requêtes à l'IA par jour) | Oui | Obligatoire | Sécurité, prévention des abus |

**À NE PAS déclarer** (non collecté) :
- la position précise ;
- les contacts, l'agenda et les fichiers ;
- les données financières ;
- l'identifiant publicitaire ;
- l'historique de navigation ;
- l'audio.

---

## 5. App Store : confidentialité (App Privacy)

- « Data Used to Track You » : **aucune**. Pas de suivi publicitaire, pas d'ATT.
- « Data Linked to You » :
  - **Contact Info** : nom, adresse e-mail. Finalité : App Functionality.
  - **Health & Fitness** :
    - Health : poids, composition, check-ins, douleurs ;
    - Fitness : séances, performances.
    - Finalités : App Functionality, Product Personalization.
  - **User Content** :
    - Photos : photo de profil ;
    - Other User Content : messages ;
    - Customer Support : e-mails de support.
    - Finalité : App Functionality.
  - **Identifiers** : User ID. Finalité : App Functionality.
  - **Usage Data** : Other Usage Data (compteur de requêtes IA). Finalité : App Functionality (prévention des abus).
- « Data Not Linked to You » : **Location**, Coarse Location (météo, non stockée). Finalité : App Functionality.
- Le manifeste de confidentialité iOS (`ios.privacyManifests` dans `app.json`) est déjà rempli de façon cohérente.

---

## 6. Captures d'écran à produire

**Formats :**
- iPhone 6,9" (1320 × 2868) : obligatoire ;
- iPhone 6,5" : facultatif ;
- Android : au moins 2 captures en 1080 × 1920 ou plus ;
- Google Play : visuel de présentation (feature graphic) en 1024 × 500.

**Contenu :** 6 à 8 captures, sur des comptes de démonstration avec des données réalistes. Ne jamais utiliser de vraies données d'athlètes.
1. Accueil athlète : « Bonjour [Prénom] », forme du jour et séance du jour.
2. Détail d'une séance de sprint (blocs et répétitions).
3. Check-in : étape énergie / sommeil.
4. Nutrition : piste énergétique et repas du jour.
5. Écran Poids : courbe pleine largeur.
6. Sprinty : une conversation de conseil de récupération.
7. Coach : forme de l'équipe et séances du jour.
8. Coach : constructeur de séance.

Légendes courtes, sur le fond bleu de la marque, par exemple :
- « Ta forme du jour, en un coup d'œil » ;
- « Des séances précises, bloc par bloc ».

---

## 7. Informations pour la review

**Comptes de démonstration (obligatoire chez Apple).** Crée deux comptes confirmés, rattachés au même groupe, avec quelques séances, repas et pesées.

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Athlète | `review.athlete@…` | à définir |
| Coach | `review.coach@…` | à définir |

**Note pour le reviewer (anglais conseillé) :**

```
Sprintys is a training app for track & field athletes and their coaches.
- Sign in with the demo athlete or coach account above (Sign in with Apple and Google are also available).
- Health data (weight, wellness check-ins, pains) is only collected after explicit in-app consent.
- AI features (assistant "Sprinty", meal photo analysis) require a separate consent shown before first use; the app works without them. Requests go through our server with per-user daily limits.
- Sprinty never writes anything by itself: sessions, training plans, goals and announcements it proposes are shown as cards and saved only when the user taps to confirm. Everything it proposes is labelled "Sprinty (IA)". Before a first training plan it asks safety questions (pain, heart condition, fainting, return after a long break) and only proposes a gentle plan with advice to see a doctor if any answer is yes. It is not a medical device and says so in the chat header and on every plan.
- Team chat is user-generated content: users can report a message and block a user (long-press a message or use the chat menu). Reports are reviewed within 24 h.
- Account deletion: Profile → Supprimer mon compte (deletes the account and all associated data).
- Location is only used while the app is in use, approximately, for the weather card.
```

---

## 8. Checklist avant publication

**À faire par toi** (impossible depuis cet environnement) :
- [ ] Remplir les champs « À COMPLÉTER » de `src/legal/publisher.ts` (raison sociale, forme, SIRET, adresse, directeur de la publication), puis lancer `node scripts/build-legal-pages.js` et committer `docs/`.
- [ ] Activer GitHub Pages : Settings → Pages → branche `master`, dossier `/docs`. Vérifier que les 4 URL ci-dessus répondent.
- [ ] Créer et vérifier l'adresse de support définitive. Si elle change, mettre à jour `contactEmail` et `privacyEmail` dans `publisher.ts`.
- [ ] Changer le mot de passe du compte dont les identifiants figuraient dans `scripts/create-coach.js` et `scripts/test-subgroup.js` (scripts supprimés du dépôt, mais encore présents dans l'historique git).
- [ ] Approuver puis appliquer la migration `supabase/migrations/20261014090000_legal_consents_blocks.sql`. Elle ajoute :
  - la date de naissance et la vérification des 15 ans côté serveur ;
  - la protection des accords ;
  - le blocage d'utilisateurs ;
  - la purge des anciennes données de cycle.
- [ ] **Connexion Apple** :
  - Apple Developer → Identifiers : activer « Sign in with Apple » sur `com.sprintflow.inc`.
  - Supabase → Authentication → Providers → Apple : activer, puis renseigner le Services ID / Team ID / Key ID et la clé `.p8`. Ajouter `com.sprintflow.inc` dans « Authorized Client IDs ».
- [ ] Supabase → Authentication → URL Configuration : vérifier que `sprintflowv2://auth/callback` est dans les Redirect URLs (connexion Google et lien « mot de passe oublié »).
- [ ] Créer les deux comptes de démonstration (section 7).
- [ ] Produire les captures (section 6).
- [ ] Tester sur TestFlight :
  - connexion Apple ;
  - inscription complète et code e-mail ;
  - mot de passe oublié (lien qui ouvre l'app) ;
  - photo de repas ;
  - suppression de compte.

**Déjà fait dans le code :**
- [x] Permissions limitées et expliquées en français (caméra, photos, position approximative pendant l'utilisation) ; micro retiré.
- [x] Numéros de build automatiques à chaque build CI.
- [x] Accords enregistrés et datés (CGU, santé, douleurs, IA, partage coach) ; retrait possible dans le profil.
- [x] Signalement et blocage dans les discussions ; liste des utilisateurs bloqués avec « Débloquer ».
- [x] Export des données et suppression du compte (avec les photos) depuis l'app.
- [x] Connexion Apple à côté de Google (règle 4.8).
- [x] Écran d'erreur global, bandeau hors ligne, aucune clé d'API dans l'app.
