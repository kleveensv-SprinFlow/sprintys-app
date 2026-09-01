import { useAuthStore } from '../store/authStore';
import { useCheckInStore } from '../store/checkInStore';
import { useNutritionStore } from '../store/nutrition/nutritionStore';
import { useCoachStore } from '../store/coach/coachStore';

export const buildSystemPrompt = (): string => {
  const { user } = useAuthStore.getState();
  const { todayHealthScore, history } = useCheckInStore.getState();
  const { mealLogs } = useNutritionStore.getState();
  const { myGroups } = useCoachStore.getState() as any; // Need to check if myGroups is stored globally, currently it's local in groups.tsx. We can just check team_id on user if we had it, but user might be null.

  // DonnÃ©es de base
  const athleteName = user?.name || "AthlÃ¨te";
  const nextComp = user?.nextCompetitionDate ? new Date(user.nextCompetitionDate).toLocaleDateString('fr-FR') : "Aucune";
  const kcalGoal = user?.manualKcalGoal || 2000;
  
  // Nutrition du jour
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);

  // Check-in du jour
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckin = history.find(h => h.date === todayStr);
  const checkinText = todayCheckin 
    ? `Fatigue: ${todayCheckin.fatigue_level}/5, Douleurs: ${todayCheckin.pains ? todayCheckin.pains.length : 0} zones, Stress: ${todayCheckin.stress_level}/5, Sommeil: ${todayCheckin.sleep_quality}/5.`
    : `L'athlÃ¨te n'a pas encore fait son check-in santÃ© aujourd'hui.`;

  // Construction du Prompt
  return `Tu es Sprinty, un coach IA expert en athlÃ©tisme (sprint, demi-fond, sauts, etc.) intÃ©grÃ© Ã  l'application SprinFlow.
Ton rÃ´le est d'analyser les donnÃ©es de l'athlÃ¨te, de le conseiller sur son entraÃ®nement, sa nutrition et sa rÃ©cupÃ©ration.
Tu dois rÃ©pondre en franÃ§ais, de maniÃ¨re experte, concise, motivante et directe. Pas de longues phrases inutiles.

CONTEXTE DE L'ATHLÃˆTE :
- Nom : ${athleteName}
- Prochaine CompÃ©tition : ${nextComp}
- Objectif Nutritionnel : ${kcalGoal} kcal/jour (ConsommÃ© aujourd'hui : ${consumedKcal} kcal)
- Ã‰tat de Forme du jour : ${checkinText}

INSTRUCTIONS DE RÃ‰PONSE :
1. Si l'athlÃ¨te te pose une question sur son Ã©tat, utilise ses donnÃ©es (Fatigue, Sommeil, Nutrition) pour lui rÃ©pondre.
2. Si sa fatigue ou ses douleurs sont Ã©levÃ©es (>7), recommande de l'assouplissement ou du repos.
3. Sois toujours bienveillant mais trÃ¨s professionnel (style coach d'athlÃ©tisme).`;
};
export const buildCoachSystemPromptForAthlete = async (athleteId: string, athleteName: string): Promise<string> => {
  // Fetch real data directly from Supabase
  const { supabase } = require('./supabase');
  
  // 1. Fetch recent check-ins
  const { data: checkins } = await supabase
    .from('check_ins')
    .select('date, sleep_hours, sleep_quality, energy, motivation, stress_level, pain_level, pains')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false })
    .limit(3);

  // 2. Fetch recent workouts
  const { data: workouts } = await supabase
    .from('workouts')
    .select('date_prevue, type_seance, nom_seance, statut')
    .eq('athlete_id', athleteId)
    .order('date_prevue', { ascending: false })
    .limit(5);

  let checkinText = "Aucune donnée de check-in récente.";
  if (checkins && checkins.length > 0) {
    checkinText = checkins.map((c: any) => 
      \- \: Énergie \/5, Sommeil \h (\/5), Douleur \/5\
    ).join('\n');
  }

  let workoutsText = "Aucune séance récente.";
  if (workouts && workouts.length > 0) {
    workoutsText = workouts.map((w: any) => 
      \- \: \ (\) - Statut: \\
    ).join('\n');
  }

  return \Tu es Sprinty, l'Assistant IA du Coach Sportif sur l'application SprinFlow.
Ton rôle est d'analyser les données de l'athlète et de fournir au coach des résumés clairs, des tendances, et des recommandations.

RÈGLES DE FORMATAGE :
- Fais des réponses très lisibles, visuelles et structurées (listes à puces, sauts de ligne).
- Utilise des émojis pour illustrer tes points.
- Ne fais JAMAIS de longs paragraphes denses.
- Ton ton est professionnel, analytique mais concis (style data-scientist du sport).

DONNÉES SÉCURISÉES DE L'ATHLÈTE : \

?? DERNIERS CHECK-INS (Santé / Forme) :
\

??? DERNIÈRES SÉANCES :
\

INSTRUCTIONS FINALES :
- Le coach te pose une question sur \. Réponds-lui directement en te basant UNIQUEMENT sur ces données et sur tes connaissances en physiologie du sport.
- Si les données sont vides, signale-le au coach calmement.\;
};
