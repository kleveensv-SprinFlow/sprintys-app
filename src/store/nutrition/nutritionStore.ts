import { create } from 'zustand';
import {} from 'react-native';
import { supabase } from '../../services/supabase';
import { MealLog, MealType, MealDistribution } from '../../features/nutrition/types';
import { useAuthStore } from '../authStore';

import { appAlert } from '../../shared/feedback/appAlert';

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
  copyMealFromDate: (sourceDate: string, mealType: MealType, athleteId?: string) => Promise<boolean>;
  saveCurrentMealAsTemplate: (name: string, mealType: MealType, athleteId?: string) => Promise<boolean>;
  deleteSavedMeal: (id: string) => Promise<boolean>;
  logSavedMeal: (savedMeal: any, mealType: MealType, athleteId?: string) => Promise<boolean>;
  quickAddFood: (food: any, mealType: MealType, athleteId?: string) => Promise<boolean>;
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
                calories: Math.round(log.calories * multiplier),
                proteines: Math.round(log.proteines * multiplier),
                glucides: Math.round(log.glucides * multiplier),
                lipides: Math.round(log.lipides * multiplier),
              },
              last_input_qty: log.input_qty || (log.quantity_g ? Math.round(log.quantity_g) : 100),
              last_input_unit: log.input_unit || 'g',
              last_grams_per_unit: log.grams_per_unit,
              last_unit_label: log.unit_label,
              last_calories: Math.round(log.calories),
              last_quantity_g: Math.round(log.quantity_g),
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
      appAlert('Erreur', "Impossible d'enregistrer cet aliment : " + (err.message || 'Erreur réseau'));
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
      appAlert('Erreur', "Impossible de supprimer cet aliment : " + (err.message || 'Erreur réseau'));
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
      appAlert('Erreur', "Impossible de modifier cet aliment : " + (err.message || 'Erreur réseau'));
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
  },

  copyMealFromDate: async (sourceDate: string, mealType: MealType, athleteId?: string) => {
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    if (!user) return false;
    const targetUserId = athleteId || user.id;

    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('consumed_at', sourceDate)
        .eq('meal_type', mealType);

      if (error) throw error;
      if (!data || data.length === 0) {
        set({ isLoading: false });
        return false;
      }

      const currentDate = get().currentDate;
      const newRows = data.map((item) => ({
        user_id: targetUserId,
        meal_type: mealType,
        consumed_at: currentDate,
        food_id: item.food_id,
        custom_food_name: item.custom_food_name,
        quantity_g: item.quantity_g,
        calories: item.calories,
        proteines: item.proteines,
        glucides: item.glucides,
        lipides: item.lipides,
        input_qty: item.input_qty,
        input_unit: item.input_unit,
        grams_per_unit: item.grams_per_unit,
        unit_label: item.unit_label,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('meal_logs')
        .insert(newRows)
        .select();

      if (insertErr) throw insertErr;

      set((state) => ({
        mealLogs: [...state.mealLogs, ...(inserted as MealLog[])],
        isLoading: false,
      }));

      // Streak update
      const todayStr = getLocalDateString();
      if (currentDate === todayStr && user.lastFlowDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        const newStreak = user.lastFlowDate === yesterdayStr ? (user.currentFlowStreak || 0) + 1 : 1;
        await authStore.updateProfile({ currentFlowStreak: newStreak, lastFlowDate: todayStr });
        set({ showStreakCelebration: true, currentStreakVal: newStreak });
      }

      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      appAlert('Erreur', "Impossible de copier le repas : " + (err.message || 'Erreur réseau'));
      return false;
    }
  },

  saveCurrentMealAsTemplate: async (name: string, mealType: MealType, athleteId?: string) => {
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    if (!user) return false;
    const targetUserId = athleteId || user.id;

    const currentLogs = get().mealLogs.filter((l) => l.meal_type === mealType);
    if (!currentLogs.length) {
      appAlert('Repas vide', 'Ajoutez au moins un aliment avant de sauvegarder ce repas.');
      return false;
    }

    try {
      set({ isLoading: true, error: null });
      const { data: mealData, error: mealErr } = await supabase
        .from('saved_meals')
        .insert([{ user_id: targetUserId, name: name.trim() }])
        .select()
        .single();

      if (mealErr) throw mealErr;

      const items = currentLogs.map((log) => ({
        saved_meal_id: mealData.id,
        food_id: log.food_id,
        custom_food_name: log.custom_food_name || 'Aliment',
        quantity_g: log.quantity_g,
        calories: log.calories,
        proteines: log.proteines,
        glucides: log.glucides,
        lipides: log.lipides,
      }));

      const { error: itemsErr } = await supabase
        .from('saved_meal_items')
        .insert(items);

      if (itemsErr) throw itemsErr;

      await get().fetchHistory(athleteId);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      appAlert('Erreur', "Impossible de sauvegarder ce repas : " + (err.message || 'Erreur réseau'));
      return false;
    }
  },

  deleteSavedMeal: async (id: string) => {
    try {
      const { error } = await supabase.from('saved_meals').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        savedMeals: state.savedMeals.filter((m) => m.id !== id),
      }));
      return true;
    } catch (err: any) {
      appAlert('Erreur', "Impossible de supprimer ce repas : " + (err.message || 'Erreur réseau'));
      return false;
    }
  },

  logSavedMeal: async (savedMeal: any, mealType: MealType, athleteId?: string) => {
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    if (!user) return false;
    const targetUserId = athleteId || user.id;

    const items = savedMeal.saved_meal_items || [];
    if (!items.length) {
      appAlert('Repas vide', 'Ce repas sauvegardé ne contient aucun aliment.');
      return false;
    }

    try {
      set({ isLoading: true, error: null });
      const currentDate = get().currentDate;
      const rows = items.map((item: any) => ({
        user_id: targetUserId,
        meal_type: mealType,
        consumed_at: currentDate,
        food_id: item.food_id,
        custom_food_name: item.custom_food_name || 'Aliment',
        quantity_g: item.quantity_g,
        calories: item.calories,
        proteines: item.proteines,
        glucides: item.glucides,
        lipides: item.lipides,
      }));

      const { data, error } = await supabase
        .from('meal_logs')
        .insert(rows)
        .select();

      if (error) throw error;

      set((state) => ({
        mealLogs: [...state.mealLogs, ...(data as MealLog[])],
        isLoading: false,
      }));

      // Streak update
      const todayStr = getLocalDateString();
      if (currentDate === todayStr && user.lastFlowDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        const newStreak = user.lastFlowDate === yesterdayStr ? (user.currentFlowStreak || 0) + 1 : 1;
        await authStore.updateProfile({ currentFlowStreak: newStreak, lastFlowDate: todayStr });
        set({ showStreakCelebration: true, currentStreakVal: newStreak });
      }

      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      appAlert('Erreur', "Impossible d'ajouter ce repas : " + (err.message || 'Erreur réseau'));
      return false;
    }
  },

  quickAddFood: async (food: any, mealType: MealType, athleteId?: string) => {
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    if (!user) return false;
    const targetUserId = athleteId || user.id;
    const currentDate = get().currentDate;

    try {
      const multiplier = (food.last_quantity_g || 100) / 100;
      const baseKcal = food.macros_100g?.calories ?? food.energie_kcal ?? 0;
      const basePro = food.macros_100g?.proteines ?? food.proteines ?? 0;
      const baseGlu = food.macros_100g?.glucides ?? food.glucides ?? 0;
      const baseLip = food.macros_100g?.lipides ?? food.lipides ?? 0;

      const calories = food.last_calories ?? Math.round(baseKcal * multiplier);
      const proteines = Math.round(basePro * multiplier * 10) / 10;
      const glucides = Math.round(baseGlu * multiplier * 10) / 10;
      const lipides = Math.round(baseLip * multiplier * 10) / 10;

      const log = {
        user_id: targetUserId,
        meal_type: mealType,
        consumed_at: currentDate,
        food_id: food.id,
        custom_food_name: food.name || food.custom_food_name || 'Aliment',
        quantity_g: food.last_quantity_g || 100,
        calories,
        proteines,
        glucides,
        lipides,
        input_qty: food.last_input_qty,
        input_unit: food.last_input_unit,
        grams_per_unit: food.last_grams_per_unit,
        unit_label: food.last_unit_label,
      };

      const { data, error } = await supabase
        .from('meal_logs')
        .insert([log])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        mealLogs: [...state.mealLogs, data as MealLog],
      }));

      // Streak update
      const todayStr = getLocalDateString();
      if (currentDate === todayStr && user.lastFlowDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        const newStreak = user.lastFlowDate === yesterdayStr ? (user.currentFlowStreak || 0) + 1 : 1;
        await authStore.updateProfile({ currentFlowStreak: newStreak, lastFlowDate: todayStr });
        set({ showStreakCelebration: true, currentStreakVal: newStreak });
      }

      return true;
    } catch (err: any) {
      appAlert('Erreur', "Impossible d'ajouter cet aliment : " + (err.message || 'Erreur réseau'));
      return false;
    }
  }
}));
