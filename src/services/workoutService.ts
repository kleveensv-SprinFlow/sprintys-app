import { supabase } from './supabaseClient';

export const workoutService = {
  deleteWorkout: async (id: string) => {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
