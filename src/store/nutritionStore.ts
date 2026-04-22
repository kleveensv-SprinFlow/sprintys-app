import { create } from 'zustand';
import { nutritionService } from '../services/nutritionService';

export type MealType = 'PETIT-DÉJEUNER' | 'DÉJEUNER' | 'COLLATION / PRÉ-WORKOUT' | 'DÎNER';

export interface FoodLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: MealType;
  timestamp: number;
  quantity: number; // in grams
}

interface NutritionState {
  dailyLog: FoodLog[];
  addFoodLog: (food: Omit<FoodLog, 'id'>) => Promise<void>;
  removeFoodLog: (id: string) => Promise<void>;
  fetchDailyLogs: () => Promise<void>;
  getTotals: () => { calories: number; protein: number; carbs: number; fats: number };
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  dailyLog: [],

  fetchDailyLogs: async () => {
    const logs = await nutritionService.getDailyLogs(new Date());
    set({ dailyLog: logs });
  },

  addFoodLog: async (foodData) => {
    const id = await nutritionService.addNutritionLog(foodData);
    if (id) {
      const newLog = { ...foodData, id };
      set((state) => ({
        dailyLog: [...state.dailyLog, newLog]
      }));
    }
  },

  removeFoodLog: async (id) => {
    const success = await nutritionService.deleteNutritionLog(id);
    if (success) {
      set((state) => ({
        dailyLog: state.dailyLog.filter(item => item.id !== id)
      }));
    }
  },

  getTotals: () => {
    const today = new Date().setHours(0, 0, 0, 0);
    const logs = get().dailyLog.filter(log => new Date(log.timestamp).setHours(0, 0, 0, 0) === today);
    
    return logs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }
}));
