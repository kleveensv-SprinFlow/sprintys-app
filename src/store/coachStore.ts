import { create } from 'zustand';
import { ManagedAthlete } from '../features/coach/types';

interface CoachStoreState {
  athletes: ManagedAthlete[];
  isLoading: boolean;
  
  // Actions
  fetchAthletes: () => Promise<void>;
}

export const useCoachStore = create<CoachStoreState>((set) => ({
  athletes: [],
  isLoading: false,

  fetchAthletes: async () => {
    set({ isLoading: true });
    
    // Simulating API call with mock data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockAthletes: ManagedAthlete[] = [
      {
        id: '1',
        name: 'Thomas Durand',
        email: 'thomas@test.com',
        lastWorkoutStatus: 'completed',
        lastWorkoutDate: new Date().toISOString(),
        completionRate: 95,
      },
      {
        id: '2',
        name: 'Léa Bernard',
        email: 'lea@test.com',
        lastWorkoutStatus: 'missed',
        lastWorkoutDate: new Date(Date.now() - 86400000).toISOString(),
        completionRate: 72,
      },
      {
        id: '3',
        name: 'Marc Lefebvre',
        email: 'marc@test.com',
        lastWorkoutStatus: 'in-progress',
        lastWorkoutDate: new Date().toISOString(),
        completionRate: 88,
      }
    ];

    set({ athletes: mockAthletes, isLoading: false });
  },
}));
