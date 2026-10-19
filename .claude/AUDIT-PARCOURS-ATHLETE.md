undefined✅ 10 étapes |undefined✅ recherche, portion, ajout, modification, suppression, valeurs 0 et 99999 ; ⬜ g / ml |undefined✅ ajout, valeurs 0 et 9999 refusées, 78,4 enregistré ; ⬜ modification/suppression |undefined✅ complet, compte neuf (3 étapes, enregistré 88/100) |# Audit des parcours athlète — plan de couverture (2026-10-19)

Règle : un parcours est « testé » seulement avec capture avant / après, pour chaque condition listée. Les actions qui écrivent des données se font sur un compte de test, jamais sur le compte de l'utilisateur.

Légende : ✅ testé avec preuve · 🟡 vu seulement · ⬜ pas testé

## Conditions à jouer sur chaque parcours
nominal · champ vide · valeur absurde (négatif, énorme, texte) · annuler à mi-parcours · double tap · retour Android · hors-ligne · première utilisation (compte neuf sans donnée) · clavier ouvert.

## Parcours
| # | Parcours | État |
|---|----------|------|
| 1 | Connexion (e-mail faux, mot de passe faux, champ vide, mot de passe oublié) | ⬜ |
| 2 | Inscription athlète complète + profil à compléter + vérif. e-mail | ⬜ |
| 3 | Rejoindre un groupe par code (code faux, code valide) / quitter | 🟡 |
| 4 | Check-in complet 3 étapes (sommeil, mental, douleurs) + « Comme hier » + modification | 🟡 (étape 1 seule) |
| 5 | Pesée : ajout, modification, suppression, « Ma balance mesure aussi… » | 🟡 |
| 6 | Objectif de poids : définir, modifier | ⬜ |
| 7 | Nutrition : ajouter un aliment (recherche, portion, g/pièce), supprimer, modifier la quantité | 🟡 |
| 8 | Nutrition : photo (permission refusée / acceptée), « Décrire » (analyse IA), scan code-barres, Récents / Fréquents / Mes repas | 🟡 |
| 9 | Nutrition : Reprendre hier, copier un repas, repas personnalisé, réglages (objectif, répartition) | 🟡 |
| 10 | Séance : saisir un chrono / une charge pour toutes les séries, « Suivante », valider la séance, effort ressenti | 🟡 |
| 11 | Séance : séance muscu, escaliers, technique, compétition (chaque type) | ⬜ |
| 12 | Séance Sprinty ajoutée au calendrier (récupération) + retirer | ⬜ |
| 13 | Calendrier : mois précédent / suivant, jour vide, jour avec 2 séances, phases | 🟡 |
| 14 | Ma progression : masquer un résultat, restaurer, fiches records | 🟡 |
| 15 | Sprinty : chaque suggestion, question libre, choix multiples, graphique, tableau, PDF, Écouter, 👍/👎, historique (épingler, supprimer), nouvelle conversation, quota atteint, hors-ligne | 🟡 |
| 16 | Messages : écrire au coach, au groupe, envoyer / signaler / bloquer | ⬜ |
| 17 | Profil : informations, photo (caméra, galerie, retirer), rappels (permission), export des données, bloqués, suppression de compte (annuler) | 🟡 |
| 18 | Abonnement Plus : paywall, restaurer les achats | ⬜ |
| 19 | Tutoriel : 10 étapes | 🟡 |
| 20 | Notifications : réception et ouverture au bon écran | ⬜ |
| 21 | Compte neuf sans coach : plan Sprinty complet (questions sécurité, plan, ajout au calendrier) | ⬜ |
| 22 | Mineur : restrictions (nutrition, Sprinty) | ⬜ |

## Résultats
| Bug trouvé | Corrigé |
|---|---|
| Check-in « Modifier » : étape 1 vide | oui |
| Pesée : 0 ou 9999 kg acceptés (9999 aurait été enregistré) | oui, bornes 25 à 300 kg, gras, muscle, eau |
| Portion d'un aliment : 99 999 bananes = 10 499 895 kcal enregistrés | oui, refus au-delà de 5 kg |
| Portion à 0 : bouton muet | oui, message |
| Fenêtre « Modifier la portion » : bouton caché par le clavier | oui |
| Réglages nutrition : 99 999 kcal acceptés, poids actuel vide malgré une pesée | oui |
| Recherche « banane » : titre « Chair sans peau de banane », fiche à 0 kcal | oui |
| Écran Poids vide : « -- kg » et période affichés sans donnée | à traiter |
| Compte neuf : objectif de 2 000 kcal affiché sans l'avoir choisi | à décider |
| Prénom « Athlète » : caractère é cassé (donnée du compte de test, pas l'app) | non |
