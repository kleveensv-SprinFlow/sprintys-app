import { useAuthStore } from '../store/authStore';
import { useCheckInStore } from '../store/checkInStore';
import { useNutritionStore } from '../store/nutrition/nutritionStore';
import { useCoachStore } from '../store/coach/coachStore';
import { supabase } from './supabase';

export const buildSystemPrompt = (): string => {
  const { user } = useAuthStore.getState();
  const { todayHealthScore, history } = useCheckInStore.getState();
  const { mealLogs } = useNutritionStore.getState();
  const { myGroups } = useCoachStore.getState() as any; 

  const athleteName = user?.name || "Athlète";
  const nextComp = user?.nextCompetitionDate ? new Date(user.nextCompetitionDate).toLocaleDateString('fr-FR') : "Aucune";
  const kcalGoal = user?.manualKcalGoal || 2000;
  
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckin = history.find(h => h.date === todayStr);
  const checkinText = todayCheckin 
    ? `Fatigue: ${todayCheckin.fatigue_level}/5, Douleurs: ${todayCheckin.pains ? todayCheckin.pains.length : 0} zones, Stress: ${todayCheckin.stress_level}/5, Sommeil: ${todayCheckin.sleep_quality}/5.`
    : `L'athlète n'a pas encore fait son check-in santé aujourd'hui.`;

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

export const buildCoachSystemPromptForAthlete = async (athleteId: string, athleteName: string): Promise<string> => {
  
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
      `- ${c.date}: Énergie ${c.energy}/5, Sommeil ${c.sleep_hours}h (${c.sleep_quality}/5), Douleur ${c.pain_level}/5`
    ).join('\n');
  }

  let workoutsText = "Aucune séance récente.";
  if (workouts && workouts.length > 0) {
    workoutsText = workouts.map((w: any) => 
      `- ${w.date_prevue}: ${w.nom_seance || w.type_seance} - Statut: ${w.statut}`
    ).join('\n');
  }

  return `Tu es Sprinty, l'Assistant IA du Coach Sportif sur l'application SprinFlow.
Ton rôle est d'analyser les données de l'athlète et de fournir au coach des résumés clairs, des tendances, et des recommandations.

RÈGLES DE FORMATAGE :
- Fais des réponses très lisibles, visuelles et structurées (listes à puces, sauts de ligne).
- Utilise des émojis pour illustrer tes points.
- Ne fais JAMAIS de longs paragraphes denses.
- Ton ton est professionnel, analytique mais concis (style data-scientist du sport).

DONNÉES SÉCURISÉES DE L'ATHLÈTE : ${athleteName}

🩺 DERNIERS CHECK-INS (Santé / Forme) :
${checkinText}

🏋️ DERNIÈRES SÉANCES :
${workoutsText}

INSTRUCTIONS FINALES :
- Le coach te pose une question sur l'athlète. Réponds-lui directement en te basant UNIQUEMENT sur ces données et sur tes connaissances en physiologie du sport.
- Si les données sont vides, signale-le au coach calmement.`;
};
