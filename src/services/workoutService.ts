import { supabase } from './supabase';
import { BuilderExercise } from '../store/workoutBuilderStore';

export interface WorkoutAssignment {
  coach_id: string;
  athlete_id: string;
  type_seance: string;
  exercises: BuilderExercise[];
  date_prevue?: string;
}

export const workoutService = {
  assignWorkoutToAthlete: async (assignment: WorkoutAssignment) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([
        {
          coach_id: assignment.coach_id,
          athlete_id: assignment.athlete_id,
          type_seance: assignment.type_seance,
          exercises: assignment.exercises,
          date_prevue: assignment.date_prevue || new Date().toISOString(),
          status: 'pending',
        }
      ])
      .select();

    if (error) throw error;
    return data;
  },

  fetchPendingWorkout: async (athleteId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  completeWorkout: async (workoutId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .update({ status: 'completed' })
      .eq('id', workoutId)
      .select();

    if (error) throw error;
    return data;
  },

  fetchRecentWorkoutsContext: async (athleteId: string, days: number = 7) => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const { data, error } = await supabase
      .from('workouts')
      .select('type_seance, status, created_at')
      .eq('athlete_id', athleteId)
      .gte('created_at', dateLimit.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return "Aucun entraînement récent.";

    return data.map(w =>
      `- ${new Date(w.created_at).toLocaleDateString()}: ${w.type_seance} (${w.status})`
    ).join('\n');
  },

  // Note: Assuming a 'competitions' table exists or will exist.
  // Using a placeholder return if table doesn't exist yet, but structured for future.
  fetchUpcomingCompetitionsContext: async (athleteId: string, days: number = 7) => {
    // Placeholder implementation since we don't have a competitions table yet in the schema we saw.
    // Replace with real Supabase call when table is ready.
    return "Aucune compétition prévue dans les 7 prochains jours.";
  }
};
