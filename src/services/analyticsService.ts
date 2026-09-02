import { supabase } from './supabase';

export interface SessionStats {
  workout_id: string;
  workout_date: string;
  type_seance: string;
  total_planned_sets: number;
  total_completed_sets: number;
  adherence_percentage: number | null;
  total_volume_kg: number;
  total_distance_m: number;
  avg_intensity: number | null;
}

export interface AthletePR {
  exercise_catalog_id: string | null;
  exercise_category: string;
  actual_distance_m: number | null;
  actual_reps: number | null;
  max_weight_kg: number | null;
  best_time_ms: number | null;
  max_height_cm: number | null;
  latest_pr_date: string;
}

export interface WorkoutDegradation {
  workout_id: string;
  workout_date: string;
  exercise_category: string;
  distance_m: number;
  best_time_ms: number;
  worst_time_ms: number;
  degradation_percentage: number;
}

export const analyticsService = {
  /**
   * Récupère les statistiques globales des séances récentes
   */
  async getRecentSessionStats(athleteId: string, limit: number = 10): Promise<SessionStats[]> {
    const { data, error } = await supabase
      .from('athlete_session_stats')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('workout_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as SessionStats[];
  },

  /**
   * Récupère les records personnels (PRs)
   */
  async getPersonalRecords(athleteId: string, category?: string): Promise<AthletePR[]> {
    let query = supabase
      .from('athlete_prs')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('latest_pr_date', { ascending: false });

    if (category) {
      query = query.eq('exercise_category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AthletePR[];
  },

  /**
   * Récupère la dégradation intra-séance (Endurance / Vitesse)
   */
  async getWorkoutDegradation(athleteId: string, limit: number = 10): Promise<WorkoutDegradation[]> {
    const { data, error } = await supabase.rpc('get_workout_degradation', {
      p_athlete_id: athleteId,
      p_limit: limit,
    });

    if (error) throw error;
    return data as WorkoutDegradation[];
  },
  async getExerciseProgression(athleteId: string, category: string, distance_m?: number, reps?: number): Promise<any[]> {
    let query = supabase
      .from('athlete_daily_progression')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('exercise_category', category)
      .order('date_achieved', { ascending: true });

    if (distance_m) query = query.eq('actual_distance_m', distance_m);
    if (reps) query = query.eq('actual_reps', reps);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
