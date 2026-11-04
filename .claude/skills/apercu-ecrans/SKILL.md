---
name: apercu-ecrans
description: Prendre des captures des écrans de l'app (version web, données fictives, format téléphone) pour vérifier un changement d'UI ou faire un audit visuel sans attendre un build. À utiliser avant de dire qu'un écran est « terminé » et pour tout audit UI/UX.
---

# Aperçu des écrans

Outil : `tools/preview/` (détails dans son `README.md`). Aucune vraie donnée, aucune clé.

1. **Compiler** la version web (≈ 2 min) : `node tools/preview/build.js`. À refaire après chaque changement de code.
2. **Photographier** : `node tools/preview/shoot.js <scénario> <route> .preview/<nom>.png [hauteur] [--click "texte"]`
   - scénarios : `default`, `minor` (16 ans), `stale` (pesée ancienne) ;
   - route sans le groupe : `/`, `/calendar`, `/nutrition`, `/ai-access`… ;
   - hauteur 1100 à 1700 pour voir tout l'écran (le défilement est interne).
3. **Regarder la capture** (outil Read) avant de conclure. Une capture vide ou la ligne « erreurs » dans la sortie signale une table ou une fonction manquante dans `tools/preview/mock.js`.
4. Pour montrer à l'utilisateur : `SendUserFile` avec les PNG.

À garder en tête : version web ≠ app native (polices, interrupteurs, haptique, animations natives, météo, notifications, carte 3D). Valable pour la mise en page, les textes et les règles d'affichage (mineur, vide, erreur). Sur un retour de l'utilisateur sur une capture de critique, recommander seulement et attendre son « go » (CLAUDE.md, règle 2).

Si un écran a besoin de données que le simulateur ne fournit pas, les ajouter à `mock.js` (données inventées uniquement).
