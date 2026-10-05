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
  weight?: number;
  
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
        weight: data.weight,
        health_score: data.health_score,
        sleep_score: data.sleep_score,
        physical_score: data.physical_score,
        mental_score: data.mental_score,
      }, { onConflict: 'athlete_id,date' })
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
   * Modèle basé sur le Hooper Index (Saw et al. BJSM 2016, Hooper & Mackinnon 1995)
   * avec règle de sécurité (Fail-Safe) pour la protection des athlètes.
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
      sleep: Math.round(dailyScores.sleep),
      physical: Math.round(dailyScores.physical),
      mental: Math.round(dailyScores.mental)
    };
  },

  /**
   * Helper: Calculate single day sub-scores
   * 4 dimensions Hooper Index : Sommeil, Fatigue neuromusculaire, Stress psychologique, Intégrité musculaire
   */
  calculateDailyScores(checkIn: Omit<CheckInData, 'health_score'|'sleep_score'|'physical_score'|'mental_score'>) {
    // 1. Sommeil (Sleep Score 0-100)
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
    const sleepScore = (qualityScore * 0.6) + (durationScore * 0.4);

    // 2. Physique & Douleurs (Muscle & Joint Soreness 0-100)
    const painCount = checkIn.pains?.length || 0;
    let physicalScore = 100;
    let maxAcuteIntensity = 0;

    if (painCount > 0) {
      let maxPenalty = 0;
      let totalPenalty = 0;
      
      for (const pain of checkIn.pains) {
        // Courbatures d'entraînement normales (DOMS) vs Lésions/Douleurs articulaires aiguës
        const isNormalDOMS = pain.type === 'Courbature';
        const isAcuteIssue = ['Déchirure', 'Claquage', 'Articulaire', 'Élongation', 'Tendinite'].includes(pain.type);
        
        if (isAcuteIssue && pain.intensity > maxAcuteIntensity) {
          maxAcuteIntensity = pain.intensity;
        }

        let penalty = pain.intensity * 7;
        if (isNormalDOMS) {
          penalty *= 0.6; // Impact modéré car processus physiologique normal d'adaptation
        } else if (isAcuteIssue) {
          penalty *= 1.35; // Forte alerte
        }
        
        totalPenalty += penalty;
        if (penalty > maxPenalty) maxPenalty = penalty;
      }
      
      const aggregatedPenalty = maxPenalty + (totalPenalty - maxPenalty) * 0.25;
      physicalScore = Math.max(0, Math.round(100 - aggregatedPenalty));
    }

    // 3. Mental (Fatigue, Stress, Motivation ramenés sur échelle 100)
    // Énergie / Fatigue (1 = épuisé, 5 = pleine forme si échelle 5, ou 1 à 10)
    // Note: l'interface actuelle stocke fatigue_level (1=frais, 5=épuisé)
    const fatigueRatio = (checkIn.fatigue_level || 3) / 5;
    const energyScore = Math.max(0, Math.round((1 - (fatigueRatio - 0.2) / 0.8) * 100));

    // Stress (1=zen, 5=très stressé)
    const stressRatio = (checkIn.stress_level || 3) / 5;
    const stressScore = Math.max(0, Math.round((1 - (stressRatio - 0.2) / 0.8) * 100));

    // Motivation (1=flemme, 5=à bloc)
    const motivationScore = Math.min(100, Math.max(0, ((checkIn.motivation_level || 3) / 5) * 100));

    const mentalScore = Math.round((energyScore * 0.45) + (stressScore * 0.30) + (motivationScore * 0.25));

    // READINESS GLOBAL (Modèle Hooper Index pondéré : Physique 35%, Sommeil 30%, Énergie/Mental 35%)
    let readiness = (physicalScore * 0.35) + (sleepScore * 0.30) + (mentalScore * 0.35);

    // RÈGLE DE SÉCURITÉ FAIL-SAFE (Red Flag médical) :
    // Si une douleur aiguë ≥ 7/10 est signalée, la note de préparation est plafonnée à 45% (Alerte Rouge)
    // pour éviter qu'un bon sommeil ne masque une alerte de blessure.
    const isCriticalAlert = maxAcuteIntensity >= 7 || physicalScore < 35;
    if (isCriticalAlert) {
      readiness = Math.min(readiness, 45);
    }

    return {
      sleep: Math.round(sleepScore),
      physical: Math.round(physicalScore),
      mental: Math.round(mentalScore),
      readiness: Math.round(readiness),
      isCriticalAlert
    };
  }
};
