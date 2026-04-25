export interface CiqualFood {
  id: string;
  code_ciqual: string;
  nom: string;
  energie_kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres: number;
  eau?: number;
  vitamine_c?: number;
  fer?: number;
  calcium?: number;
  sodium?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserNutritionLog {
  id: string;
  user_id: string;
  food_id?: string;
  custom_food_name?: string;
  quantity_g: number;
  consumed_at: string;
  total_kcal: number;
  total_proteines: number;
  total_glucides: number;
  total_lipides: number;
  created_at?: string;
}
