export interface Set {
  id: string;
  weight?: number;
  reps?: number;
  distance?: number;
  duration?: string;
  steps?: number;
  restSeconds?: number;
  isCompleted: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  sets: Set[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  exercises: Exercise[]; // Keep for backwards compatibility
  blocks?: WorkoutBlock[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface WorkoutBlock {
  id: string;
  name: string; // e.g., 'Échauffement', 'Vitesse maximale'
  exercises: Exercise[];
}

export interface WorkoutHistoryItem {
  id: string;
  date: string;
  name: string;
  durationMinutes: number;
  totalVolume: number;
}
