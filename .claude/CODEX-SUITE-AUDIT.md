# Prompt pour Codex — suite de l'audit (2026-10-19)

Tu continues l'audit des parcours de l'app Sprintys (Expo/React Native, FR), sur un téléphone Android branché en USB (adb). Lis d'abord `.claude/AUDIT-PARCOURS-ATHLETE.md` (état et bugs déjà corrigés) et `CLAUDE.md`.

## Règles
- Comptes de test uniquement : athlète `test.athlete@sprintflow.com`, coach `test.coach@sprintflow.com` (l'utilisateur se connecte lui-même ; ne tape jamais de mot de passe, ne crée pas de compte).
- Jamais de données de test sur le vrai compte de l'utilisateur ni sur le coach réel.
- Consentements (IA, santé, conditions) : l'utilisateur les accepte, pas toi.
- Pas de push, migration ou déploiement sans son accord. Commits en français `type(portée): message`.
- Preuve : une capture avant/après par bouton. « Testé » = vu à l'écran.
- Serveur de test : `npx expo start --dev-client --port 8081` + `adb reverse tcp:8081 tcp:8081` (mise à jour en direct). Vérifier `npx tsc --noEmit` et `npx jest` avant chaque commit.
- Coordonnées adb : pixels réels de l'écran (1440x3120), pas ceux des captures réduites (x1,56).

## À faire — côté coach (compte coach, groupe « Test audit » créé, code 19790415)
1. Constructeur de bloc de course : valeurs absurdes (distance 0 / 99999 m, 200 répétitions, intensité), enregistrer une séance, la retrouver dans le calendrier, la modifier, la supprimer.
2. Séances muscu, escaliers, technique, repos, compétition ; « Séances types » ; « Créer avec Sprinty ».
3. Calendrier : « Définir une phase », « Vue semaine », copier une semaine, jour précédent/suivant.
4. Équipe : onglets Athlètes / Groupes / Demandes / Réglages, sous-groupes, renommer (déjà testé), supprimer le groupe (confirmation), discussion du groupe, annonces (mégaphone).
5. Un athlète de test qui rejoint le groupe par le code, le coach valide la demande, puis voit sa forme du jour, ses séances, ses résultats.
6. Sprinty coach : « Faisons connaissance », mémoire (« Ce que Sprinty sait de moi »), propositions de séances, brouillon d'annonce.
7. Profil coach, messages avec un athlète, export des données.

## À faire — côté athlète (restes)
Connexion/inscription (erreurs), messages avec coach, paywall (facturation désactivée sur ce compte), notifications, photo de profil, scan code-barres réel, mineur (nutrition, Sprinty), modes Gras/Muscle et modification/suppression de pesée, effort ressenti, escaliers/technique/compétition, Sprinty (Écouter, PDF, historique, quota).

## Défauts connus à vérifier à l'écran (corrigés dans le code, non vus)
Écran Poids vide ; repère « 2 000 kcal · à régler » ; marge basse de la séance ; message météo localisation éteinte ; libellé « Vitesse, lactique & chr… » tronqué sur « Planifier une séance ».

## Sortie attendue
Mets à jour `.claude/AUDIT-PARCOURS-ATHLETE.md` (tableau + bugs), corrige les bugs clairs, commite.
