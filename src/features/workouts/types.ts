export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  targetMuscleGroup: MuscleGroup;
  description?: string;
  equipment?: string;
}

export interface Set {
  id: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
  rpe?: number; // Rate of Perceived Exertion
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: Set[];
  restTimerSeconds: number;
}

export interface Workout {
  id: string;
  name: string;
  date: Date;
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  volumeTotal?: number;
  overallRpe?: number;
  notes?: string;
  isCompleted: boolean;
}
