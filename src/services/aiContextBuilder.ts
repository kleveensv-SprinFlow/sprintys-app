import { useAuthStore } from '../store/authStore';
import { useCheckInStore } from '../store/checkInStore';
import { useNutritionStore } from '../store/nutrition/nutritionStore';
import { buildAthleteAnalysisPrompt, AnalysisDomain } from './athleteAnalysisContext';
import { useWorkoutStore } from '../store/workoutStore';
import { supabase } from './supabase';

const workoutProposalInstructions = `
[PLANIFICATION DE SÉANCE]
Si le coach te demande de créer ou de planifier une séance, tu DOIS générer ta proposition sous la forme d'un bloc JSON exactement formaté comme suit, et RIEN D'AUTRE à l'intérieur de ce bloc (tu peux écrire du texte avant ou après). 
L'application interceptera ce bloc pour afficher une carte de validation au coach.
Ne propose la séance QUE si la demande du coach est suffisamment claire (sinon demande des précisions).

Utilise STRICTEMENT ce format Markdown pour ta proposition JSON :
\`\`\`workout_proposal
{
  "target": "athlete_id_here", 
  "target_name": "Nom de l'athlète ou du groupe/sous-groupe",
  "target_type": "athlete", 
  "date_prevue": "YYYY-MM-DD",
  "type_seance": "Piste",
  "nom_seance": "Sprint Court 60m",
  "exercises": [
    { "name": "Échauffement", "sets": 1, "reps": "15 min", "rest": "0", "notes": "Gammes athlétiques" },
    { "name": "Sprint 60m", "sets": 4, "reps": "1", "rest": "5 min", "notes": "Départ starting blocks" }
  ]
}
\`\`\`
Note : "target_type" doit valoir "athlete", "subgroup", ou "group".
`;

const interviewInstructions = `
[INTERVIEW ACTIVE DU COACH]
Tu n'as pas encore la "philosophie d'entraînement" de ce coach en mémoire. 
Avant de l'assister sur la création de séances, tu DOIS mener une interview active pour comprendre sa méthode.
Pose-lui une question à la fois sur sa philosophie globale de préparation physique (ex: Méthodes privilégiées, utilisation du RPE ou pourcentages, gestion du volume vs intensité, type d'exercices).
Pose environ 4 à 5 questions au total (UNE par UNE).
Dès que tu estimes avoir bien compris son profil, génère un résumé de sa philosophie dans le bloc JSON suivant :
\`\`\`save_philosophy
{
  "philosophy": "Résumé détaillé de la philosophie du coach..."
}
\`\`\`
L'application interceptera ce bloc et l'enregistrera.
`;

export const buildSystemPrompt = (): string => {
  const { user } = useAuthStore.getState();
  const { history } = useCheckInStore.getState();
  const { mealLogs } = useNutritionStore.getState();
  const { upcomingWorkouts } = useWorkoutStore.getState();

  const athleteName = user?.name || "Athlète";
  const nextComp = user?.nextCompetitionDate ? new Date(user.nextCompetitionDate).toLocaleDateString('fr-FR') : "Aucune";
  const kcalGoal = user?.manualKcalGoal || 2000;
  
  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayOfWeek = now.toLocaleDateString('fr-FR', { weekday: 'long' });
  
  const recentCheckins = history.slice(0, 7);
  let checkinHistoryText = "Aucun historique de check-in récent.";
  if (recentCheckins.length > 0) {
    checkinHistoryText = recentCheckins.map(c => 
      `- ${c.date}: Fatigue ${c.fatigue_level}/5, Sommeil ${c.sleep_quality}/5, Stress ${c.stress_level}/5, Douleurs: ${c.pains ? c.pains.length : 0}`
    ).join('\n');
  }

  const windowWorkouts = upcomingWorkouts.filter(w => {
    if (!w.date_prevue) return false;
    const wDate = new Date(w.date_prevue);
    const diffTime = wDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= -7 && diffDays <= 7;
  });
  
  let workoutsText = "Aucune séance prévue ou passée dans les 14 derniers jours.";
  if (windowWorkouts.length > 0) {
    workoutsText = windowWorkouts.map(w => {
      const wDate = new Date(w.date_prevue).toLocaleDateString('fr-FR');
      return `- ${wDate}: ${w.nom_seance || w.type_seance} (${w.statut})`;
    }).join('\n');
  }

  return `Tu es Sprinty, un coach IA expert en athlétisme intégré à l'application SprinFlow.
Ton rôle est d'analyser les données de l'athlète, de le conseiller sur son entraînement, sa nutrition et sa récupération.
Tu dois répondre en français, de manière experte, concise, motivante et directe. Pas de longues phrases inutiles.

CONTEXTE TEMPOREL :
- Date actuelle : ${dayOfWeek} ${todayStr}
- Heure actuelle : ${timeStr}

CONTEXTE DE L'ATHLÈTE :
- Nom : ${athleteName}
- Prochaine Compétition : ${nextComp}
- Objectif Nutritionnel : ${kcalGoal} kcal/jour (Consommé aujourd'hui : ${consumedKcal} kcal)

📊 HISTORIQUE FORME / SANTÉ (7 derniers jours) :
${checkinHistoryText}

🏋️ SÉANCES (Semaine passée & à venir) : 
${workoutsText}

INSTRUCTIONS DE RÉPONSE :
1. Prends en compte l'heure actuelle pour contextualiser tes réponses.
2. Si l'athlète te pose une question sur son état, utilise son historique de check-in et ses séances.
3. Si sa fatigue ou ses douleurs sont élevées, recommande du repos.
4. Sois toujours bienveillant mais très professionnel.`;
};

export const buildGeneralCoachSystemPrompt = async (): Promise<string> => {
  const { user } = useAuthStore.getState();

  // Charge les athlètes de TOUTES les équipes du coach (pas seulement l'équipe active)
  let athletesText = 'Aucun athlète dans vos équipes pour le moment.';
  if (user?.id) {
    const { data: teams } = await supabase.from('teams').select('id, name').eq('coach_id', user.id);
    const teamIds = (teams || []).map(t => t.id);
    if (teamIds.length > 0) {
      const [{ data: members }, { data: subgroups }] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id, team_id, subgroup_id, profiles:user_id (first_name, last_name, full_name)')
          .in('team_id', teamIds)
          .eq('status', 'approved'),
        supabase.from('subgroups').select('id, name').in('team_id', teamIds),
      ]);
      const teamName = new Map((teams || []).map(t => [t.id, t.name]));
      const sgName = new Map((subgroups || []).map(s => [s.id, s.name]));
      if (members && members.length > 0) {
        athletesText = members.map((m: any) => {
          const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const name = prof?.full_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Athlète';
          return `- ${name} (ID: ${m.user_id}) · Équipe : ${teamName.get(m.team_id) || '-'} · Sous-groupe : ${m.subgroup_id ? sgName.get(m.subgroup_id) || '-' : 'Aucun'}`;
        }).join('\n');
      }
    }
  }

  const coachPhilosophy = user?.objective;
  const philosophyContext = coachPhilosophy 
    ? `\nPHILOSOPHIE DU COACH :\n${coachPhilosophy}\n\n-> Adapte toutes tes propositions de séances en fonction de cette philosophie !`
    : `\n${interviewInstructions}`;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return `Tu es Sprinty, l'Assistant IA du Coach Sportif sur l'application SprinFlow.
Ton rôle est d'aider le coach à analyser son équipe et à créer des séances d'entraînement.

CONTEXTE TEMPOREL : nous sommes le ${now.toLocaleDateString('fr-FR', { weekday: 'long' })} ${today}.

RÈGLES DE FORMATAGE :
- Réponses lisibles, listes à puces, sauts de ligne. Utilise des émojis.
- Ton professionnel, analytique mais concis (style data-scientist du sport).

VOS ATHLÈTES :
${athletesText}

${philosophyContext}

${workoutProposalInstructions}

INSTRUCTIONS FINALES :
- Si le coach te demande de planifier une séance pour un sous-groupe (ex: "les sprinteurs"), vérifie dans la liste des athlètes quels sont les sous-groupes existants et nomme la cible en conséquence.
- Dans ce mode général, tu n'as PAS les données détaillées des athlètes (séances, nutrition, forme, poids). Si le coach veut analyser un athlète précis, invite-le à utiliser le bouton « Analyser un athlète » de l'accueil Sprinty.
- Assiste le coach du mieux possible, mais rappelle-lui toujours que c'est lui le patron !`;
};

export const buildCoachSystemPromptForAthlete = async (
  athleteId: string,
  _athleteName?: string,
  domains?: AnalysisDomain[]
): Promise<string> => {
  const { user } = useAuthStore.getState();
  return buildAthleteAnalysisPrompt(athleteId, {
    domains,
    coachPhilosophy: user?.objective,
    extraInstructions: `\n${workoutProposalInstructions}`,
  });
};
