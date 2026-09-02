export type BlockType = 
  | 'warmup' 
  | 'sprint' 
  | 'max_speed' 
  | 'endurance_sprint' 
  | 'endurance' 
  | 'technique' 
  | 'plyo' 
  | 'cooldown' 
  | 'strength' 
  | 'free';

export type ExerciseCategory = 'strength' | 'run' | 'jump' | 'metrics';

export interface WorkoutSet {
  id: string; // uuid local pour le builder
  set_index: number;
  
  // Métriques de base (Natives dans athlete_efforts)
  planned_reps?: number;
  planned_weight_kg?: number;
  planned_distance_m?: number;
  planned_time_ms?: number;
  planned_rest_ms?: number;
  planned_height_cm?: number;

  actual_reps?: number;
  actual_weight_kg?: number;
  actual_distance_m?: number;
  actual_time_ms?: number;
  actual_rest_ms?: number;
  actual_height_cm?: number;
  planned_intensity?: number;
  actual_intensity?: number;

  // Métriques futures (Puissance, Vitesse, Splits...) via JSONB
  planned_extra?: Record<string, any>;
}

export interface WorkoutExercise {
  id: string; // uuid local
  catalog_id: string | null;
  name: string;
  category: ExerciseCategory;
  sets: WorkoutSet[];
}

export interface WorkoutBlock {
  id: string; // uuid local
  type: BlockType;
  name: string;
  rest_between_exercises_ms?: number;
  exercises: WorkoutExercise[];
}
