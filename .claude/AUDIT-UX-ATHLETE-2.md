# Audit téléphone — espace athlète, passe 2 (2026-10-19)

Appareil : Galaxy S24+ (APK construit depuis 7a7b63c). Compte : celui de l’utilisateur ; aucune donnée enregistrée (tout ouvert puis annulé), sauf une erreur de ma part : un toucher sur « Rappels » a désactivé les notifications, rétabli aussitôt.
Méthode : liste des éléments touchables par l’arbre d’accessibilité + capture avant/après.

## Écrans et boutons réellement touchés
Accueil (Forme du jour, Nutrition, Compétition, semaine, balayage du carrousel, météo, records, poids) · Bilan du jour (+ Modifier) · Mon groupe (Quitter → confirmation annulée, discussion coach, menu Signaler/Bloquer) · Profil (Mes informations, Photo, Rappels, heure du rappel, Utilisateurs bloqués, FAQ dépliée, Conditions, Confidentialité, Mentions, Supprimer → confirmation annulée, Tutoriel) · Nutrition (Repères Objectif/Repas, Ajouter, recherche, Photo, Décrire + analyse IA, Code-barres, Récents/Fréquents/Mes repas, fiche portion) · Séances (mois, jour, détail séance, saisie d’un chrono) · Messages · Sprinty (accueil, question, suggestions, historique) · Poids (onglets, périodes, nouvelle pesée) · Ma progression (fiche record) · Météo détaillée.

## Non testés
Exporter mes données, Se déconnecter, paywall/abonnement, enregistrement réel d’un repas / d’une pesée / d’un chrono (données de l’utilisateur), discussion de groupe, Actions du bilan sur 1S/3M, Assistant IA et Suivi des douleurs (interrupteurs : pas touchés par prudence), notifications système.

## Constats (identifiants B1…B32)
- B1 Check-in "Modifier" -> étape 1 vide (reproduit 2x). Cause probable: deux Modal Android (bilan se ferme + check-in s'ouvre dans le même tick) AthleteGauges.handleEditCheckIn
- B2 Bilan du jour: "moy. 7h20 · objectif 7.5 h" formats incohérents avec "7 h 30"
- B3 Bilan du jour: graphique Forme 30 j minuscule, fragmenté, sans échelle
- B4 Profil: ligne "Rappels" a un chevron mais bascule on/off au toucher (a désactivé mes rappels par accident)
- B5 Tutoriel: 10 étapes annoncées "une minute"
- B6 Profil: "Photo de profil" en double (bouton appareil + ligne)
- B7 Repères: 'Actuel 80 kg' (poids profil) alors que dernière pesée ~79,1; calories 2110 vs calcul 2093
- B8 Recherche aliment "banane": ordre = plantain cuite, "Banane jaune ... Martinique" 0 kcal/0 g (donnée Ciqual vide), plantain crue, PUIS la vraie banane (affichée "Chair sans peau de banane, crue"), nectar, petits pots bébé. Cause: tri "cuit d'abord" (nutritionService:117-123) + 71 lignes Ciqual à 0 kcal (hors eaux: chayote, banane Martinique) + titre reformulé.
- B9 Nutrition: pastilles 1/2/3 devant Protéines/Glucides/Lipides (chiffres sans sens, ressemblent à un classement)
- B10 Nutrition: pastille série "6" non interactive mais a l'aspect d'un bouton
- B11 Bouton Retour Android depuis Nutrition ramène vers l'écran précédent (profil) et non l'accueil
- B12 Récents du petit-déjeuner: sauce soja, raie, poulet (pas contextuel au repas)
- B13 Analyse IA "2 oeufs et une banane": carte "Œuf au plat" mais aliment retenu "Oeuf dur" (titre ≠ aliment); banane = 100 g (alors qu'une banane = 120 g dans le catalogue, et l'unité reste "g")
- B14 Décrire: exemple en placeholder "sauce huître" peu représentatif; Android Retour ferme tout l'ajout et perd le texte tapé
- B15 Photo: ouvre l'appareil photo système Samsung (OK) 
- B16 Scanner code-barres: écran noir + cadre, aucune consigne écrite ("place le code dans le cadre")
- B17 Fiche portion (ex. Oeuf dur): clavier numérique s'ouvre d'office et la fiche remonte: nom de l'aliment et bouton fermer hors écran, le "2" géant est coupé en haut
- B18 Pastilles de portion "2 œuf" / "3 œuf" (pas de pluriel)
- B19 Calendrier: période "28 sept. – 30 déce." abréviation coupée; points colorés sans légende; traits rouges de phase sous chaque semaine
- B20 Calendrier: le bouton Aujourd'hui apparaît et décale toute la grille de 25 px (saut de mise en page)
- B21 Détail séance: en-tête "SÉRIE" coupé en "SÉRI/E"; chronos "15.64 s" (point) vs "17,90 s" (virgule) ; "Dernier 17,90 s · record 15,40 s" répété à l'identique sur chaque ligne ; chip "Côte" doublonne le titre
- B22 Sprinty accueil: la tête de la mascotte est coupée par l'en-tête (haut du crâne rogné)
- B23 Sprinty accueil: "Mon bilan de la semaine" et "Analyse ma semaine" quasi identiques; 5 suggestions + paragraphe d'intro long
- B24 Sprinty: "Ta prochaine séance est un jour de repos prévu le 25 octobre" — la sortie get_workouts (tools.ts ~702) inclut les jours de repos comme séances ; réponse générique sans le contexte (objectif perte de gras 2110 kcal, rien saisi aujourd'hui)
- B25 Sprinty: la 1re puce de suggestion dépasse le bord droit de l'écran ; "Que souhaites-tu ?" redondant avec les puces
- B26 Accueil météo: 'mieux vaut s'entraîner avant' alors qu'aujourd'hui est un jour de repos (conseil incohérent)
- B27 Écran Poids: le tracé est la moyenne 7 j alors que les points sont les pesées brutes -> points flottants hors de la courbe (la pastille 79,1 kg du haut ≠ fin de courbe 78,9) ; avec 4 pesées/mois la moyenne glissante n'a pas de sens ; aucune graduation en kg ni dates sur l'axe ; 20 % du cadre vide
- B28 Poids>Muscle (et Gras): l'historique en dessous reste la liste des pesées (79,1 kg…) au lieu des valeurs muscle/gras ; courbe à 3 points très vide
- B29 Ma progression: exercice nommé "12,9,6" (un schéma de reps pris pour un nom) avec "40 kg × 1"
- B30 Ma progression: "120 m (côte)" 15,40 s daté 10/10 dans Records battus mais 17/10 dans Records (dates incohérentes) ; le bloc "Records battus" répète l'accueil
- B31 Ma progression: toucher un record ouvre direct 'Résultat faux ? Masquer' (aucune fiche d'historique/courbe de l'exercice) ; geste destructif comme seule action
- B32 Météo: modal 'Rafales 42' sans unité ; heures '12 h' sur la carte vs '12:00' dans le modal vs '18:48' (formats mêlés)
