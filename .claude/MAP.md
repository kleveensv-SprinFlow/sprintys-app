# Carte du code (pour ne pas explorer à l'aveugle)

Lis ce fichier AVANT de chercher. Mets-le à jour si tu ajoutes/déplaces un module. Tailles en lignes.

## Routes (`app/`, routing seul)
- `(athlete)/` index, calendar, day/[date], nutrition, meal/[type], body, performance, groups, message, settings
- `(coach)/` index, calendar, day/[date], week, group, chat, analyze, profile, athlete/[id] (+ calendar, performance, day/[date])
- `(auth)/` login, signup, complete-profile, verify-email · `auth/` callback, reset-password · `chat/sprinty`, `chat/[type]/[id]` · `legal/[doc]`

## Noyau
- `src/core/` theme.ts (tokens), glass.ts, navigation.ts · `src/types/` supabase.ts (généré, 1300 l : grep, ne pas lire), workout.ts, period.ts, declarations.d.ts
- `src/store/` (Zustand) : authStore 740, coach/coachStore 613, nutrition/nutritionStore 543, workoutStore 322, sprintyChatStore, checkInStore, workoutBuilderStore, consentStore, entitlementStore, bodyStore, onboardingStore, sprintyStore
- `src/services/` (API/calculs) : workoutService 934, athleteAnalysisContext 761 (contexte IA), foodSearchRank, chatService, checkInService, periodService, notifications, purchases (RevenueCat), resultsOutbox (file hors-ligne), nutritionService, aiNutritionService, aiService, openFoodFactsService, weatherService, coachExerciseService, exportService, moderationService, supabase.ts (client)

## Fonctionnalités (`src/features/<x>`)
- **calendar/components** (très gros, 1000–2400 l) : RunWorkoutBuilder, StrengthWorkoutBuilder, StairsWorkoutBuilder, TechnicalWorkoutBuilder, RestDayBuilder, CompetitionBuilder, WorkoutDetailModal, PeriodModal, ProgramModal, Copy*/Repeat*/TemplatePickerModal, CoachReplyBox
- **nutrition** : components (FoodSearchModal 1450, MealSection, MacroLanes, AdaptiveTargetCard…), data/foodCatalogData (1400, données), types
- **sprinty** (coach IA) : SprintyChatScreen 683, proposalWriter, agentClient, pdf, blocks/ (Chart, Data, Proposal)
- **performance** : PerformanceView, MaxesBlock, MaxEditSheet, reportPdf · **workout** : progression, chrono, sessionKind
- **checkin** : CheckInModal + steps (Sleep, Mental, Pain) ; `BodyMap3D` (corps 3D expo-gl + three, modèle `assets/models/body.glb`, régénération : `tools/3d/`) ; `bodyZones.ts` (catalogue des zones, partagé 3D/liste) ; `painTaxonomy.ts` (types, seuil d'alerte, couleurs) · **coach** : TeamHealthModal 950, TeamAlertsCard, TeamSwitcher, BroadcastModal
- **auth** : RegisterMultiStep + steps/ · **billing** : PaywallSheet, plans · **account** : AccountScreen 622 · **onboarding** : TourOverlay + tourContent · **notifications**, **chat** (PollMessage), **body**, **athlete** (header, jauges, carrousel)
- `src/shared/components` : Button, Input, BottomSheet, Header, EmptyState, Skeleton, PressableScale, MonthlyCalendar 790, OfflineBanner… (réutiliser avant de créer)
- `src/legal/` : age, consents, documents (233), publisher

## Backend (`supabase/`)
- `functions/` : sprinty (tools.ts 1364, prompts.ts, sessions.ts), chat, export_data, delete_account_and_assets, revenuecat_webhook, search-competitions
- `migrations/` datées (ne jamais éditer une migration appliquée) · `seed_exercises.sql` (gros)

## Hors code
- `store/` fiches stores + captures · `docs/` pages légales générées · `fastlane/`, `.github/workflows/`, `eas.json` · `scripts/`
