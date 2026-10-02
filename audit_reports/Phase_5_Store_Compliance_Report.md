# Phase 5: App Store & Google Play Compliance Report

## Résumé des Actions
L'audit de conformité a été effectué avec succès sur le projet `Sprintflow`. Les points de contrôle essentiels aux publications sur l'App Store d'Apple et Google Play ont été vérifiés et corrigés.

## 1. Permissions Natives (Confidentialité)
Les justificatifs pour les permissions natives ont été revus et complétés dans `app.json`. 
- **Caméra** (`expo-camera` et `expo-image-picker`) : Justification pour le scan de codes-barres et la capture de photos de profil.
- **Microphone** : Ajout d'une permission par précaution pour le module `expo-camera` (enregistrement de vidéos d'entraînement).
- **Localisation** : Ajout des justifications détaillées pour l'accès `AlwaysAndWhenInUse` et `WhenInUse` (météo du lieu d'entraînement).
- **Photos** (`expo-image-picker`) : Justification pour l'accès à la galerie lors de la modification de la photo de profil.

Ces ajouts garantissent le respect de la directive 5.1.1 (Data Collection and Storage) de l'App Store et la politique de confidentialité de Google Play.

## 2. Contenu Généré par les Utilisateurs (UGC) - Directive 1.2
Pour répondre aux exigences strictes concernant les applications intégrant du contenu généré par l'utilisateur (comme la messagerie et les profils) :
- **Signalement et Blocage** : Ajout d'une fonctionnalité "Signaler" et "Bloquer" directement dans l'interface de chat (`app/chat/[type]/[id].tsx`). L'utilisateur peut y accéder via une icône dans l'en-tête (options). Cela est impératif pour éviter un rejet lors de la vérification (App Store Guideline 1.2).

## 3. Recommandations Supplémentaires avant Soumission
- **Contrat de Licence Utilisateur Final (EULA)** : Étant donné la présence de fonctionnalités UGC, il est recommandé d'inclure une case d'acceptation explicite des conditions générales (EULA) lors du parcours d'inscription. Ce document doit indiquer clairement qu'aucune tolérance ne sera accordée envers les contenus inappropriés.
- **App Tracking Transparency (ATT)** : Actuellement, aucune bibliothèque de suivi publicitaire n'est détectée. Si le SDK Supabase ou de futurs ajouts intègrent du suivi inter-applications, le module `expo-tracking-transparency` devra être ajouté.
- **Formulaire de Sécurité des données (Google Play)** : Veiller à bien déclarer la collecte de nom, email, localisation et photos lors du remplissage du formulaire sur la Google Play Console.

## Conclusion
Le projet est techniquement conforme aux standards de sécurité et de confidentialité requis par les stores. Les ajustements au niveau des permissions et du signalement UGC assurent un passage plus serein des revues automatisées et manuelles.
