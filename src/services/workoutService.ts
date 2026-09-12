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

  fetchWorkoutTemplates: async (coachId: string, typeSeance?: string) => {
    try {
      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (typeSeance) {
        query = query.eq('type_seance', typeSeance);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching workout templates:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching templates:', err);
      return [];
    }
  },

  deleteWorkoutTemplate: async (templateId: string) => {
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  },

  fetchRecentWorkoutsForCoach: async (coachId: string, limit: number = 5) => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching recent workouts for coach:', error);
        return [];
      }

      // Deduplicate multi-athlete clones (by group_assignment_id or date + description)
      const seen = new Set<string>();
      const result: any[] = [];
      for (const w of (data || [])) {
        const type = (w.type_seance || '').toLowerCase();
        const isRun = type.includes('piste') || type.includes('côte') || type.includes('cote') || type.includes('course') || type.includes('sprint');
        if (!isRun) continue;

        const key = w.group_assignment_id || `${w.date_prevue}_${w.description}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(w);
          if (result.length >= limit) break;
        }
      }
      return result;
    } catch (err) {
      console.error('Unexpected error fetching recent workouts:', err);
      return [];
    }
  },

  
    fetchWorkoutsForMonth: async (userId: string, year: number, month: number, role: 'athlete' | 'coach') => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    let query = supabase
      .from('workouts')
      .select('id, date_prevue, type_seance, status, athlete_id, group_assignment_id')
      .gte('date_prevue', startDate.toISOString())
      .lte('date_prevue', endDate.toISOString());

    if (role === 'coach') {
      query = query.eq('coach_id', userId);
    } else {
      query = query.eq('athlete_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching month workouts:', error);
      return [];
    }

    if (role === 'coach') {
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const w of (data || [])) {
        const key = w.group_assignment_id || w.id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(w);
        }
      }
      return deduped;
    }

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
    return [{ id: workoutId, status: 'completed' }]; 
  },

  deleteWorkout: async (workoutId: string, groupAssignmentId?: string | null) => {
    if (groupAssignmentId) {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('group_assignment_id', groupAssignmentId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);
      if (error) throw error;
    }
    return true;
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

  fetchUpcomingCompetitionsContext: async (athleteId: string, days: number = 7) => {
    return "Aucune compétition prévue dans les 7 prochains jours.";
  }
};
