import { create } from 'zustand';
import { checkInService, CheckInData, CheckInDraft, PainInfo } from '../services/checkInService';
import { painKey } from '../features/checkin/painTaxonomy';
import { syncCheckInReminders } from '../services/notifications';
import { checkInOutbox } from '../services/checkInOutbox';
import { isNetworkError } from '../services/resultsOutbox';
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
  /** Historique chargé au moins une fois (pour savoir si le check-in du jour est fait). */
  historyLoaded: boolean;
  /** Check-ins enregistrés hors ligne, pas encore envoyés. */
  pendingSyncDates: string[];

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
  historyLoaded: false,
  pendingSyncDates: [],

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
    let fullData: CheckInData | null = null;
    const finish = (saved: CheckInData, queued: boolean) => {
      const current = get();
      set({
        currentCheckIn: null,
        history: [...current.history.filter((h) => h.date !== saved.date), saved].sort((a, b) => (a.date < b.date ? 1 : -1)), // plus récent d'abord
        todayHealthScore: saved.date === localDay() ? saved.health_score : current.todayHealthScore,
        pendingSyncDates: queued
          ? [...current.pendingSyncDates.filter((d) => d !== saved.date), saved.date]
          : current.pendingSyncDates.filter((d) => d !== saved.date),
        isLoading: false,
      });
      // Le bilan s'ouvre juste après (CheckInSummaryModal) : pas de toast en plus. Le rappel du jour n'a plus lieu d'être.
      syncCheckInReminders(saved.athlete_id, true);
    };
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
      
      fullData = {
        ...baseData,
        health_score: scores.health,
        sleep_score: scores.sleep,
        physical_score: scores.physical,
        mental_score: scores.mental,
      };

      finish(await checkInService.upsertCheckIn(fullData), false);
      return true;
    } catch (error) {
      // Pas de réseau : on garde le check-in sur le téléphone, il partira dès que la connexion revient
      if (fullData && isNetworkError(error) && (await checkInOutbox.enqueue(fullData.athlete_id, fullData))) {
        finish(fullData, true);
        return true;
      }
      console.error(error);
      appAlert('Check-in', 'Impossible d’enregistrer pour le moment.');
      set({ isLoading: false });
      return false;
    }
  },

  loadHistory: async (athleteId) => {
    set({ isLoading: true });
    try {
      // 30 jours : lissage du score (3 derniers) + série de check-ins affichée dans le bilan
      const [server, pending] = await Promise.all([
        checkInService.fetchRecentCheckIns(athleteId, 30),
        checkInOutbox.pending(athleteId),
      ]);
      // Un check-in pas encore envoyé (hors ligne) compte comme fait et prime sur la version du serveur
      const history = [...server.filter((h) => !pending.some((p) => p.date === h.date)), ...pending].sort((a, b) =>
        a.date < b.date ? 1 : -1
      );
      const today = localDay();
      const todayCheckIn = history.find(h => h.date === today);

      set({
        history,
        pendingSyncDates: pending.map((p) => p.date),
        todayHealthScore: todayCheckIn ? todayCheckIn.health_score : null,
        isLoading: false,
        historyLoaded: true,
      });
    } catch (error) {
      console.error(error);
      set({ isLoading: false, historyLoaded: true });
    }
  },
  
  cancelCheckIn: () => {
    set({ currentCheckIn: null });
  }
}));
