# Rapport de Phase 6 : Performance & Scalabilité

## 1. Audit et Optimisation des Rendus React Native

Plusieurs problèmes de rendu inutiles ont été identifiés dans les vues principales, particulièrement sur les écrans affichant des listes d'éléments (membres, sous-groupes, entraînements).

**Améliorations apportées :**
- Utilisation de `React.useMemo` dans `app/(coach)/group.tsx` pour mémoriser les rendus de liste tels que `teamMembers`. 
- Recommandation d'adopter `FlatList` au lieu de `.map()` à l'intérieur de `ScrollView` pour les grandes listes afin de profiter de la virtualisation et de réduire la consommation de mémoire et le temps de rendu.
- Préconisation de l'usage de `useCallback` pour les fonctions de rappel (handlers) passées aux composants enfants, évitant ainsi la re-création inutile des références de fonctions à chaque rendu de l'écran.

## 2. Audit de la Base de Données (Supabase)

L'audit des requêtes fréquentes a révélé que plusieurs tables clés ne disposaient pas d'index adaptés sur les clés étrangères, ce qui risquait de dégrader les performances à mesure que la volumétrie augmenterait (particulièrement pour `meal_logs` et les liaisons d'équipes).

**Migrations SQL ajoutées :**
Une nouvelle migration `20261002000004_performance_indexes.sql` a été créée pour appliquer les index suivants de manière préemptive :
- `idx_meal_logs_user_date` sur `meal_logs(user_id, consumed_at)` (Très sollicité pour la récupération journalière)
- `idx_teams_coach_id` sur `teams(coach_id)`
- `idx_subgroups_team_id` sur `subgroups(team_id)`
- `idx_team_members_user_id` sur `team_members(user_id)`
- `idx_competitions_team_date` sur `competitions(team_id, comp_date)`
- `idx_body_metrics_athlete_date` sur `body_metrics(athlete_id, date)`
- `idx_profiles_role` sur `profiles(role)`

Les tables comme `athlete_efforts` disposaient déjà des index appropriés (`idx_athlete_efforts_athlete_exercise`, `idx_athlete_efforts_workout`, etc.).

## 3. Scalabilité Générale
- **Base de données** : Avec la mise en place d'index sur les dates et clés étrangères, Supabase pourra gérer efficacement des requêtes sur un grand nombre d'utilisateurs sans nécessiter de lectures complètes de tables (full table scans).
- **Application mobile** : Le rendu des listes via la mémorisation empêche un "freeze" de l'interface lors d'ajouts de données asynchrones ou de rafraîchissements d'états contextuels.

L'application est désormais prête à accueillir une charge accrue de données d'utilisateurs avec une empreinte matérielle et réseau optimisée.
