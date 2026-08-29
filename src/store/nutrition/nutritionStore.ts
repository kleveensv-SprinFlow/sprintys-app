import { create } from 'zustand';
import { supabase } from '../../services/supabase';
import { MealLog, MealType, MealDistribution } from '../../features/nutrition/types';
import { useAuthStore } from '../authStore';

interface NutritionState {
  currentDate: string;
  mealLogs: MealLog[];
  recentFoods: any[];
  frequentFoods: any[];
  savedMeals: any[];
  isLoading: boolean;
  error: string | null;

  // UI State
  isSearchModalOpen: boolean;
  activeSearchMealType: MealType | null;

  // Actions
  setCurrentDate: (date: string) => void;
  fetchMealLogs: (date: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  addMealLog: (log: Omit<MealLog, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  updateNutritionProfile: (data: Partial<{
    activity_level: string;
    start_weight: number;
    target_weight: number;
    weekly_weight_goal: number;
    manual_kcal_goal: number;
    meal_distribution: MealDistribution;
  }>) => Promise<void>;

  openSearchModal: (mealType: MealType) => void;
  closeSearchModal: () => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  currentDate: new Date().toISOString().split('T')[0],
  mealLogs: [],
  recentFoods: [],
  frequentFoods: [],
  savedMeals: [],
  isLoading: false,
  error: null,
  isSearchModalOpen: false,
  activeSearchMealType: null,

  openSearchModal: (mealType) => set({ isSearchModalOpen: true, activeSearchMealType: mealType }),
  closeSearchModal: () => set({ isSearchModalOpen: false, activeSearchMealType: null }),

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

  fetchHistory: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      // 1. Fetch Recents (last 50 logs, distinct by food_id)
      const { data: recentData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // 2. Fetch Saved Meals
      const { data: savedMealsData } = await supabase
        .from('saved_meals')
        .select(`
          id, name,
          saved_meal_items (
            food_id, custom_food_name, quantity_g, calories, proteines, glucides, lipides
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recentData) {
        // Transform into fake OFFProduct for FoodDetailSheet compatibility
        const uniqueRecents = new Map<string, any>();
        const frequentCounts = new Map<string, number>();

        recentData.forEach(log => {
          if (!log.food_id) return;
          
          // Count frequency
          frequentCounts.set(log.food_id, (frequentCounts.get(log.food_id) || 0) + 1);

          // Add to recents if not already there
          if (!uniqueRecents.has(log.food_id)) {
            const multiplier = 100 / (log.quantity_g || 100);
            uniqueRecents.set(log.food_id, {
              id: log.food_id,
              name: log.custom_food_name || 'Aliment',
              macros_100g: {
                calories: log.calories * multiplier,
                proteines: log.proteines * multiplier,
                glucides: log.glucides * multiplier,
                lipides: log.lipides * multiplier,
              }
            });
          }
        });

        const recentsArray = Array.from(uniqueRecents.values()).slice(0, 15);
        
        // Sort frequents
        const sortedFrequents = Array.from(uniqueRecents.values())
          .sort((a, b) => (frequentCounts.get(b.id) || 0) - (frequentCounts.get(a.id) || 0))
          .slice(0, 15);

        set({ recentFoods: recentsArray, frequentFoods: sortedFrequents });
      }

      if (savedMealsData) {
        set({ savedMeals: savedMealsData });
      }

    } catch (err) {
      console.error(err);
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
