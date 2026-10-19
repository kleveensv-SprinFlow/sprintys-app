# Audit UI/UX sur téléphone — espace athlète (2026-10-19)

Appareil : Samsung Galaxy S24+ (1440 × 3120), APK construit depuis `7a7b63c`. Compte : celui de l'utilisateur, en lecture seule
(aucune donnée modifiée : le check-in a été ouvert puis fermé sans enregistrer).

Écrans vus : connexion, accueil (haut → bas), Séances (calendrier), détail d'un jour, Nutrition, détail d'un repas,
Messages, Sprinty (accueil du chat, une réponse, bouton Écouter), Ma progression, Poids, météo détaillée, check-in étape 1,
profil, Mon groupe.

Pas encore testés : ajout d'un aliment (recherche, scan, photo), check-in étapes 2 et 3, saisie des résultats d'une séance,
pesée, notifications, paywall. Espace coach : à faire avec un compte coach.

## Bugs visibles
1. **Courbe de poids (écran Poids et carte d'accueil)** : la courbe lissée ne passe pas par les points mesurés (3 points
   flottent à côté) et l'axe est coupé : −0,3 kg ressemble à une chute énorme. Trompeur. → courbe en segments, axe avec
   une marge minimale (ex. ± 1 kg).
2. **Check-in étape 1** : la carte « Qualité du sommeil » est coupée par le bouton « C'est bien ça » ; « Passer cette étape »
   colle au bouton. « Objectif : 7.5h » avec un point (en français : 7,5 h).
3. **Météo, carte d'accueil** : « Ressenti 18° · Vent 19 km/h · pist… » est tronqué.
4. **Météo détaillée** : « Rafales 39 km/h » passe à la ligne en coupant l'unité ; la tuile du milieu affiche « 8 % » avec
   « Piste humide » dessous : la chance de pluie et l'état de la piste sont mélangés ; la barre min/max des 7 jours est
   identique pour tous les jours (décorative, sans échelle).
5. **Connexion** : le bouton « Se connecter » est sous le pli à l'ouverture.
6. **Sprinty** : après la réponse testée, aucune suggestion de relance n'est apparue et la réponse ne commençait pas par une phrase
   en gras. À retester sur une conversation neuve (la conversation ouverte reprenait peut-être un ancien échange).

## Surcharge cognitive
1. **Accueil** : 8 blocs avant la fin de page (mot de Sprinty, check-in, nutrition, compétition, semaine, séance du jour,
   météo, records, poids). Proposition : garder en haut 3 choses — la séance du jour, le check-in, le mot de Sprinty —
   et passer nutrition, météo, records et poids en liste repliable ou en ligne unique.
2. **« Compétition : Aucune »** occupe la moitié d'une ligne pour dire qu'il n'y a rien : à masquer s'il n'y a pas de compétition.
3. **Nutrition** : éclair « 6 » (série) sans explication, jauge ovale + barre de poids + trois barres de macros : 3 formes de
   jauge différentes. La barre « 80 → 75 kg » répète la carte Poids de l'accueil.
4. **Calendrier** : un trait rouge de phase sous chaque semaine, points de 5 couleurs sans légende, dimanches en rouge.
5. **Profil** : environ 20 lignes en 5 sections ; à regrouper (Compte / Confidentialité / Aide) avec « Aide » replié.
6. **Messages** : écran presque vide avec deux lignes « Aucun message » ; « Coach Coach » (nom de test).
7. **Détail d'un jour** : « 1 bloc d'entraînement » sans contenu : l'athlète ne voit pas sa séance (ex. 6 × 120 m) sans ouvrir.
8. **Records** : « Records battus » apparaît à l'accueil et en haut de Ma progression avec les mêmes lignes.

## Ce qui est réussi
- Cohérence visuelle (verre dépoli, bleu Sprintys, arrondis), navigation basse claire à 4 onglets.
- Ma progression : « 130 kg × 5 », vrais noms, « Un résultat faux ? Touche-le pour le masquer ».
- Sprinty : mascotte, suggestions de départ lisibles, bouton « Écouter » avec états Préparation… puis Stop ; la voix démarre.
- Check-in : progression en 3 étapes et raccourci « Comme hier ».
- Météo : phrase du jour utile (« Il pleut en ce moment. Accalmie prévue vers 9 h. »).

## À décider avant de corriger (design : aucune modification sans accord)
Voir les propositions chiffrées dans la réponse du 2026-10-19.
