import { supabase } from './supabaseClient';
import { FoodLog, MealType } from '../store/nutritionStore';

export const nutritionService = {
  async addNutritionLog(logData: Omit<FoodLog, 'id'>): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: user.id,
          name: logData.name,
          calories: logData.calories,
          protein: logData.protein,
          carbs: logData.carbs,
          fats: logData.fats,
          meal_type: logData.mealType,
          quantity: logData.quantity,
          consumed_at: new Date(logData.timestamp).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error adding nutrition log:', error);
      return null;
    }
  },

  async deleteNutritionLog(logId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting nutrition log:', error);
      return false;
    }
  },

  async getDailyLogs(date: Date): Promise<FoodLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', startOfDay.toISOString())
        .lte('consumed_at', endOfDay.toISOString())
        .order('consumed_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        mealType: item.meal_type as MealType,
        timestamp: new Date(item.consumed_at).getTime(),
        quantity: item.quantity,
      }));
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      return [];
    }
  }
};
