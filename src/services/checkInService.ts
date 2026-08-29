import { supabase } from './supabase';

export interface PainInfo {
  muscle_id: string;
  muscle_name: string;
  type: string; // 'Courbature', 'Contracture', 'Élongation', 'Déchirure', 'Articulaire', 'Autre'
  intensity: number; // 1 to 10
  comment?: string;
  side?: 'Gauche' | 'Droit' | 'Bilatéral' | 'Aucun';
}

export interface CheckInData {
  id?: string;
  athlete_id: string;
  date: string;
  // Pilier 1 : Sommeil
  bedtime: string;
  wakeup_time: string;
  sleep_hours: number;
  sleep_quality: number; // 1 to 5
  // Pilier 2 : Physique (Douleurs)
  pains: PainInfo[];
  // Pilier 3 : Mental
  stress_level: number; // 1 to 10
  fatigue_level: number; // 1 to 10
  motivation_level: number; // 1 to 10
  // Pilier 4 : Cycle (Femmes)
  menstruation?: boolean;
  
  // Scores
  health_score: number; // Score global (Readiness)
  sleep_score?: number;
  physical_score?: number;
  mental_score?: number;
}

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
        bedtime: data.bedtime,
        wakeup_time: data.wakeup_time,
        sleep_hours: data.sleep_hours,
        sleep_quality: data.sleep_quality,
        pains: data.pains,
        stress_level: data.stress_level,
        fatigue_level: data.fatigue_level,
        motivation_level: data.motivation_level,
        menstruation: data.menstruation || false,
        health_score: data.health_score,
        sleep_score: data.sleep_score,
        physical_score: data.physical_score,
        mental_score: data.mental_score,
      }, { onConflict: 'athlete_id, date' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting check-in:', error);
      throw error;
    }

    return savedData;
  },

  /**
   * Fetch recent check-ins for the athlete
   */
  async fetchRecentCheckIns(athleteId: string, days: number = 6): Promise<CheckInData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format YYYY-MM-DD
    const dateString = startDate.toISOString().split('T')[0];

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

    return data || [];
  },

  /**
   * Calculate all scores based on check-in data and history
   */
  calculateScores(currentCheckIn: Omit<CheckInData, 'health_score'|'sleep_score'|'physical_score'|'mental_score'>, history: CheckInData[] = []): { health: number, sleep: number, physical: number, mental: number } {
    const dailyScores = this.calculateDailyScores(currentCheckIn);

    if (history.length === 0) {
      return {
        health: Math.round(dailyScores.readiness),
        sleep: Math.round(dailyScores.sleep),
        physical: Math.round(dailyScores.physical),
        mental: Math.round(dailyScores.mental)
      };
    }

    // Weighted average with history (up to 5 previous days)
    // Weights: Today=40%, J-1=25%, J-2=15%, J-3=10%, J-4=6%, J-5=4%
    const weights = [0.40, 0.25, 0.15, 0.10, 0.06, 0.04];
    
    let totalScore = dailyScores.readiness * weights[0];
    let totalWeight = weights[0];

    const todayStr = currentCheckIn.date;
    
    // Filter out today from history if present (in case it's an update)
    const pastCheckIns = history
      .filter(c => c.date !== todayStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Max 5 previous days

    pastCheckIns.forEach((checkIn, index) => {
      const weightIndex = index + 1; // Start at J-1
      if (weightIndex < weights.length) {
        const weight = weights[weightIndex];
        const score = checkIn.health_score; 
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    const finalReadiness = totalScore / totalWeight;
    
    return {
      health: Math.round(finalReadiness),
      sleep: Math.round(dailyScores.sleep),
      physical: Math.round(dailyScores.physical),
      mental: Math.round(dailyScores.mental)
    };
  },

  /**
   * Helper: Calculate single day sub-scores
   */
  calculateDailyScores(checkIn: Omit<CheckInData, 'health_score'|'sleep_score'|'physical_score'|'mental_score'>) {
    // 1. Sommeil (Sleep Score) - Basé sur la durée (Idéal 8h) et la qualité (1-5)
    const sleepDeviation = Math.abs(checkIn.sleep_hours - 8);
    const durationScore = Math.max(0, 100 - (sleepDeviation * 12.5)); // 8h = 100, 6h = 75, 4h = 50
    const qualityScore = (checkIn.sleep_quality / 5) * 100;
    const sleepScore = (durationScore * 0.6) + (qualityScore * 0.4);

    // 2. Physique (Douleurs)
    const painCount = checkIn.pains?.length || 0;
    let physicalScore = 100;

    if (painCount > 0) {
      let maxPenalty = 0;
      let totalPenalty = 0;
      
      for (const pain of checkIn.pains) {
        // Base penalty from intensity (1-10)
        let penalty = pain.intensity * 8; // Une douleur à 10 enlève 80 points direct.
        
        // Multiplicateurs de gravité
        if (['Déchirure', 'Claquage', 'Articulaire'].includes(pain.type)) penalty *= 1.5;
        if (['Élongation', 'Tendinite'].includes(pain.type)) penalty *= 1.2;
        if (['Courbature'].includes(pain.type)) penalty *= 0.8; // Les courbatures sont "normales"
        
        totalPenalty += penalty;
        if (penalty > maxPenalty) maxPenalty = penalty;
      }
      
      // On prend la douleur la plus forte + un petit malus pour les autres douleurs
      const aggregatedPenalty = maxPenalty + (totalPenalty - maxPenalty) * 0.3;
      physicalScore = Math.max(0, 100 - aggregatedPenalty);
    }

    // 3. Mental (Stress, Fatigue, Motivation)
    // Fatigue (1=bien, 10=épuisé) -> Inversé
    const fatigueScore = Math.max(0, 100 - ((checkIn.fatigue_level - 1) * 11)); 
    // Stress (1=zen, 10=panique) -> Inversé
    const stressScore = Math.max(0, 100 - ((checkIn.stress_level - 1) * 11));
    // Motivation (1=flemme, 10=feu) -> Direct
    const motivationScore = (checkIn.motivation_level / 10) * 100;

    const mentalScore = (fatigueScore * 0.4) + (stressScore * 0.3) + (motivationScore * 0.3);

    // READINESS GLOBAL (Pondération: Physique 45%, Sommeil 35%, Mental 20%)
    const readiness = (physicalScore * 0.45) + (sleepScore * 0.35) + (mentalScore * 0.20);

    return {
      sleep: sleepScore,
      physical: physicalScore,
      mental: mentalScore,
      readiness: readiness
    };
  }
};
