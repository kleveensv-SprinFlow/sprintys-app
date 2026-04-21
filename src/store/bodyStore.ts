import { create } from 'zustand';
import { bodyService, BodyMetric } from '../services/bodyService';
import { useSprintyStore } from './sprintyStore';

interface BodyState {
  metrics: BodyMetric[];
  isLoading: boolean;
  
  // Actions
  loadMetrics: (athleteId: string) => Promise<void>;
  addMetric: (athleteId: string, weight: number, bodyFat?: number) => Promise<void>;
}

export const useBodyStore = create<BodyState>((set, get) => ({
  metrics: [],
  isLoading: false,

  loadMetrics: async (athleteId) => {
    set({ isLoading: true });
    try {
      const data = await bodyService.fetchMetrics(athleteId);
      set({ metrics: data || [], isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Impossible de charger vos données corporelles.");
      set({ isLoading: false });
    }
  },

  addMetric: async (athleteId, weight, bodyFat) => {
    set({ isLoading: true });
    try {
      await bodyService.addMetric({
        athlete_id: athleteId,
        weight,
        body_fat: bodyFat,
      });
      
      // Reload metrics to keep sync
      const data = await bodyService.fetchMetrics(athleteId);
      set({ metrics: data || [], isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Échec de l'enregistrement. Vérifiez votre connexion.");
      set({ isLoading: false });
      throw error;
    }
  },
}));
