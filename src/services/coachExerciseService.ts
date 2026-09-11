import { supabase } from './supabase';

export interface CoachExercise {
  id: string;
  coach_id: string;
  name: string;
  category: string;
  default_stairs: number;
  default_sets: number;
  default_rest_sets: number; // in seconds
  default_rest_exercise: number; // in seconds
  created_at: string;
}

export const coachExerciseService = {
  fetchExercises: async (coachId: string, category: string = 'escalier'): Promise<CoachExercise[]> => {
    try {
      const { data, error } = await supabase
        .from('coach_exercises')
        .select('*')
        .eq('coach_id', coachId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coach exercises:', error);
        return [];
      }
      return (data as CoachExercise[]) || [];
    } catch (err) {
      console.error('Unexpected error fetching coach exercises:', err);
      return [];
    }
  },

  saveExercise: async (
    coachId: string,
    exercise: {
      name: string;
      category?: string;
      default_stairs?: number;
      default_sets?: number;
      default_rest_sets?: number;
      default_rest_exercise?: number;
    }
  ): Promise<CoachExercise | null> => {
    const cleanName = exercise.name.trim();
    if (!cleanName) return null;

    try {
      const payload = {
        coach_id: coachId,
        name: cleanName,
        category: exercise.category || 'escalier',
        default_stairs: exercise.default_stairs || 20,
        default_sets: exercise.default_sets || 4,
        default_rest_sets: exercise.default_rest_sets || 60,
        default_rest_exercise: exercise.default_rest_exercise || 180,
      };

      const { data, error } = await supabase
        .from('coach_exercises')
        .upsert(payload, { onConflict: 'coach_id,name,category' })
        .select()
        .single();

      if (error) {
        console.error('Error saving coach exercise:', error);
        return null;
      }
      return data as CoachExercise;
    } catch (err) {
      console.error('Unexpected error saving coach exercise:', err);
      return null;
    }
  },

  updateExercise: async (
    id: string,
    updates: {
      name?: string;
      default_stairs?: number | null;
      default_sets?: number;
      default_rest_sets?: number;
      default_rest_exercise?: number;
    }
  ): Promise<CoachExercise | null> => {
    try {
      const { data, error } = await supabase
        .from('coach_exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating coach exercise:', error);
        return null;
      }
      return data as CoachExercise;
    } catch (err) {
      console.error('Unexpected error updating coach exercise:', err);
      return null;
    }
  },

  deleteExercise: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coach_exercises')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting coach exercise:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Unexpected error deleting coach exercise:', err);
      return false;
    }
  },
};
