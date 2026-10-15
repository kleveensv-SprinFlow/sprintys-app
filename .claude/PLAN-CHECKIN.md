# Plan — chantier Check-in (athlète + coach)

Objectif : un check-in rapide (< 30 s un jour sans douleur), fiable (aucune donnée inventée), lisible pour le coach, sans surcharge. Ordre : 1 corrections → 2 carte du corps → 3 côté coach → 4 finitions.
Fichiers clés : `src/features/checkin/components/*`, `src/store/checkInStore.ts`, `src/services/checkInService.ts`, `src/features/coach/components/TeamHealthModal.tsx`, `app/(coach)/athlete/[id].tsx`, `supabase/migrations/20261021090000_team_alerts.sql` (alertes), `src/services/athleteAnalysisContext.ts` (contexte IA).
Décision utilisateur : **le cycle menstruel est supprimé** (déjà plus collecté ni affiché ; reste du code mort, la colonne et le trigger).

## Constats vérifiés (lecture du code, rien exécuté)
- C1 Le score de forme ignore les douleurs « Contracture » et « Autre » dans la règle d'alerte (plafond 45 %) : une contracture à 9/10 donne ~78 % de forme. Atténuant : l'alerte coach SQL (`get_team_alerts`) déclenche déjà pour toute douleur ≥ 7, donc le coach est prévenu ; mais score et alerte se contredisent.
- C2 Une douleur est clé par zone seule (`addPain` filtre sur `muscle_id`) : impossible de noter gauche ET droite, ni deux problèmes dans une zone.
- C3 Valeurs par défaut (23h→7h, 8 h, qualité 3, stress 2, fatigue 3, motivation 3) enregistrées comme réponses si l'athlète clique « Suivant » sans toucher.
- C4 Code mort : `setWeight` (la colonne `weight` n'existe pas dans `check_ins` → l'upsert échouerait) et `menstruation`.
- C5 Types d'alerte incohérents entre SQL (`Claquage`, `Tendinite`) et l'app (types proposés : Courbature, Contracture, Élongation, Déchirure, Articulaire, Autre).
- Non audité : `CheckInSummaryModal` (300 l), `AthleteGauges`, point d'entrée et rappel du check-in, `CoachSharingSheet`.

## Phase 1 — Corrections (agents : architecte-mobile, dev-backend-supabase, qa-testeur)
1.1 **Taxonomie unique des douleurs** : un fichier `src/features/checkin/painTaxonomy.ts` (types, gravité, côtés). Règle commune app + SQL : alerte critique si intensité ≥ 7 (tout type) ou ≥ 5 (type aigu). Aligner `calculateDailyScores` et `get_team_alerts`. Retirer les types fantômes ou les proposer.
1.2 **Clé de douleur = zone + côté** (`"genoux:Gauche"`), champ `muscle_id` conservé pour l'ancien format (JSONB, pas de migration). Mettre à jour `addPain/removePain`, l'affichage coach (`TeamHealthModal`, `athlete/[id].tsx` : afficher le côté), le contexte IA.
1.3 **Plus de données inventées** : un pilier non touché n'est pas enregistré comme réponse. Option retenue par défaut : préremplir avec la dernière réponse **et** exiger une confirmation explicite (« C'est bien ça »). Si une étape est passée, le pilier est `null`, exclu du score (poids renormalisés) et affiché « non renseigné » côté coach. Migration : rendre `bedtime`/`wakeup_time` nullables.
1.4 **Suppression du cycle et du code mort** : retirer `menstruation` (interface, store, `setMenstruation`), `weight`/`setWeight` et le bloc profil du submit. Migration datée : `DROP COLUMN menstruation` + réécrire le trigger `check_health_data_consent` (ne garder que `pains`). Régénérer `src/types/supabase.ts`. Vérifier docs légales (aucune mention trouvée) et export RGPD.
1.5 **Tests** : installer jest-expo (validé avec le chef de projet) ; tests unitaires sur `calculateDailyScores` (douleur 9/10 toutes catégories, piliers manquants, lissage) et sur la clé zone+côté.
Définition de terminé : `npx tsc --noEmit` à 0 erreur, tests verts, rejouer à la main : contracture 9/10, genou G 6 + genou D 3, passage sans toucher.
Effort : ~2 jours. Ordre : 1.1 → 1.2 → 1.3 → 1.4 → 1.5.

## Phase 2 — Carte du corps (agents : designer-ui, ux-redacteur, architecte-mobile)
Étape 0 (bloquante) : **maquette interactive** validée par l'utilisateur (« go ») avant tout code.
2.1 Silhouette face/dos en `react-native-svg` (déjà installé), dessinée à la main en formes simples : aucune licence externe. ~20 zones tactiles ; zones minuscules (poignets, chevilles, pieds) avec zone de toucher élargie ≥ 44 pt. Bascule Face/Dos.
2.2 Parcours : bouton **« Rien à signaler »** en premier (enregistre `pains = []` explicite) → toucher une zone → petit panneau : **intensité d'abord** (1 geste), type et commentaire optionnels, **côté déduit de la moitié touchée** (plus de question). Zone colorée selon l'intensité ; puces récap sous la carte.
2.3 **Vue liste conservée** (bascule) : accessibilité (lecteur d'écran), gros doigts. Mêmes ids de zones que l'existant (quadriceps, ischios…) pour garder l'historique compatible.
2.4 Consentement santé inchangé (déjà géré dans `PainStep`).
2.5 Animations légères (Reanimated), retour haptique, états vide/erreur. Textes validés par ux-redacteur.
Effort : ~3–4 jours, dont maquette 0,5 j.

## Phase 3 — Côté coach (agents : designer-ui, dev-backend-supabase, architecte-mobile)
3.1 **Fiche athlète** : silhouette « chaleur » des 7/14 derniers jours (zone + côté), liste détaillée, tendance de forme ; piliers non renseignés clairement indiqués.
3.2 **Vue équipe** : carte de chaleur des zones récurrentes, taux de check-ins remplis, tri par urgence. Fusionner avec les alertes existantes (`get_team_alerts`).
3.3 **Alerte « douleur persistante »** (même zone ≥ 3 jours) : nouvelle migration + `alertsService`. Alerte « check-in silencieux » existante conservée.
3.4 Cohérence des chiffres : forme, alerte et fiche racontent la même histoire (même taxonomie, Phase 1).
3.5 Vérifier le périmètre de partage (`CoachSharingSheet`, consentement `health_data`) : le coach ne voit les douleurs qu'avec accord.
3.6 Contexte IA (`athleteAnalysisContext`, outil `get_checkins` de Sprinty) : inclure côté et persistance.
Effort : ~3 jours.

## Phase 4 — Finitions (qa-testeur, juriste-conformite, marketing-growth)
Relire `CheckInSummaryModal` et le point d'entrée ; rappel du check-in (infra push existante) ; mise à jour tour guidé/FAQ ; textes légaux si la collecte change ; nouvelles captures stores. Revue sécurité RLS des changements (securite-appsec).

## Décisions de l'utilisateur (2026-10-15)
1. Sommeil/mental : **préremplir avec la dernière réponse + confirmation explicite** (« C'est bien ça »). Un pilier passé reste vide. ✔ implémenté en Phase 1.
2. Silhouette : on teste ; **les muscles doivent être identifiables facilement, de face et de dos** (donc un dessin plus anatomique que de simples capsules : muscles nommés/contours lisibles, étiquettes au toucher). À valider sur maquette avant code.
3. **Notification push au coach pour une douleur forte** — constat 2026-10-15 : le trigger `push_on_checkin` existe déjà en base et notifie le coach pour **toute** douleur (même 2/10) ou forme ≤ 40 ; à resserrer sur `isCriticalPain`. Note : les migrations du 14 au 24 oct. ont été appliquées à la main (absentes de `supabase_migrations.schema_migrations`), seules celles de Phase 1 sont tracées.
   Maquette silhouette : https://claude.ai/artifact/ThLHX1BwyKPJDYqhxZyuM8 (2D face/dos, côté déduit du toucher ; nouvelles zones `tibias`, `dorsaux`). 3D écartée pour l'instant (poids, perf Android, ciblage plus lent, licence des modèles).
   Ancienne formulation :  (Phase 3 : réutiliser l'infra push `20261023100000_push_notifications.sql`, seuil = règle d'alerte commune `isCriticalPain`, déclenchée à l'enregistrement du check-in, respectant le consentement `health_data`).

## État Phase 4 (2026-10-15)
- Fin de check-in : le bilan s'ouvre tout seul (« Check-in enregistré ») avec forme du jour, série de jours d'affilée, conseil prudent (douleur forte prioritaire, renvoi vers un professionnel si ça dure), douleurs du jour, piliers non renseignés signalés. Toast supprimé.
- Rappel quotidien : notification locale à l'heure choisie (08:30 par défaut), sautée si le check-in est fait ; réglage dans Compte › Notifications › Rappel du check-in ; toucher le rappel ouvre directement le check-in (`/(athlete)?checkin=1`).
- Mentions légales : section « Contenus de tiers » (Z-Anatomy / BodyParts3D, CC BY-SA), pages `docs/` régénérées.
- Non testé sur téléphone (notifications locales, ouverture depuis le rappel, enchaînement des deux fenêtres sur iOS).

## État Phase 3 (2026-10-15)
- Fiche athlète (coach) : section « Douleurs · 14 derniers jours » (`CoachPainSummary`) : corps 3D en mode toucher seul (la page défile), couleur = intensité max, liste triée (persistantes d'abord), commentaire au toucher.
- Forme de l'équipe : carte « Zones qui reviennent · 7 jours » (`TeamPainZones`), nombre d'athlètes par zone, persistances.
- Alertes : `get_team_alerts` précise le côté et ajoute « Douleur qui dure » (même zone + côté, 3 j sur 7 ; grave si ≥ 7/10). Migration `20261025110000_alerts_persistent_pain.sql` appliquée, fonction exécutée sans erreur avec un vrai coach.
- Sprinty : le contexte IA liste les douleurs qui durent.
- Non fait : carte 3D de chaleur pour toute l'équipe (liste seulement), test sur téléphone.

## État Phase 2 (2026-10-15)
- Carte du corps **3D** intégrée à l'étape douleurs (`BodyMap3D`), vue liste conservée en secours (bascule + repli auto si la 3D échoue).
- Modèle Z-Anatomy regroupé en 26 zones G/D ; aponévroses de l'oblique et du grand dorsal découpées pour que abdominaux et lombaires soient touchables.
- Toucher tolérant (recherche en anneaux 14/26/40 pt), zoom automatique sur la zone touchée, pincer/glisser à deux doigts, bouton Recentrer.
- Feuille : intensité 1–10 d'abord, type facultatif (« Non précisé »), précision ouverte d'office dès 5/10.
- Notification coach resserrée sur la douleur forte (migration `20261025100000_push_strong_pain_only.sql`, appliquée).
- **Non testé sur téléphone** : nécessite un nouveau build natif (expo-gl). À valider : fluidité Android d'entrée de gamme, chargement du .glb, toucher des petites zones.
- Reste : crédit CC BY-SA à ajouter aux mentions légales (juriste-conformite), côté coach (Phase 3).

## État
- **Phase 1 : faite en local** (voir commit). 1.1 taxonomie, 1.2 zone+côté, 1.3 confirmation/piliers nuls, 1.4 cycle + code mort supprimés, 1.5 tests (jest-expo, 12 tests). La règle SQL `get_team_alerts` était déjà alignée (≥7 ou ≥5 aigu) : pas de changement SQL d'alerte à ce stade.
- À déployer côté Supabase : migration `20261025090000_checkin_optional_pillars_no_cycle.sql` (à appliquer AVANT de publier l'app, sinon l'enregistrement d'un pilier vide échoue).
- Reste dans le trigger : « Non renseigné » sur la fiche coach peut déborder sur petit écran (à vérifier en Phase 3).

## Total
~9–10 jours de travail agent, livrable par phases, un commit local par phase, `tsc` à 0 avant chaque commit.
