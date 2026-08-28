import { supabase } from './supabase';

export interface PainInfo {
  muscle_id: string;
  muscle_name: string;
  type: string;
  intensity: number;
  comment?: string;
  side?: 'Gauche' | 'Droit' | 'Les deux';
}

export interface CheckInData {
  id?: string;
  athlete_id: string;
  date: string;
  bedtime: string;
  wakeup_time: string;
  sleep_hours: number;
  pains: PainInfo[];
  health_score: number;
  menstruation?: boolean;
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
        pains: data.pains,
        health_score: data.health_score,
        menstruation: data.menstruation || false,
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
   * Calculate health score based on check-in data and history
   */
  calculateHealthScore(currentCheckIn: Omit<CheckInData, 'health_score'>, history: CheckInData[] = []): number {
    // 1. Calculate base score for current check-in
    const dailyScore = this.calculateDailyScore(currentCheckIn);

    if (history.length === 0) {
      return Math.round(dailyScore);
    }

    // 2. Weighted average with history (up to 5 previous days)
    // Weights: Today=35%, J-1=25%, J-2=17%, J-3=11%, J-4=7%, J-5=5%
    const weights = [0.35, 0.25, 0.17, 0.11, 0.07, 0.05];
    
    let totalScore = dailyScore * weights[0];
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
        // Use the saved health_score if available, otherwise calculate it
        const score = checkIn.health_score || this.calculateDailyScore(checkIn);
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    // Normalize score if we don't have full history
    const finalScore = totalScore / totalWeight;
    
    return Math.round(finalScore);
  },

  /**
   * Helper: Calculate single day score
   */
  calculateDailyScore(checkIn: Omit<CheckInData, 'health_score'>): number {
    // A. Sleep Score (40% weight) - Ideal is 8 hours
    // Subtract 12.5 points per hour of deviation from 8
    const sleepDeviation = Math.abs(checkIn.sleep_hours - 8);
    let sleepScore = Math.max(0, 100 - (sleepDeviation * 12.5));

    // B. Pain Count Score (30% weight) - 0 is 100, 5+ is 0
    const painCount = checkIn.pains?.length || 0;
    let painCountScore = Math.max(0, 100 - (painCount * 20));

    // C. Pain Severity Score (30% weight)
    let painSeverityScore = 100;
    if (painCount > 0) {
      let totalPenalty = 0;
      for (const pain of checkIn.pains) {
        // Base penalty from intensity (1-10)
        let penalty = pain.intensity * 5; 
        
        // Extra multiplier for severe types (backward compatible + new types)
        if (['déchirure', 'claquage', 'Douleur importante'].includes(pain.type)) penalty *= 2;
        if (['tendinite', 'élongation', 'Douleur'].includes(pain.type)) penalty *= 1.5;
        
        totalPenalty += penalty;
      }
      const avgPenalty = totalPenalty / painCount;
      painSeverityScore = Math.max(0, 100 - avgPenalty);
    }

    // Combine (40%, 30%, 30%)
    return (sleepScore * 0.4) + (painCountScore * 0.3) + (painSeverityScore * 0.3);
  }
};
