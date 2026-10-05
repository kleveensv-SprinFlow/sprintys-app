import { supabase } from './supabase';
import { Database } from '../types/supabase';
import { BuilderExercise } from '../store/workoutBuilderStore';

export interface WorkoutAssignment {
  nom_seance?: string;
  coach_id: string;
  athlete_id: string;
  type_seance: string;
  exercises: BuilderExercise[];
  date_prevue?: string;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

  fetchUpcomingWorkouts: async (athleteId: string, daysBehind: number = 7, daysAhead: number = 14) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBehind);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

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

  updateWorkout: async (workoutId: string, workoutData: any) => {
    const { data, error } = await supabase
      .from('workouts')
      .update(workoutData)
      .eq('id', workoutId)
      .select();
    
    if (error) throw error;
    return data;
  },

  fetchWorkoutsByGroupAssignment: async (groupAssignmentId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('group_assignment_id', groupAssignmentId);
    
    if (error) throw error;
    return data || [];
  },

  smartUpdateWorkouts: async (oldGroupAssignmentId: string | undefined | null, newPayloads: any[]) => {
    let existingWorkouts: any[] = [];
    if (oldGroupAssignmentId) {
      existingWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(oldGroupAssignmentId);
    }

    const payloadsToInsert: any[] = [];
    const idsToKeep: string[] = [];

    for (const payload of newPayloads) {
      const existing = existingWorkouts.find((w: any) => w.athlete_id === payload.athlete_id);
      if (existing) {
        // Option 1: Merge data! We keep the existing ID so athlete_efforts don't break.
        await workoutService.updateWorkout(existing.id, payload);
        idsToKeep.push(existing.id);
      } else {
        payloadsToInsert.push(payload);
      }
    }

    if (payloadsToInsert.length > 0) {
      const { error } = await supabase.from('workouts').insert(payloadsToInsert);
      if (error) throw error;
    }

    // Delete existing workouts that are no longer in the new assigned group
    const idsToDelete = existingWorkouts
      .filter((w: any) => !idsToKeep.includes(w.id))
      .map((w: any) => w.id);

    if (idsToDelete.length > 0) {
      const { error } = await supabase.from('workouts').delete().in('id', idsToDelete);
      if (error) throw error;
    }
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

    if (role === 'coach') {
      const groupedMap = new Map<string, any>();
      for (const w of (data || [])) {
        const key = w.group_assignment_id || w.id;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            ...w,
            blocks: Array.isArray(w.blocks) ? [...w.blocks] : [],
            exercises: Array.isArray(w.exercises) ? [...w.exercises] : [],
          });
        } else {
          const existing = groupedMap.get(key);
          const existingBlockKeys = new Set(
            (existing.blocks || []).map((b: any) => b.id || b.name)
          );
          for (const blk of (w.blocks || [])) {
            const blkKey = blk.id || blk.name;
            if (!existingBlockKeys.has(blkKey)) {
              existingBlockKeys.add(blkKey);
              existing.blocks.push(blk);
            }
          }

          const existingExKeys = new Set(
            (existing.exercises || []).map((e: any) => e.id || e.name)
          );
          for (const ex of (w.exercises || [])) {
            const exKey = ex.id || ex.name;
            if (!existingExKeys.has(exKey)) {
              existingExKeys.add(exKey);
              existing.exercises.push(ex);
            }
          }
        }
      }
      return Array.from(groupedMap.values());
    }

    return data;
  },

  submitWorkoutResults: async (workoutId: string, efforts: any[], measures?: any) => {
    const { error } = await supabase.rpc('submit_workout_results', {
      p_workout_id: workoutId,
      p_efforts: efforts,
      p_measures: measures || null,
    });
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
      .select('type_seance, status, created_at, athlete_efforts(*)')
      .eq('athlete_id', athleteId)
      .gte('created_at', dateLimit.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return "Aucun entraînement récent.";

    return data.map(w => {
      const efforts = (w.athlete_efforts || []).map((e: any) => {
        const details = [
          e.actual_time_ms ? `${(e.actual_time_ms / 1000).toFixed(2)}s` : null,
          e.actual_weight_kg ? `${e.actual_weight_kg}kg` : null,
          e.actual_reps ? `${e.actual_reps} reps` : null,
          e.actual_distance_m ? `${e.actual_distance_m}m` : null,
        ].filter(Boolean).join(' / ');
        return `   * Série ${e.set_order || 1}: ${details || 'Réalisé'}`;
      }).join('\n');

      return `- ${new Date(w.created_at).toLocaleDateString('fr-FR')}: ${w.type_seance} (${w.status})\n${efforts}`;
    }).join('\n');
  },

  fetchAthletePerformanceHistory: async (athleteId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        type_seance,
        description,
        date_prevue,
        status,
        created_at,
        athlete_efforts (
          id,
          set_order,
          block_order,
          exercise_category,
          planned_reps,
          actual_reps,
          planned_weight_kg,
          actual_weight_kg,
          planned_distance_m,
          actual_distance_m,
          planned_time_ms,
          actual_time_ms,
          planned_intensity,
          actual_intensity,
          actual_extra, is_pr
        )
      `)
      .eq('athlete_id', athleteId)
      .order('date_prevue', { ascending: false });

    if (error) {
      console.error('Error fetching athlete performance history:', error);
      throw error;
    }
    return data || [];
  },

  fetchUpcomingCompetitionsContext: async (athleteId: string, days: number = 7) => {
    return "Aucune compétition prévue dans les 7 prochains jours.";
  },

  /**
   * Duplicate a workout to a specific target date.
   * Creates independent copies (not linked to original).
   * If the workout has a group_assignment_id, all athlete copies are duplicated too.
   */
  duplicateWorkout: async (workout: any, targetDate: Date): Promise<void> => {
    // Build the target date ISO string preserving the time
    const originalDate = new Date(workout.date_prevue);
    const target = new Date(targetDate);
    target.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

    if (workout.group_assignment_id) {
      // Fetch all workouts belonging to this group assignment
      const allGroupWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(workout.group_assignment_id);
      
      // Generate a new group_assignment_id for the copies
      const newGroupId = generateUUID();
      
      const copies = allGroupWorkouts.map((w: any) => {
        const { id, created_at, updated_at, athlete_efforts, ...rest } = w;
        return {
          ...rest,
          date_prevue: target.toISOString(),
          status: 'pending',
          group_assignment_id: newGroupId,
        };
      });

      if (copies.length > 0) {
        const { error } = await supabase.from('workouts').insert(copies);
        if (error) throw error;
      }
    } else {
      // Single workout copy
      const { id, created_at, updated_at, athlete_efforts, ...rest } = workout;
      const copy = {
        ...rest,
        date_prevue: target.toISOString(),
        status: 'pending',
        group_assignment_id: null,
      };

      const { error } = await supabase.from('workouts').insert([copy]);
      if (error) throw error;
    }
  },

  /**
   * Repeat a workout based on frequency and number of occurrences.
   * @param workout - The workout to repeat
   * @param mode - 'daily', 'weekly', 'monthly', 'yearly'
   * @param count - Number of occurrences
   * @returns Number of copies created
   */
  repeatWorkout: async (workout: any, mode: 'daily' | 'weekly' | 'monthly' | 'yearly', count: number): Promise<number> => {
    const workoutDate = new Date(workout.date_prevue);
    const dates: Date[] = [];

    // Calculate all target dates starting from the next occurrence
    for (let i = 1; i <= count; i++) {
      const targetDate = new Date(workoutDate);
      
      switch (mode) {
        case 'daily':
          targetDate.setDate(targetDate.getDate() + i);
          break;
        case 'weekly':
          targetDate.setDate(targetDate.getDate() + (i * 7));
          break;
        case 'monthly':
          targetDate.setMonth(targetDate.getMonth() + i);
          break;
        case 'yearly':
          targetDate.setFullYear(targetDate.getFullYear() + i);
          break;
      }
      
      dates.push(targetDate);
    }

    if (dates.length === 0) return 0;

    if (workout.group_assignment_id) {
      // Group workout: duplicate all athletes for each date
      const allGroupWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(workout.group_assignment_id);
      
      const allCopies: any[] = [];
      for (const targetDate of dates) {
        const newGroupId = generateUUID();
        for (const w of allGroupWorkouts) {
          const { id, created_at, updated_at, athlete_efforts, ...rest } = w;
          allCopies.push({
            ...rest,
            date_prevue: targetDate.toISOString(),
            status: 'pending',
            group_assignment_id: newGroupId,
          });
        }
      }

      // Insert in batches of 50 to avoid hitting limits
      for (let i = 0; i < allCopies.length; i += 50) {
        const batch = allCopies.slice(i, i + 50);
        const { error } = await supabase.from('workouts').insert(batch);
        if (error) throw error;
      }

      return dates.length;
    } else {
      // Single workout: one copy per date
      const copies = dates.map(targetDate => {
        const { id, created_at, updated_at, athlete_efforts, ...rest } = workout;
        return {
          ...rest,
          date_prevue: targetDate.toISOString(),
          status: 'pending',
          group_assignment_id: null,
        };
      });

      for (let i = 0; i < copies.length; i += 50) {
        const batch = copies.slice(i, i + 50);
        const { error } = await supabase.from('workouts').insert(batch);
        if (error) throw error;
      }

      return dates.length;
    }
  },
};

