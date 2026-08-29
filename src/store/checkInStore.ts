import { create } from 'zustand';
import { checkInService, CheckInData, PainInfo } from '../services/checkInService';
import { useSprintyStore } from './sprintyStore';
import { useAuthStore } from './authStore';

interface CheckInState {
  currentCheckIn: Partial<CheckInData> | null;
  history: CheckInData[];
  todayHealthScore: number | null;
  isLoading: boolean;
  
  // Actions
  startCheckIn: (athleteId: string) => void;
  updateSleep: (bedtime: string, wakeup_time: string, sleep_hours: number, sleep_quality: number) => void;
  updateMental: (stress: number, fatigue: number, motivation: number) => void;
  setMenstruation: (isMenstruating: boolean) => void;
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
    const today = new Date().toISOString().split('T')[0];
    const user = useAuthStore.getState().user;
    const isFemale = user?.profile?.gender === 'female' || user?.profile?.gender === 'Femme';
    
    set({
      currentCheckIn: {
        athlete_id: athleteId,
        date: today,
        bedtime: '23:00',
        wakeup_time: '07:00',
        sleep_hours: 8,
        sleep_quality: 3, // Défaut : Moyen
        stress_level: 5,
        fatigue_level: 5,
        motivation_level: 5,
        pains: [],
        menstruation: isFemale ? false : undefined, // Défini seulement si femme
      }
    });
  },

  updateSleep: (bedtime, wakeup_time, sleep_hours, sleep_quality) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          bedtime,
          wakeup_time,
          sleep_hours,
          sleep_quality
        }
      };
    });
  },

  updateMental: (stress, fatigue, motivation) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          stress_level: stress,
          fatigue_level: fatigue,
          motivation_level: motivation
        }
      };
    });
  },

  setMenstruation: (isMenstruating) => set((state) => {
    if (!state.currentCheckIn) return state;
    return { currentCheckIn: { ...state.currentCheckIn, menstruation: isMenstruating } };
  }),

  addPain: (pain) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      const currentPains = state.currentCheckIn.pains || [];
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
      // On s'assure que toutes les données obligatoires sont présentes (avec fallback)
      const baseData = {
        ...state.currentCheckIn,
        bedtime: state.currentCheckIn.bedtime || '23:00',
        wakeup_time: state.currentCheckIn.wakeup_time || '07:00',
        sleep_hours: state.currentCheckIn.sleep_hours || 8,
        sleep_quality: state.currentCheckIn.sleep_quality || 3,
        stress_level: state.currentCheckIn.stress_level || 5,
        fatigue_level: state.currentCheckIn.fatigue_level || 5,
        motivation_level: state.currentCheckIn.motivation_level || 5,
        pains: state.currentCheckIn.pains || [],
      } as Omit<CheckInData, 'health_score'|'sleep_score'|'physical_score'|'mental_score'>;
      
      // Calcule tous les scores
      const scores = checkInService.calculateScores(baseData, state.history);
      
      const fullData: CheckInData = {
        ...baseData,
        health_score: scores.health,
        sleep_score: scores.sleep,
        physical_score: scores.physical,
        mental_score: scores.mental,
      };

      const savedData = await checkInService.upsertCheckIn(fullData);
      
      const newHistory = [...state.history.filter(h => h.date !== savedData.date), savedData];
      
      set({ 
        currentCheckIn: null, 
        history: newHistory,
        todayHealthScore: scores.health,
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
