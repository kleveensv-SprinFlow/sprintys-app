import { create } from 'zustand';
import { ManagedAthlete } from '../features/coach/types';
import { useSprintyStore } from './sprintyStore';

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
    
    try {
      // In a real scenario, we would fetch from Supabase here
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ athletes: [], isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Impossible de récupérer la liste des athlètes.");
      set({ isLoading: false });
    }
  },
}));
