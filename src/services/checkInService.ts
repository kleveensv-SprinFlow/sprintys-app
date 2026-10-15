import { supabase } from './supabase';
import { isAcutePain, isCriticalPain } from '../features/checkin/painTaxonomy';

export interface PainInfo {
  muscle_id: string;
  muscle_name: string;
  type: string; // voir PAIN_TYPES (painTaxonomy.ts)
  intensity: number; // 1 to 10
  comment?: string;
  side?: 'Gauche' | 'Droit' | 'Bilatéral' | 'Aucun';
}

/**
 * Un pilier non renseigné (étape passée) vaut `null` : il n'est jamais remplacé par une valeur par défaut
 * et il est exclu du score.
 */
export interface CheckInData {
  id?: string;
  athlete_id: string;
  date: string;
  // Pilier 1 : Sommeil
  bedtime?: string | null;
  wakeup_time?: string | null;
  sleep_hours?: number | null;
  sleep_quality?: number | null; // 1 to 5
  // Pilier 2 : Physique (Douleurs)
  pains: PainInfo[];
  // Pilier 3 : Mental
  stress_level?: number | null; // 1 (serein) to 5 (très stressé)
  fatigue_level?: number | null; // 1 (frais) to 5 (épuisé)
  motivation_level?: number | null; // 1 (faible) to 5 (à bloc)

  // Scores
  health_score: number; // Score global (Readiness)
  sleep_score?: number | null;
  physical_score?: number | null;
  mental_score?: number | null;
}

export type CheckInDraft = Omit<CheckInData, 'health_score' | 'sleep_score' | 'physical_score' | 'mental_score'>;

const WEIGHTS = { physical: 0.35, sleep: 0.30, mental: 0.35 } as const;

export const checkInService = {
  /**
   * Save or update a check-in for a specific date
   */
  async upsertCheckIn(data: CheckInData): Promise<CheckInData> {
    const { data: savedData, error } = await supabase
      .from('check_ins')
      .upsert({
        athlete_id: data.athlete_id,
        date: data.date,
        bedtime: data.bedtime ?? null,
        wakeup_time: data.wakeup_time ?? null,
        sleep_hours: data.sleep_hours ?? null,
        sleep_quality: data.sleep_quality ?? null,
        pains: data.pains,
        stress_level: data.stress_level ?? null,
        fatigue_level: data.fatigue_level ?? null,
        motivation_level: data.motivation_level ?? null,
        health_score: data.health_score,
        sleep_score: data.sleep_score ?? null,
        physical_score: data.physical_score ?? null,
        mental_score: data.mental_score ?? null,
      }, { onConflict: 'athlete_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting check-in:', error);
      throw error;
    }

    return savedData as unknown as CheckInData;
  },

  /**
   * Fetch recent check-ins for the athlete
   */
  async fetchRecentCheckIns(athleteId: string, days: number = 6): Promise<CheckInData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Format YYYY-MM-DD in the local day (toISOString would give the UTC day, off by one around midnight)
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateString = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;

    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('date', dateString)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }

    return (data || []) as unknown as CheckInData[];
  },

  /**
   * Calculate all scores based on check-in data and history
   * Modèle basé sur le Hooper Index (Saw et al. BJSM 2016, Hooper & Mackinnon 1995)
   * avec règle de sécurité (Fail-Safe) pour la protection des athlètes.
   */
  calculateScores(
    currentCheckIn: CheckInDraft,
    history: CheckInData[] = []
  ): { health: number; sleep: number | null; physical: number; mental: number | null } {
    const dailyScores = this.calculateDailyScores(currentCheckIn);
    const round = (n: number | null) => (n === null ? null : Math.round(n));

    if (history.length === 0) {
      return {
        health: Math.round(dailyScores.readiness),
        sleep: round(dailyScores.sleep),
        physical: Math.round(dailyScores.physical),
        mental: round(dailyScores.mental),
      };
    }

    // Lissage historique pondéré (J=50%, J-1=25%, J-2=15%, J-3=10%)
    const weights = [0.50, 0.25, 0.15, 0.10];

    let totalScore = dailyScores.readiness * weights[0];
    let totalWeight = weights[0];

    const todayStr = currentCheckIn.date;

    const pastCheckIns = history
      .filter(c => c.date !== todayStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3); // 3 jours précédents

    pastCheckIns.forEach((checkIn, index) => {
      const weightIndex = index + 1;
      if (weightIndex < weights.length) {
        const weight = weights[weightIndex];
        const score = checkIn.health_score;
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    let finalReadiness = totalScore / totalWeight;

    // SÉCURITÉ FAIL-SAFE : Si la journée du jour a déclenché une alerte aiguë
    // le lissage historique ne doit JAMAIS masquer une douleur critique du jour
    if (dailyScores.isCriticalAlert) {
      finalReadiness = Math.min(finalReadiness, dailyScores.readiness);
    }

    return {
      health: Math.round(finalReadiness),
      sleep: round(dailyScores.sleep),
      physical: Math.round(dailyScores.physical),
      mental: round(dailyScores.mental),
    };
  },

  /**
   * Helper: Calculate single day sub-scores
   * 3 piliers : Sommeil, Physique (douleurs), Mental. Un pilier non renseigné (null) est exclu
   * et les poids des autres sont renormalisés : on ne fabrique jamais une réponse.
   */
  calculateDailyScores(checkIn: CheckInDraft) {
    // 1. Sommeil (0-100) : seulement si durée ET qualité sont renseignées
    let sleepScore: number | null = null;
    if (checkIn.sleep_hours != null && checkIn.sleep_quality != null) {
      // Durée optimale : entre 7h et 9h (plateau). Pénalité progressive en-deçà de 7h ou au-delà de 10h.
      let durationScore = 100;
      if (checkIn.sleep_hours < 7) {
        durationScore = Math.max(20, 100 - (7 - checkIn.sleep_hours) * 20); // 6h = 80, 5h = 60, 4h = 40
      } else if (checkIn.sleep_hours > 9.5) {
        durationScore = Math.max(70, 100 - (checkIn.sleep_hours - 9.5) * 15);
      }
      // Qualité de 1 à 5 ramenée sur 100
      const qualityScore = Math.min(100, Math.max(0, (checkIn.sleep_quality / 5) * 100));
      // Score Sommeil combiné (60% qualité ressentie réparatrice, 40% durée)
      sleepScore = (qualityScore * 0.6) + (durationScore * 0.4);
    }

    // 2. Physique & Douleurs (Muscle & Joint Soreness 0-100) : toujours renseigné (liste vide = rien à signaler)
    const pains = checkIn.pains || [];
    let physicalScore = 100;

    if (pains.length > 0) {
      let maxPenalty = 0;
      let totalPenalty = 0;

      for (const pain of pains) {
        let penalty = pain.intensity * 7;
        if (pain.type === 'Courbature') {
          penalty *= 0.6; // Courbatures d'entraînement normales (DOMS) : impact modéré
        } else if (isAcutePain(pain)) {
          penalty *= 1.35; // Lésion / douleur articulaire : forte alerte
        }

        totalPenalty += penalty;
        if (penalty > maxPenalty) maxPenalty = penalty;
      }

      const aggregatedPenalty = maxPenalty + (totalPenalty - maxPenalty) * 0.25;
      physicalScore = Math.max(0, Math.round(100 - aggregatedPenalty));
    }

    // 3. Mental : moyenne pondérée des seules composantes renseignées (fatigue 45 %, stress 30 %, motivation 25 %)
    const mentalParts: { weight: number; value: number }[] = [];
    if (checkIn.fatigue_level != null) {
      const ratio = checkIn.fatigue_level / 5; // 1 = frais, 5 = épuisé
      mentalParts.push({ weight: 0.45, value: Math.max(0, Math.round((1 - (ratio - 0.2) / 0.8) * 100)) });
    }
    if (checkIn.stress_level != null) {
      const ratio = checkIn.stress_level / 5; // 1 = zen, 5 = très stressé
      mentalParts.push({ weight: 0.30, value: Math.max(0, Math.round((1 - (ratio - 0.2) / 0.8) * 100)) });
    }
    if (checkIn.motivation_level != null) {
      mentalParts.push({ weight: 0.25, value: Math.min(100, Math.max(0, (checkIn.motivation_level / 5) * 100)) });
    }
    const mentalWeight = mentalParts.reduce((s, p) => s + p.weight, 0);
    const mentalScore = mentalWeight > 0
      ? Math.round(mentalParts.reduce((s, p) => s + p.value * p.weight, 0) / mentalWeight)
      : null;

    // READINESS GLOBAL : Physique 35 %, Sommeil 30 %, Mental 35 % — poids renormalisés sur les piliers renseignés
    const pillars: { weight: number; value: number }[] = [{ weight: WEIGHTS.physical, value: physicalScore }];
    if (sleepScore !== null) pillars.push({ weight: WEIGHTS.sleep, value: sleepScore });
    if (mentalScore !== null) pillars.push({ weight: WEIGHTS.mental, value: mentalScore });
    const totalWeight = pillars.reduce((s, p) => s + p.weight, 0);
    let readiness = pillars.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;

    // RÈGLE DE SÉCURITÉ FAIL-SAFE (Red Flag médical) :
    // même seuil que l'alerte coach (get_team_alerts) : douleur >= 7/10, ou >= 5/10 pour un type aigu.
    // La note de préparation est alors plafonnée à 45 % pour qu'un bon sommeil ne masque pas une blessure.
    const isCriticalAlert = pains.some(isCriticalPain) || physicalScore < 35;
    if (isCriticalAlert) {
      readiness = Math.min(readiness, 45);
    }

    return {
      sleep: sleepScore === null ? null : Math.round(sleepScore),
      physical: Math.round(physicalScore),
      mental: mentalScore,
      readiness: Math.round(readiness),
      isCriticalAlert
    };
  }
};
