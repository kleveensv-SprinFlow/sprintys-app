import { create } from 'zustand';
import { insightService, Insight } from '../services/insightService';
import { useWorkoutStore } from './workoutStore';
import { useBodyStore } from './bodyStore';
import { useWeatherStore } from './weatherStore';
import { useSprintyStore } from './sprintyStore';
import { useAuthStore } from './authStore';
import { SprintyStatus } from './sprintyStore';

interface InsightState {
  currentInsights: Insight[];
  athleteInsights: Insight[];
  isLoading: boolean;
  status: SprintyStatus;
  
  // Actions
  runAnalysis: () => Promise<void>;
  loadAthleteInsights: (athleteId: string) => Promise<void>;
  setStatus: (status: SprintyStatus) => void;
}

export const useInsightStore = create<InsightState>((set, get) => ({
  currentInsights: [],
  athleteInsights: [],
  isLoading: false,
  status: 'idle',

  loadAthleteInsights: async (athleteId) => {
    set({ isLoading: true });
    try {
      const insights = await insightService.fetchInsights(athleteId, 10);
      set({ athleteInsights: insights, isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Impossible de récupérer les insights de l'athlète.");
      set({ isLoading: false });
    }
  },

  setStatus: (status) => set({ status }),

  runAnalysis: async () => {
    const { history } = useWorkoutStore.getState();
    const { metrics } = useBodyStore.getState();
    const { data: weather } = useWeatherStore.getState();
    const { showFeedback, setStatus } = useSprintyStore.getState();

    set({ isLoading: true });
    setStatus('active'); // Pulse gold state

    // Simulate analysis delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const insights = insightService.generateInsights(history, metrics, weather);
      set({ currentInsights: insights, isLoading: false });

      if (insights.length > 0) {
        const bestInsight = insights[0];
        showFeedback(bestInsight.type, bestInsight.message);

        // PERSISTENCE: Save to Supabase
        const { user } = useAuthStore.getState();
        if (user) {
          insightService.saveInsight({
            athlete_id: user.id,
            type: bestInsight.type,
            message: bestInsight.message,
          }).catch(() => {});
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      set({ isLoading: false });
      setStatus('idle');
    }
  },
}));
