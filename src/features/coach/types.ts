export interface ManagedAthlete {
  id: string;
  name: string;
  email: string;
  lastWorkoutStatus: 'completed' | 'in-progress' | 'scheduled' | 'missed';
  lastWorkoutDate?: string;
  completionRate: number; // 0-100
}

export interface CoachState {
  athletes: ManagedAthlete[];
  isLoading: boolean;
}
