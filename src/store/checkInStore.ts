import { create } from 'zustand';
import { checkInService, CheckInData, PainInfo } from '../services/checkInService';
import { useSprintyStore } from './sprintyStore';

interface CheckInState {
  currentCheckIn: Partial<CheckInData> | null;
  history: CheckInData[];
  todayHealthScore: number | null;
  isLoading: boolean;
  
  // Actions
  startCheckIn: (athleteId: string) => void;
  updateSleep: (bedtime: string, wakeup_time: string, sleep_hours: number) => void;
  addPain: (pain: PainInfo) => void;
  removePain: (muscle_id: string) => void;
  submitCheckIn: () => Promise<boolean>;
  loadHistory: (athleteId: string) => Promise<void>;
  cancelCheckIn: () => void;
}

export const useCheckInStore = create<CheckInState>((set, get) => ({
  currentCheckIn: null,
  history: [],
  todayHealthScore: null,
  isLoading: false,

  startCheckIn: (athleteId) => {
    // Format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    set({
      currentCheckIn: {
        athlete_id: athleteId,
        date: today,
        bedtime: '23:00', // default values
        wakeup_time: '07:00',
        sleep_hours: 8,
        pains: [],
      }
    });
  },

  updateSleep: (bedtime, wakeup_time, sleep_hours) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          bedtime,
          wakeup_time,
          sleep_hours,
        }
      };
    });
  },

  addPain: (pain) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      
      const currentPains = state.currentCheckIn.pains || [];
      // Remove if already exists for this muscle, then add new one
      const newPains = currentPains.filter(p => p.muscle_id !== pain.muscle_id);
      newPains.push(pain);
      
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          pains: newPains,
        }
      };
    });
  },

  removePain: (muscle_id) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      
      const currentPains = state.currentCheckIn.pains || [];
      const newPains = currentPains.filter(p => p.muscle_id !== muscle_id);
      
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          pains: newPains,
        }
      };
    });
  },

  submitCheckIn: async () => {
    const state = get();
    if (!state.currentCheckIn || !state.currentCheckIn.athlete_id) return false;

    set({ isLoading: true });
    try {
      const checkInToSubmit = state.currentCheckIn as Omit<CheckInData, 'health_score'>;
      
      // Calculate score with history
      const score = checkInService.calculateHealthScore(checkInToSubmit, state.history);
      
      const fullData: CheckInData = {
        ...checkInToSubmit,
        health_score: score,
      } as CheckInData;

      const savedData = await checkInService.upsertCheckIn(fullData);
      
      // Update history and UI state
      const newHistory = [...state.history.filter(h => h.date !== savedData.date), savedData];
      
      set({ 
        currentCheckIn: null, 
        history: newHistory,
        todayHealthScore: score,
        isLoading: false 
      });
      
      useSprintyStore.getState().showFeedback('success', "Check-In enregistré avec succès !");
      return true;
    } catch (error) {
      console.error(error);
      useSprintyStore.getState().showFeedback('error', "Échec de l'enregistrement du Check-In.");
      set({ isLoading: false });
      return false;
    }
  },

  loadHistory: async (athleteId) => {
    set({ isLoading: true });
    try {
      const history = await checkInService.fetchRecentCheckIns(athleteId, 6);
      
      // Check if we have a score for today
      const today = new Date().toISOString().split('T')[0];
      const todayCheckIn = history.find(h => h.date === today);
      
      set({ 
        history, 
        todayHealthScore: todayCheckIn ? todayCheckIn.health_score : null,
        isLoading: false 
      });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },
  
  cancelCheckIn: () => {
    set({ currentCheckIn: null });
  }
}));
