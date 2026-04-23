export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  disciplines: string[];
  season_goal: string | null;
  personal_records: Record<string, string>;
  // Nutrition & Body fields
  dob: string | null;
  height: number | null;
  activity_level: 'sedentary' | 'active' | 'very_active' | null;
  nutrition_goal: 'loss' | 'maintain' | 'gain' | null;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
  competition_bag?: any[];
  updated_at: string;
}

export interface BodyMetric {
  id?: string;
  user_id: string;
  created_at?: string;
  weight: number;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  waist_circumference: number | null;
}
