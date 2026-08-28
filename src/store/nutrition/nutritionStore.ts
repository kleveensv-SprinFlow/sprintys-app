import { create } from 'zustand';
import { supabase } from '../../services/supabase';
import { MealLog, MealType, MealDistribution } from '../../features/nutrition/types';
import { useAuthStore } from '../authStore';

interface NutritionState {
  currentDate: string;
  mealLogs: MealLog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentDate: (date: string) => void;
  fetchMealLogs: (date: string) => Promise<void>;
  addMealLog: (log: Omit<MealLog, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  updateNutritionProfile: (data: Partial<{
    activity_level: string;
    start_weight: number;
    target_weight: number;
    weekly_weight_goal: number;
    manual_kcal_goal: number;
    meal_distribution: MealDistribution;
  }>) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  currentDate: new Date().toISOString().split('T')[0],
  mealLogs: [],
  isLoading: false,
  error: null,

  setCurrentDate: (date: string) => {
    set({ currentDate: date });
    get().fetchMealLogs(date);
  },

  fetchMealLogs: async (date: string) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false, error: 'User not logged in' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('consumed_at', date);

      if (error) throw error;

      set({ mealLogs: data as MealLog[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addMealLog: async (log) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false, error: 'User not logged in' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .insert([{ ...log, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        mealLogs: [...state.mealLogs, data as MealLog],
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateNutritionProfile: async (data) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false, error: 'User not logged in' });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      // Mettre à jour manuellement l'état authStore si nécessaire,
      // ou re-fetch le profil, mais pour rester simple on garde l'état tel quel.
      // Une reconnexion ou un refetch global serait idéal.

      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
