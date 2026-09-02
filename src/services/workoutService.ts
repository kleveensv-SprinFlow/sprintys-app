import { supabase } from './supabase';
import { Database } from '../types/supabase';
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

  fetchUpcomingWorkouts: async (athleteId: string, daysAhead: number = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Inclure hier pour le contexte
    startDate.setHours(0,0,0,0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23,59,59,999);

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('date_prevue', startDate.toISOString())
      .lte('date_prevue', endDate.toISOString())
      .order('date_prevue', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  
  
  assignWorkoutToGroup: async (workoutData: any, targetType: 'team' | 'subgroup', targetId: string) => {
    const rpcParams: any = {
      p_workout_data: workoutData
    };
    if (targetType === 'team') {
      rpcParams.p_team_id = targetId;
    } else if (targetType === 'subgroup') {
      rpcParams.p_subgroup_id = targetId;
    }

    const { data, error } = await supabase.rpc('assign_workout_to_group', rpcParams);
    if (error) throw error;
    return data; // Returns the generated UUID
  },

  createPlannedWorkout: async (workoutData: any) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([workoutData])
      .select();
    
    if (error) throw error;
    return data;
  },

  saveWorkoutTemplate: async (templateData: any) => {
    const { data, error } = await supabase
      .from('workout_templates')
      .insert([templateData])
      .select();

    if (error) throw error;
    return data;
  },

  
  fetchWorkoutsForDate: async (userId: string, date: Date, role: 'athlete' | 'coach', teamId?: string) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase.from('workouts').select('*');

    if (role === 'athlete') {
      // With the new cloning architecture, every workout assigned to a team or subgroup 
      // is individually copied for the athlete with their athlete_id.
      // Therefore, the RLS policy naturally protects it and we only need this simple equality check.
      query = query.eq('athlete_id', userId);
    } else if (role === 'coach') {
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.eq('coach_id', userId);
      }
    }

    query = query
      .gte('date_prevue', startOfDay.toISOString())
      .lte('date_prevue', endOfDay.toISOString())
      .order('date_prevue', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  submitWorkoutResults: async (workoutId: string, efforts: any[]) => {
    const { error } = await supabase.rpc('submit_workout_results', { p_workout_id: workoutId, p_efforts: efforts });
    if (error) throw error;
  },

  completeWorkout: async (workoutId: string) => {
    const { error } = await supabase
      .rpc('complete_workout', { p_workout_id: workoutId });

    if (error) throw error;
    // RPC returns void, but we can return true or fetch the updated row if needed.
    return [{ id: workoutId, status: 'completed' }]; 
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
