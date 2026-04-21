export interface Record {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  date: Date;
  workoutId: string;
}

export type RecordType = 'max_weight' | 'max_volume' | 'max_reps';
