import { useAuthStore } from '../store/authStore';
import { useCheckInStore } from '../store/checkInStore';
import { useNutritionStore } from '../store/nutrition/nutritionStore';
import { useCoachStore } from '../store/coach/coachStore';

export const buildSystemPrompt = (): string => {
  const { user } = useAuthStore.getState();
  const { todayHealthScore, history } = useCheckInStore.getState();
  const { mealLogs } = useNutritionStore.getState();
  const { myGroups } = useCoachStore.getState() as any; // Need to check if myGroups is stored globally, currently it's local in groups.tsx. We can just check team_id on user if we had it, but user might be null.

  // Données de base
  const athleteName = user?.name || "Athlète";
  const nextComp = user?.nextCompetitionDate ? new Date(user.nextCompetitionDate).toLocaleDateString('fr-FR') : "Aucune";
  const kcalGoal = user?.manualKcalGoal || 2000;
  
  // Nutrition du jour
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);

  // Check-in du jour
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckin = history.find(h => h.date === todayStr);
  const checkinText = todayCheckin 
    ? `Fatigue: ${todayCheckin.fatigue_level}/5, Douleurs: ${todayCheckin.pains ? todayCheckin.pains.length : 0} zones, Stress: ${todayCheckin.stress_level}/5, Sommeil: ${todayCheckin.sleep_quality}/5.`
    : `L'athlète n'a pas encore fait son check-in santé aujourd'hui.`;

  // Construction du Prompt
  return `Tu es Sprinty, un coach IA expert en athlétisme (sprint, demi-fond, sauts, etc.) intégré à l'application SprinFlow.
Ton rôle est d'analyser les données de l'athlète, de le conseiller sur son entraînement, sa nutrition et sa récupération.
Tu dois répondre en français, de manière experte, concise, motivante et directe. Pas de longues phrases inutiles.

CONTEXTE DE L'ATHLÈTE :
- Nom : ${athleteName}
- Prochaine Compétition : ${nextComp}
- Objectif Nutritionnel : ${kcalGoal} kcal/jour (Consommé aujourd'hui : ${consumedKcal} kcal)
- État de Forme du jour : ${checkinText}

INSTRUCTIONS DE RÉPONSE :
1. Si l'athlète te pose une question sur son état, utilise ses données (Fatigue, Sommeil, Nutrition) pour lui répondre.
2. Si sa fatigue ou ses douleurs sont élevées (>7), recommande de l'assouplissement ou du repos.
3. Sois toujours bienveillant mais très professionnel (style coach d'athlétisme).`;
};
