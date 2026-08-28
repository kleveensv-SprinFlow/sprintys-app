export type MealType = 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';

export interface MealLog {
  id: string;
  user_id: string;
  food_id?: string;
  custom_food_name?: string;
  quantity_g: number;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  meal_type: MealType;
  consumed_at: string;
  created_at?: string;
}

export interface MealDistribution {
  petit_dejeuner: number;
  dejeuner: number;
  diner: number;
  collation: number;
}
