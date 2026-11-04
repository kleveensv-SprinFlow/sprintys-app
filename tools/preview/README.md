# Aperçu des écrans (captures sans build)

Voir l'app comme sur un téléphone (390 × 844) depuis un ordinateur ou la machine cloud, **sans attendre un build** et **sans aucune vraie donnée** : l'app est compilée en version web avec une adresse Supabase factice, et `mock.js` répond à sa place avec des données inventées.

## En deux commandes
```bash
node tools/preview/build.js            # une fois, puis après chaque changement de code (≈ 2 min)
node tools/preview/shoot.js default / .preview/accueil.png 1100
```
Les captures sont des PNG (double densité). Le dossier `.preview/` est ignoré par git.

## Options de `shoot.js`
```
node tools/preview/shoot.js <scénario> <route> <sortie.png> [hauteur] [--click "texte"]… [--wait ms]
```
| Paramètre | Rôle |
|---|---|
| scénario | `default` (adulte), `minor` (16 ans), `stale` (dernière pesée il y a 12 jours) |
| route | `/`, `/calendar`, `/nutrition`, `/ai-access`, `/ai-access/new`… (les groupes d'expo-router comme `(athlete)` ne figurent pas dans l'URL) |
| hauteur | 844 par défaut. L'écran défile en interne : prendre 1100 à 1700 pour tout voir |
| `--click "texte"` | touche l'élément portant ce texte avant la capture (répétable, dans l'ordre) pour ouvrir une fenêtre, un onglet… |

## Ajouter un scénario ou des données
Tout est dans `mock.js` : `buildData(options)` construit le profil, les séances, pesées, repas… et `install()` répond aux appels Supabase. Une table absente renvoie une liste vide ; une route d'écran qui plante en affichant « erreurs » dans la sortie indique en général une table ou une fonction à ajouter. Les filtres de requêtes ne sont pas appliqués (sauf `type_seance` pour les compétitions).

## Limites
La version web n'est pas l'app native : polices, interrupteurs, zones sûres, retours haptiques et animations natives diffèrent. Pas de localisation (la météo affiche « Localisation désactivée »), pas de notifications, pas de caméra, pas de carte 3D du corps. À utiliser pour la mise en page, les textes, les espacements et les règles d'affichage (mineur, vide, erreur) ; garder un essai sur téléphone avant une sortie.

Aucun secret ni vraie donnée n'est utilisé ou enregistré par cet outil.
