# Scénarios de test : une semaine avec un vrai groupe

Objectif : trouver ce qui casse **avant** d'envoyer à l'App Store / Google Play. Idéal : 1 coach (toi) + 2 ou 3 athlètes, pendant 7 jours, sur TestFlight (iPhone) et la piste interne Google (Android).
Pour chaque scénario : noter **ce que tu fais, ce que tu attends, ce qui se passe** (une capture d'écran aide).

## Coach (toi)
1. **Créer un groupe** avec 2 sous-groupes, faire rejoindre 2-3 athlètes avec le code, les valider.
2. **Programmer une séance de piste** pour tout le groupe avec une heure, un chrono cible sur une série, puis une **séance de muscu** avec tempo, effort visé, un superset et une charge en **% du max**.
3. **Séance différente par sous-groupe** : même jour, une séance pour les sprinteurs, une autre pour les haltérophiles. Vérifier que chacun ne voit que la sienne.
4. **Séance type** : enregistrer une séance (« Type »), la reprogrammer un autre jour depuis « Séances types ».
5. **Vue semaine** (Calendrier → Semaine) : déplacer une séance au jour suivant, en copier une, copier la semaine entière sur la suivante. Un athlète a-t-il bien la séance au bon jour ?
6. **Modifier une séance déjà validée** par un athlète : son commentaire, son effort ressenti et ses résultats sont-ils toujours là ?
7. **Suivre** : après validation par les athlètes, ouvrir leur fiche → Performance (records, progression, charge), carte « À surveiller » sur l'accueil.
8. **Deux groupes** (si tu en as) : créer un second groupe, changer de groupe avec le sélecteur de l'accueil. Le calendrier, la semaine et les alertes suivent-ils bien le groupe choisi ?
9. **Annonce / message** à l'équipe, puis à un seul athlète.

## Athlète
1. **Check-in du matin** (sommeil, fatigue, stress, motivation, douleur éventuelle).
2. **Valider une séance de piste** : saisir les chronos au clavier (la touche « Suivante » enchaîne les séries), effort ressenti et durée, commentaire. Puis revenir sur la séance : tout est conservé ?
3. **Valider une séance de muscu** : saisir les charges, marquer « Reps non tenues » sur une série. Pour une charge en % du max : la ligne affiche-t-elle des kilos ? Renseigner son max depuis le bouton « Renseigne ton max… ».
4. **Battre un record** : au bout de la validation, un message « Nouveau record » apparaît-il (et seulement s'il bat vraiment le précédent) ?
5. **Brouillon** : saisir la moitié d'une séance, fermer l'app complètement, la rouvrir : la saisie est-elle revenue ?
6. **Sans réseau** (mode avion) : valider une séance. Message « Enregistré hors ligne » ? Puis couper le mode avion : la séance part toute seule vers le coach (compter jusqu'à une minute) ?
7. **Rappels** : activer « Un rappel avant tes séances » (carte sur l'accueil), puis regarder le lendemain si la notification arrive 1 h avant (ou à 8 h sans heure). Refuser l'autorisation : l'app l'explique-t-elle bien ?
8. **Voir sa performance** (onglet Performance de l'accueil) : records, progression, assiduité cohérents avec ce qui a été saisi ?
9. **Quitter le groupe puis le rejoindre** : les séances futures reviennent-elles ?

## Ce qu'il faut surveiller partout
- Une donnée qui **disparaît** ou **change de valeur** toute seule.
- Un écran **vide** ou qui charge sans fin (tirer pour rafraîchir règle-t-il le problème ?).
- Un texte coupé, un bouton hors écran (petit iPhone, grand texte, mode sombre du téléphone).
- Une action qui ne répond pas, ou deux fois (double envoi).
- Lenteurs : plus de 3 secondes pour ouvrir une séance ou un calendrier.

## Quand les notifications serveur seront activées (voir PUSH_SETUP.md)
- Le coach planifie une séance → l'athlète reçoit « Nouvelle séance » dans la minute.
- Le coach copie une semaine → **une seule** notification « Planning mis à jour ».
- Message du coach → notification chez l'athlète ; toucher la notification ouvre la bonne discussion.
- Un athlète fait un check-in avec une douleur → le coach reçoit « À surveiller ».
