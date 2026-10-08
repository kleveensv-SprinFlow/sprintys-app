import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../../services/supabase';
import { MealLog, MealType, MealDistribution } from '../../features/nutrition/types';
import { useAuthStore } from '../authStore';

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  showStreakCelebration: boolean;
  currentStreakVal: number;
  closeStreakCelebration: () => void;
  activeSearchMealType: MealType | null;

  // Actions
  setCurrentDate: (date: string, athleteId?: string) => void;
  fetchMealLogs: (date: string, athleteId?: string) => Promise<void>;
  fetchHistory: (athleteId?: string) => Promise<void>;
  addMealLog: (log: Omit<MealLog, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  deleteMealLog: (id: string) => Promise<void>;
  updateMealLog: (id: string, updates: Partial<MealLog>) => Promise<void>;
  updateNutritionProfile: (data: Partial<{
    activity_level: string;
    start_weight: number;
    target_weight: number;
    weekly_weight_goal: number;
    manual_kcal_goal: number;
    meal_distribution: MealDistribution;
  }>) => Promise<boolean>;

  openSearchModal: (mealType: MealType) => void;
  closeSearchModal: () => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  currentDate: getLocalDateString(),
  mealLogs: [],
  recentFoods: [],
  frequentFoods: [],
  savedMeals: [],
  isLoading: false,
  error: null,
  isSearchModalOpen: false,
  activeSearchMealType: null,
  showStreakCelebration: false,
  currentStreakVal: 0,

  closeStreakCelebration: () => set({ showStreakCelebration: false }),

  openSearchModal: (mealType) => set({ isSearchModalOpen: true, activeSearchMealType: mealType }),
  closeSearchModal: () => set({ isSearchModalOpen: false, activeSearchMealType: null }),

  setCurrentDate: (date: string, athleteId?: string) => {
    set({ currentDate: date });
    get().fetchMealLogs(date, athleteId);
  },

  fetchMealLogs: async (date: string, athleteId?: string) => {
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
        .eq('user_id', athleteId || user.id)
        .eq('consumed_at', date);

      if (error) throw error;

      set({ mealLogs: data as MealLog[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchHistory: async (athleteId?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      // 1. Fetch Recents (last 50 logs)
      const { data: recentData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', athleteId || user.id)
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
        .eq('user_id', athleteId || user.id)
        .order('created_at', { ascending: false });

      if (recentData) {
        const uniqueRecents = new Map<string, any>();
        const frequentCounts = new Map<string, number>();

        recentData.forEach(log => {
          const key = log.food_id || log.custom_food_name;
          if (!key) return;
          
          frequentCounts.set(key, (frequentCounts.get(key) || 0) + 1);

          if (!uniqueRecents.has(key)) {
            const multiplier = 100 / (log.quantity_g || 100);
            uniqueRecents.set(key, {
              id: log.food_id || key,
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
    const authStore = useAuthStore.getState();
    const user = authStore.user;
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

      // --- LOGIQUE STREAK (SÉRIE) ---
      const todayStr = getLocalDateString();
      if (log.consumed_at === todayStr && user.lastFlowDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        let newStreak = 1;
        if (user.lastFlowDate === yesterdayStr) {
          newStreak = (user.currentFlowStreak || 0) + 1;
        }

        // Mettre à jour en base et dans le store
        await authStore.updateProfile({
          currentFlowStreak: newStreak,
          lastFlowDate: todayStr,
        });

        // Déclencher la célébration
        set({
          showStreakCelebration: true,
          currentStreakVal: newStreak,
        });
      }

    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      Alert.alert('Erreur', "Impossible d'enregistrer cet aliment : " + (err.message || 'Erreur réseau'));
    }
  },

  deleteMealLog: async (id: string) => {
    try {
      const { error } = await supabase.from('meal_logs').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        mealLogs: state.mealLogs.filter((l) => l.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
      Alert.alert('Erreur', "Impossible de supprimer cet aliment : " + (err.message || 'Erreur réseau'));
    }
  },

  updateMealLog: async (id: string, updates: Partial<MealLog>) => {
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        mealLogs: state.mealLogs.map((l) => (l.id === id ? { ...l, ...data } : l))
      }));
    } catch (err: any) {
      set({ error: err.message });
      Alert.alert('Erreur', "Impossible de modifier cet aliment : " + (err.message || 'Erreur réseau'));
    }
  },

  updateNutritionProfile: async (data) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false, error: 'User not logged in' });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
