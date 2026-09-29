const fs = require('fs');
let c = import { create } from 'zustand';
import { bodyService, BodyMetric } from '../services/bodyService';
import { useSprintyStore } from './sprintyStore';

interface BodyState {
  metrics: BodyMetric[];
  isLoading: boolean;
  
  // Actions
  loadMetrics: (athleteId: string) => Promise<void>;
  addMetric: (metric: Omit<BodyMetric, 'id' | 'created_at'>) => Promise<void>;
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

  addMetric: async (metric) => {
    set({ isLoading: true });
    try {
      await bodyService.addMetric(metric);
      
      const data = await bodyService.fetchMetrics(metric.athlete_id);
      set({ metrics: data || [], isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Échec de l'enregistrement. Vérifiez votre connexion.");
      set({ isLoading: false });
      throw error;
    }
  },
}));;
fs.writeFileSync('c:/Users/kleve/Sprintflow/sprintys-app/src/store/bodyStore.ts', c, 'utf8');
