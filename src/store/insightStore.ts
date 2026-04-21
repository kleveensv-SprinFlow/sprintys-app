import { create } from 'zustand';
import { insightService, Insight } from '../services/insightService';
import { useWorkoutStore } from './workoutStore';
import { useBodyStore } from './bodyStore';
import { useWeatherStore } from './weatherStore';
import { useSprintyStore } from './sprintyStore';
import { useAuthStore } from './authStore';

interface InsightState {
  currentInsights: Insight[];
  isAnalyzing: boolean;
  
  // Actions
  runAnalysis: () => Promise<void>;
}

export const useInsightStore = create<InsightState>((set, get) => ({
  currentInsights: [],
  isAnalyzing: false,

  runAnalysis: async () => {
    const { history } = useWorkoutStore.getState();
    const { metrics } = useBodyStore.getState();
    const { data: weather } = useWeatherStore.getState();
    const { showFeedback, setStatus } = useSprintyStore.getState();

    set({ isAnalyzing: true });
    setStatus('active'); // Pulse gold state

    // Simulate analysis delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const insights = insightService.generateInsights(history, metrics, weather);
      set({ currentInsights: insights, isAnalyzing: false });

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
          }).catch(err => console.error('Failed to persist insight', err));
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Analysis failed', error);
      set({ isAnalyzing: false });
      setStatus('idle');
    }
  },
}));
