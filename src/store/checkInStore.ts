import { create } from 'zustand';
import { checkInService, CheckInData, CheckInDraft, PainInfo } from '../services/checkInService';
import { painKey } from '../features/checkin/painTaxonomy';
import { useSprintyStore } from './sprintyStore';
import { appAlert } from '../shared/feedback/appAlert';

const localDay = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

interface CheckInState {
  currentCheckIn: Partial<CheckInData> | null;
  history: CheckInData[];
  todayHealthScore: number | null;
  isLoading: boolean;
  
  // Actions
  startCheckIn: (athleteId: string) => void;
  editTodayCheckIn: (athleteId: string) => void;
  updateSleep: (bedtime: string, wakeup_time: string, sleep_hours: number, sleep_quality: number) => void;
  updateMental: (stress: number, fatigue: number, motivation: number) => void;
  addPain: (pain: PainInfo) => void;
  /** `key` = painKey(pain) : zone + côté. */
  removePain: (key: string) => void;
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
    // Aucune valeur par défaut : un pilier non renseigné reste vide (null à l'enregistrement),
    // jamais une réponse inventée.
    set({
      currentCheckIn: {
        athlete_id: athleteId,
        date: localDay(),
        pains: [],
      }
    });
  },

  editTodayCheckIn: (athleteId) => {
    const { history } = get();
    const today = localDay();
    const todayCheckIn = history.find(c => c.date === today);
    
    if (todayCheckIn) {
      set({ currentCheckIn: { ...todayCheckIn } });
    } else {
      get().startCheckIn(athleteId);
    }
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

  addPain: (pain) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      const currentPains = state.currentCheckIn.pains || [];
      const newPains = currentPains.filter(p => painKey(p) !== painKey(pain));
      newPains.push(pain);
      
      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          pains: newPains,
        }
      };
    });
  },

  removePain: (key) => {
    set((state) => {
      if (!state.currentCheckIn) return state;
      const currentPains = state.currentCheckIn.pains || [];
      const newPains = currentPains.filter(p => painKey(p) !== key);
      
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
      // Piliers non renseignés = null : aucune valeur par défaut. Seules les douleurs ont une liste vide.
      const baseData: CheckInDraft = {
        ...state.currentCheckIn,
        athlete_id: state.currentCheckIn.athlete_id,
        date: state.currentCheckIn.date || localDay(),
        pains: state.currentCheckIn.pains || [],
      };

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

      const newHistory = [...state.history.filter(h => h.date !== savedData.date), savedData]
        .sort((a, b) => (a.date < b.date ? 1 : -1)); // plus récent d'abord, comme fetchRecentCheckIns
      
      set({ 
        currentCheckIn: null, 
        history: newHistory,
        todayHealthScore: scores.health,
        isLoading: false 
      });
      
      useSprintyStore.getState().showFeedback('success', 'Ton check-in du jour est enregistré.', 3000, 'Check-in terminé');
      return true;
    } catch (error) {
      console.error(error);
      appAlert('Check-in', 'Impossible d’enregistrer pour le moment.');
      set({ isLoading: false });
      return false;
    }
  },

  loadHistory: async (athleteId) => {
    set({ isLoading: true });
    try {
      const history = await checkInService.fetchRecentCheckIns(athleteId, 6);
      const today = localDay();
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
