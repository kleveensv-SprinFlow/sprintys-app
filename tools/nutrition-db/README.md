# Base nutritionnelle Sprintys

`build_master_db.py` fabrique `out/Master_Nutrition_DB.xlsx` (à relire et corriger) et `out/master_nutrition_db.csv`
(à importer dans `public.food_master`, voir `supabase/migrations/20261029090000_food_master.sql`).

## Lancer
Python 3.12 + `pip install pandas openpyxl xlrd requests`, puis `python build_master_db.py`.
Les sources (Ciqual 2020, USDA Foundation et SR Legacy) sont téléchargées dans `cache/`.

## Feuilles du classeur
- **Aliments** : toute la base (macros et micros pour 100 g, état, facteur de cuisson, portion, `display_name`, `search_tags`, `search_priority`, `popularite`).
- **Niveau1_a_valider** : les aliments du quotidien, à valider (colonnes « valide » et « correction »).
- **Exclus** : fiches Ciqual sans aucune valeur nutritive.
- **Rapport** : compteurs et contrôles (écart de la formule d'énergie, règles sans fiche…).

## À savoir
- Plus d'un aliment sur quatre n'a pas d'énergie dans Ciqual 2020 : elle est recalculée (règlement UE 1169/2011) et marquée `kcal_source = calculee`.
- `0.0` = trace ou valeur absente ; `micros_manquants` compte les micronutriments non renseignés par Ciqual.
- Portions et facteurs de cuisson : règles générales, marquées « estimation » ; à valider pour le niveau 1.
- Mention de source obligatoire dans l'app (Ciqual ANSES, USDA FoodData Central).
- Pour étendre le niveau 1 : ajouter des lignes dans `TIER1` (ordre = popularité), relancer, relire.
