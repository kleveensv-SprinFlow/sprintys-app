# Audit des parcours athlète (2026-10-19)

Règle : un parcours est « testé » seulement avec capture avant / après, pour chaque condition listée. Les actions qui écrivent des données se font sur un compte de test, jamais sur le compte de l'utilisateur. Compte utilisé : athlète de test neuf, sans coach.

Légende : ✅ testé avec preuve · 🟡 vu seulement · ⬜ pas testé

Conditions à jouer : nominal · champ vide · valeur absurde · annuler à mi-parcours · double tap · retour Android · hors-ligne · première utilisation · clavier ouvert.

| # | Parcours | État |
|---|----------|------|
| 1 | Connexion (e-mail faux, mot de passe faux, champ vide, mot de passe oublié) | ⬜ |
| 2 | Inscription athlète + profil à compléter + vérification e-mail | 🟡 (écran des accords vu) |
| 3 | Rejoindre un groupe par code / quitter | 🟡 |
| 4 | Check-in complet 3 étapes + modification | ✅ |
| 5 | Pesée : ajout, valeurs 0 et 9999 refusées, 78,4 enregistré | ✅ (modification et suppression ⬜) |
| 6 | Objectif de poids | ⬜ |
| 7 | Nutrition : recherche, portion, ajout, modification, suppression, valeurs 0 et 99 999 | ✅ (unités g et ml ⬜) |
| 8 | Nutrition : photo, Décrire (analyse IA), scan, Récents / Fréquents / Mes repas | 🟡 |
| 9 | Nutrition : Reprendre hier, repas personnalisé, réglages | 🟡 (réglages ✅ valeurs absurdes) |
| 10 | Séance : saisie chrono / charge, Suivante, valider, effort ressenti | 🟡 |
| 11 | Séance muscu, escaliers, technique, compétition | ⬜ |
| 12 | Séance Sprinty ajoutée au calendrier + retirer | ⬜ |
| 13 | Calendrier : mois, jour vide, 2 séances, phases | 🟡 |
| 14 | Ma progression : masquer, restaurer | 🟡 |
| 15 | Sprinty : accueil et refus du consentement ✅ ; suggestions, question libre, graphique, PDF, Écouter, historique, quota 🟡 (consentement IA à accepter par l’utilisateur) |
| 16 | Messages : coach, groupe, envoyer, signaler, bloquer | ⬜ |
| 17 | Profil : informations, photo, rappels, export, bloqués, suppression | 🟡 |
| 18 | Abonnement Plus : paywall, restaurer les achats | ⬜ |
| 19 | Tutoriel : 10 étapes | ✅ |
| 20 | Notifications | ⬜ |
| 21 | Sans coach : plan Sprinty complet ⬜ (bloqué par le consentement IA) |
| 22 | Mineur : restrictions | ⬜ |

## Bugs trouvés
| Bug | Corrigé |
|---|---|
| Check-in « Modifier » : étape 1 vide | oui |
| Pesée : 0 ou 9999 kg | oui, bornes 25 à 300 kg, gras, muscle, eau |
| Portion : 99 999 bananes = 10 499 895 kcal enregistrés | oui, refus au-delà de 5 kg |
| Portion à 0 : bouton muet | oui, message |
| « Modifier la portion » : bouton caché par le clavier | oui |
| Réglages nutrition : 99 999 kcal acceptés, poids actuel vide malgré une pesée | oui |
| Recherche « banane » : titre « Chair sans peau de banane », fiche à 0 kcal | oui |
| Écran Poids vide : « -- kg » et période affichés sans donnée | à traiter |
| Compte neuf : objectif de 2 000 kcal affiché sans l'avoir choisi | à décider |
