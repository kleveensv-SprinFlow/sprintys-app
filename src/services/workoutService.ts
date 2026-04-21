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
};
