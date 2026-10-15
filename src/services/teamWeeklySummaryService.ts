import { supabase } from './supabase';
import { alertsService } from './alertsService';
import { fetchOpenAIResponse } from './aiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TeamWeeklyStats {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weekLabel: string;
  totalAthletes: number;
  plannedWorkouts: number;
  completedWorkouts: number;
  workoutCompletionRate: number; // 0-100
  expectedCheckIns: number;
  recordedCheckIns: number;
  checkInRate: number; // 0-100
  avgHealthScore: number | null; // 0-100
  avgSleepHours: number | null;
  avgSleepQuality: number | null; // 1-5
  activeAlertsCount: number;
  flaggedAthletesCount: number;
  painZones: string[];
}

export interface TeamWeeklySummaryResult {
  stats: TeamWeeklyStats;
  aiLines: string[];
  isFallback: boolean;
  generatedAt: string;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Calcule l'intervalle lundi-dimanche d'une date de référence. */
export function getWeekRange(refDate = new Date()): { start: Date; end: Date; startStr: string; endStr: string; weekLabel: string } {
  const d = new Date(refDate);
  const day = d.getDay();
  // 0 = dimanche, 1 = lundi ... 6 = samedi
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const weekLabel = `Semaine du ${monday.getDate()} au ${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`;

  return {
    start: monday,
    end: sunday,
    startStr: fmt(monday),
    endStr: fmt(sunday),
    weekLabel,
  };
}

/**
 * Génération déterministe de 5 lignes strictes à partir des chiffres calculés.
 * Utilisé comme fallback hors-ligne ou si l'IA est indisponible.
 */
export function buildFallbackSummary(stats: TeamWeeklyStats): string[] {
  const lines: string[] = [];

  // 1. Assiduité & Séances
  if (stats.plannedWorkouts > 0) {
    lines.push(`Entraînement : ${stats.completedWorkouts} séance${stats.completedWorkouts > 1 ? 's' : ''} réalisée${stats.completedWorkouts > 1 ? 's' : ''} sur ${stats.plannedWorkouts} planifiée${stats.plannedWorkouts > 1 ? 's' : ''} (${stats.workoutCompletionRate}% d'assiduité).`);
  } else {
    lines.push(`Entraînement : aucune séance programmée cette semaine pour les ${stats.totalAthletes} athlètes.`);
  }

  // 2. Forme de l'équipe
  if (stats.avgHealthScore !== null) {
    const formeLabel = stats.avgHealthScore >= 70 ? 'bonne forme' : stats.avgHealthScore >= 40 ? 'fatigue modérée' : 'récupération requise';
    lines.push(`Forme du groupe : moyenne de ${stats.avgHealthScore}% (${formeLabel}).`);
  } else {
    lines.push(`Forme du groupe : aucun check-in saisi pour le moment cette semaine.`);
  }

  // 3. Suivi et régularité des check-ins
  lines.push(`Suivi quotidien : ${stats.recordedCheckIns} check-in${stats.recordedCheckIns > 1 ? 's' : ''} saisis (${stats.checkInRate}% de complétion).`);

  // 4. Récupération et sommeil
  if (stats.avgSleepHours !== null) {
    const qualText = stats.avgSleepQuality !== null ? ` (qualité ${stats.avgSleepQuality}/5)` : '';
    lines.push(`Récupération : moyenne de ${stats.avgSleepHours}h de sommeil par nuit${qualText}.`);
  } else {
    lines.push(`Récupération : données de sommeil encore incomplètes sur cette période.`);
  }

  // 5. Vigilance et alertes
  if (stats.flaggedAthletesCount > 0) {
    const zonesStr = stats.painZones.length > 0 ? ` (zones : ${stats.painZones.slice(0, 3).join(', ')})` : '';
    lines.push(`Vigilance : ${stats.flaggedAthletesCount} athlète${stats.flaggedAthletesCount > 1 ? 's' : ''} à surveiller${zonesStr}.`);
  } else {
    lines.push(`Vigilance : aucun signal de blessure ni alerte majeure détectée.`);
  }

  return lines;
}

export const teamWeeklySummaryService = {
  /**
   * Calcule les statistiques déterministes de la semaine pour l'équipe donnée.
   * Aucun chiffre n'est inventé : tout provient des requêtes Supabase directes.
   */
  async calculateTeamWeeklyStats(teamId: string, refDate = new Date()): Promise<TeamWeeklyStats> {
    const range = getWeekRange(refDate);

    // 1. Récupération des athlètes approuvés de l'équipe
    const { data: members, error: memErr } = await supabase
      .from('team_members')
      .select('user_id, status')
      .eq('team_id', teamId)
      .eq('status', 'approved');

    if (memErr) throw memErr;
    const athleteIds = (members || []).map((m: any) => m.user_id);
    const totalAthletes = athleteIds.length;

    if (totalAthletes === 0) {
      return {
        startDate: range.startStr,
        endDate: range.endStr,
        weekLabel: range.weekLabel,
        totalAthletes: 0,
        plannedWorkouts: 0,
        completedWorkouts: 0,
        workoutCompletionRate: 0,
        expectedCheckIns: 0,
        recordedCheckIns: 0,
        checkInRate: 0,
        avgHealthScore: null,
        avgSleepHours: null,
        avgSleepQuality: null,
        activeAlertsCount: 0,
        flaggedAthletesCount: 0,
        painZones: [],
      };
    }

    // 2. Séances de la semaine pour ces athlètes
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, user_id, date_prevue, completed, type_seance')
      .in('user_id', athleteIds)
      .gte('date_prevue', range.startStr)
      .lte('date_prevue', range.endStr);

    const workoutList = (workouts || []) as any[];
    const plannedWorkouts = workoutList.length;
    const completedWorkouts = workoutList.filter((w) => w.completed).length;
    const workoutCompletionRate = plannedWorkouts > 0 ? Math.round((completedWorkouts / plannedWorkouts) * 100) : 0;

    // 3. Check-ins de la semaine pour ces athlètes
    const { data: checkins } = await supabase
      .from('check_ins')
      .select('id, athlete_id, date, health_score, sleep_hours, sleep_quality, pain')
      .in('athlete_id', athleteIds)
      .gte('date', range.startStr)
      .lte('date', range.endStr);

    const checkinList = (checkins || []) as any[];
    const recordedCheckIns = checkinList.length;

    // Jours écoulés dans la semaine courante (1 à 7)
    const now = new Date();
    const daysElapsed = Math.min(
      7,
      Math.max(1, Math.floor((now.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    );
    const expectedCheckIns = totalAthletes * daysElapsed;
    const checkInRate = expectedCheckIns > 0 ? Math.min(100, Math.round((recordedCheckIns / expectedCheckIns) * 100)) : 0;

    // Forme moyenne
    const healthScores = checkinList.map((c) => c.health_score).filter((s): s is number => s != null);
    const avgHealthScore = healthScores.length
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : null;

    // Sommeil moyen
    const sleepList = checkinList
      .map((c) => (c.sleep_hours != null ? Number(c.sleep_hours) : null))
      .filter((h): h is number => h != null);
    const avgSleepHours = sleepList.length
      ? Math.round((sleepList.reduce((a, b) => a + b, 0) / sleepList.length) * 10) / 10
      : null;

    const qualityList = checkinList
      .map((c) => (c.sleep_quality != null ? Number(c.sleep_quality) : null))
      .filter((q): q is number => q != null);
    const avgSleepQuality = qualityList.length
      ? Math.round((qualityList.reduce((a, b) => a + b, 0) / qualityList.length) * 10) / 10
      : null;

    // Extraction des zones de douleur
    const zoneSet = new Set<string>();
    checkinList.forEach((c) => {
      if (c.pain) {
        if (typeof c.pain === 'object' && Array.isArray(c.pain.zones)) {
          c.pain.zones.forEach((z: any) => z?.label && zoneSet.add(z.label));
        } else if (typeof c.pain === 'string' && c.pain.trim()) {
          zoneSet.add(c.pain.trim());
        }
      }
    });
    const painZones = Array.from(zoneSet);

    // 4. Alertes de l'équipe
    let activeAlertsCount = 0;
    let flaggedAthletesCount = 0;
    try {
      const alerts = await alertsService.fetchTeamAlerts(teamId);
      flaggedAthletesCount = alerts.length;
      activeAlertsCount = alerts.reduce((acc, a) => acc + (a.reasons?.length || 0), 0);
    } catch {
      // Si la RPC n'est pas encore disponible
    }

    return {
      startDate: range.startStr,
      endDate: range.endStr,
      weekLabel: range.weekLabel,
      totalAthletes,
      plannedWorkouts,
      completedWorkouts,
      workoutCompletionRate,
      expectedCheckIns,
      recordedCheckIns,
      checkInRate,
      avgHealthScore,
      avgSleepHours,
      avgSleepQuality,
      activeAlertsCount,
      flaggedAthletesCount,
      painZones,
    };
  },

  /**
   * Rédige 5 lignes de synthèse pour le coach via l'IA sans inventer le moindre chiffre,
   * ou fournit le fallback calculé instantané.
   */
  async getOrGenerateWeeklySummary(
    teamId: string,
    teamName: string,
    forceRefresh = false
  ): Promise<TeamWeeklySummaryResult> {
    const range = getWeekRange();
    const cacheKey = `@sprintys/coach_weekly_summary_${teamId}_${range.startStr}`;

    // 1. Vérification du cache local si pas forcé
    if (!forceRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.aiLines) && parsed.aiLines.length === 5) {
            return parsed;
          }
        }
      } catch {
        // Cache corrompu ou indisponible
      }
    }

    // 2. Calcul déterministe des chiffres réels
    const stats = await this.calculateTeamWeeklyStats(teamId);

    // 3. Appel de l'IA pour rédiger la synthèse
    let aiLines: string[] = [];
    let isFallback = false;

    try {
      const systemPrompt = `Tu es Sprinty, coach IA expert en préparation physique et athlétisme.
Tu rédiges pour l'entraîneur la synthèse hebdomadaire de son équipe "${teamName}".

RÈGLES ABSOLUES ET STRICTES :
1. Tu dois rédiger EXACTEMENT 5 lignes courtes et percutantes (chacune précédée d'un tiret ou d'un numéro 1 à 5).
2. INTERDICTION TOTALE d'inventer le moindre chiffre, pourcentage ou statistique.
3. Utilise UNIQUEMENT les chiffres réels calculés fournis dans le message.
4. Adopte un ton direct, professionnel et orienté performance/prévention pour le coach.
5. Reste synthétique, sans formule d'introduction ni de conclusion superflue.`;

      const userPrompt = `Voici les chiffres réels calculés de la semaine pour l'équipe "${teamName}" :
- Athlètes : ${stats.totalAthletes} au total
- Séances : ${stats.completedWorkouts} réalisées sur ${stats.plannedWorkouts} planifiées (${stats.workoutCompletionRate}% d'assiduité)
- Check-ins : ${stats.recordedCheckIns} saisis sur ${stats.expectedCheckIns} attendus (${stats.checkInRate}% de complétion)
- Forme moyenne : ${stats.avgHealthScore !== null ? `${stats.avgHealthScore}%` : 'non renseigné'}
- Sommeil moyen : ${stats.avgSleepHours !== null ? `${stats.avgSleepHours}h/nuit` : 'non renseigné'}${stats.avgSleepQuality !== null ? ` (qualité ${stats.avgSleepQuality}/5)` : ''}
- Alertes : ${stats.flaggedAthletesCount} athlète(s) sous surveillance (${stats.activeAlertsCount} alertes)
- Zones de tension : ${stats.painZones.length ? stats.painZones.join(', ') : 'aucune'}

Rédige la synthèse en 5 lignes précises.`;

      const response = await fetchOpenAIResponse(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        'gpt-4o-mini',
        'coach_chat'
      );

      // Découpage et nettoyage en 5 lignes
      const rawLines = response
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 0);

      if (rawLines.length >= 5) {
        aiLines = rawLines.slice(0, 5);
      } else if (rawLines.length > 0) {
        // Compléter avec le fallback pour garantir exactement 5 lignes
        const fb = buildFallbackSummary(stats);
        aiLines = [...rawLines, ...fb.slice(rawLines.length, 5)];
      } else {
        aiLines = buildFallbackSummary(stats);
        isFallback = true;
      }
    } catch (err) {
      // Fallback algorithmique instantané sans appel réseau
      aiLines = buildFallbackSummary(stats);
      isFallback = true;
    }

    const result: TeamWeeklySummaryResult = {
      stats,
      aiLines,
      isFallback,
      generatedAt: new Date().toISOString(),
    };

    // Sauvegarde en cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Ignorer erreur de cache
    }

    return result;
  },
};
