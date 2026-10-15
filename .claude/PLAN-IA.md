# Plan — chantier IA (Sprinty, chat IA, chats de groupe)

Objectif : un Sprinty présent mais discret, un chat IA qui fait « produit fini », des discussions d'équipe vivantes.
Même méthode que le check-in : corrections d'abord, puis présence de Sprinty, puis chat IA, puis chats de groupe.

## État constaté (2026-10-15, lecture du code)
Déjà solide : streaming des réponses avec statut (« Je regarde les check-ins… »), bouton stop, réessayer, historique,
suggestions de départ par profil (coach / athlète suivi / athlète seul), visuels (graphiques, tableaux, cartes de
proposition validables), export PDF, règles serveur prudentes (pas de diagnostic, questions avant d'agir, pas d'emojis,
mineurs protégés), quota IA, « IA · pas un avis médical » visible. Chats : temps réel, envoi optimiste avec
« réessayer », séparateurs de jours, regroupement par expéditeur, sondages, signalement et blocage, non-lus.

Constats :
- C1 Sprinty n'existe visuellement que dans l'en-tête du chat (animation Lottie 38 px) et comme logo statique ailleurs :
  aucune présence dans l'app (accueil, bilan, séances), pas d'avatar à côté de ses réponses.
- C2 Pas d'entrée contextuelle « Demander à Sprinty » depuis les écrans où une question naît (bilan du check-in,
  douleurs côté coach, détail d'une séance).
- C3 Après une réponse, rien ne propose la suite (relances) ; pas d'avis 👍/👎 pour mesurer la qualité.
- C4 Actions sur un message via une alerte texte (copier / PDF / réessayer) : fonctionnel mais daté.
- C5 Chats : tout l'historique est chargé d'un coup (`chatService.getMessages` sans limite) → lent sur un vieux salon d'équipe.
- C6 Chats : avatars en initiales (les photos de profil ne sont pas utilisées), aucune réaction alors que la table
  `message_likes` existe, pas de réponse à un message, pas de copie du texte, sondage envoyable avec une seule option.

## Phase A — Corrections (pas de décision de design)
A1 Pagination du chat : 50 derniers messages, chargement des plus anciens en remontant.
A2 Sondage : question + au moins 2 options obligatoires, retrait d'une option vide, choix multiple activable.
A3 Appui long : « Copier » pour tous les messages ; ses propres messages aussi (aujourd'hui rien).
A4 Photos de profil dans les bulles et l'en-tête (repli sur l'initiale).

## Phase B — Sprinty plus vivant, sans en abuser (maquette avant code)
B1 Un seul composant `SprintyAvatar` avec 4 états : repos (respiration très lente), réfléchit (lueur qui tourne),
   content (petit rebond), attention (teinte orange). Respecte « réduire les animations ».
B2 Avatar à côté de la première bulle de chaque réponse de Sprinty.
B3 « Le mot de Sprinty » sur l'accueil : UNE phrase par jour tirée des données (aucun appel IA, gratuit, pas de quota),
   ex. « 3 nuits sous 7 h cette semaine. On regarde ça ? ». Touchable → chat avec la question préremplie. Masquable.
B4 Entrées « Demander à Sprinty » : bilan du check-in, carte douleurs coach, détail de séance (question préremplie).
B5 Le conseil du bilan de check-in signé par l'avatar de Sprinty (cohérence).
Règle : Sprinty ne parle jamais le premier par notification, et jamais plus d'un message spontané par jour.

## Phase C — Chat IA « produit fini »
C1 Relances : 2–3 puces de suite proposées après chaque réponse (outil serveur `suggest_followups`, déploiement de
   l'Edge Function `sprinty`).
C2 Avis 👍/👎 sur chaque réponse (+ raison facultative) → table `ai_feedback` (RLS : chacun les siens), pour suivre la qualité.
C3 Feuille d'actions propre (icônes) : copier, exporter en PDF, réessayer, signaler une réponse.
C4 Quota visible seulement quand il reste peu (« Encore 3 messages cette semaine »), sans pousser à l'achat.

## Phase D — Chats de groupe vivants
D1 Réactions : double toucher = ❤️, compteur sous la bulle (table `message_likes`).
D2 Répondre à un message (citation au-dessus de la bulle).
D3 Annonce épinglée par le coach en haut du salon (l'annonce rédigée avec Sprinty peut y aller directement).
Plus tard (à décider) : photos dans le chat, « vu par » sur les annonces.

## Décisions (2026-10-15)
1. Animation : on garde les animations actuelles et on peut en créer de nouvelles à partir du logo ; effet « 3D » = relief (ombres, reflets, légère rotation de la tête) seulement si faisable sans alourdir ; sinon on ne le fait pas.
2. « Le mot de Sprinty » sur l'accueil : oui.
3. Réactions : 4 réactions (❤️ 👍 🔥 💪) + 1 emoji personnalisable au choix.

## État
- Phase A faite (2026-10-15) : messages chargés par pages de 50, sondage vérifié (question, 2 options distinctes, choix multiple), copie du texte (tous messages), photos de profil dans bulles et en-tête.

## Questions (réponses ci-dessus)
1. Animation de Sprinty : garder les animations Lottie actuelles (à revoir à l'écran) ou un avatar animé refait à
   partir du logo (plus léger, cohérent partout) ?
2. « Le mot de Sprinty » sur l'accueil : oui / non ?
3. Réactions dans les chats : seulement ❤️, ou 4 réactions (❤️ 👍 🔥 💪) ?
