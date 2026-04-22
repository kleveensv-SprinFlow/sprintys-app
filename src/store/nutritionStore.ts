import { create } from 'zustand';

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
  addFoodLog: (food: FoodLog) => void;
  removeFoodLog: (id: string) => void;
  getTotals: () => { calories: number; protein: number; carbs: number; fats: number };
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  dailyLog: [],

  addFoodLog: (food) => set((state) => ({
    dailyLog: [...state.dailyLog, food]
  })),

  removeFoodLog: (id) => set((state) => ({
    dailyLog: state.dailyLog.filter(item => item.id !== id)
  })),

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
