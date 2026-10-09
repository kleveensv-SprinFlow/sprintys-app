import { create } from 'zustand';
import { bodyService, BodyMetric } from '../services/bodyService';
import { useSprintyStore } from './sprintyStore';

interface BodyState {
  metrics: BodyMetric[];
  isLoading: boolean;

  loadMetrics: (athleteId: string) => Promise<void>;
  addMetric: (metricOrAthleteId: string | Omit<BodyMetric, 'id' | 'created_at'>, weight?: number, bodyFat?: number, extraFields?: Partial<BodyMetric>) => Promise<void>;
  updateMetric: (id: string, athleteId: string, patch: Partial<BodyMetric>) => Promise<void>;
  deleteMetric: (id: string, athleteId: string) => Promise<void>;
}

export const useBodyStore = create<BodyState>((set) => ({
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

  addMetric: async (metricOrAthleteId: string | Omit<BodyMetric, 'id' | 'created_at'>, weight?: number, bodyFat?: number, extraFields?: Partial<BodyMetric>) => {
    set({ isLoading: true });
    try {
      let payload: Omit<BodyMetric, 'id' | 'created_at'>;

      if (typeof metricOrAthleteId === 'string') {
        payload = {
          athlete_id: metricOrAthleteId,
          weight: weight!,
          body_fat: bodyFat,
          ...extraFields,
        };
      } else {
        payload = metricOrAthleteId;
      }

      await bodyService.addMetric(payload);

      const data = await bodyService.fetchMetrics(payload.athlete_id);
      set({ metrics: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Error adding body metric:', error);
      useSprintyStore.getState().showFeedback('error', `Echec: ${error?.message || 'Erreur inconnue'}`);
      set({ isLoading: false });
      throw error;
    }
  },

  updateMetric: async (id, athleteId, patch) => {
    set({ isLoading: true });
    try {
      await bodyService.updateMetric(id, patch);
      const data = await bodyService.fetchMetrics(athleteId);
      set({ metrics: data || [], isLoading: false });
    } catch (error: any) {
      useSprintyStore.getState().showFeedback('error', `Echec: ${error?.message || 'Erreur inconnue'}`);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteMetric: async (id, athleteId) => {
    set({ isLoading: true });
    try {
      await bodyService.deleteMetric(id);
      const data = await bodyService.fetchMetrics(athleteId);
      set({ metrics: data || [], isLoading: false });
    } catch (error: any) {
      useSprintyStore.getState().showFeedback('error', `Echec: ${error?.message || 'Erreur inconnue'}`);
      set({ isLoading: false });
      throw error;
    }
  },
}));
