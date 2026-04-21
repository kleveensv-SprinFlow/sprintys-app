import { create } from 'zustand';
import { BodyMetric } from '../features/body-metrics/types';
import uuid from 'react-native-uuid';

interface BodyMetricsState {
  metrics: BodyMetric[];
  addMetric: (weight: number, bodyFatPercentage?: number, notes?: string) => void;
  removeMetric: (id: string) => void;
  getLatestMetric: () => BodyMetric | null;
}

export const useBodyMetricsStore = create<BodyMetricsState>((set, get) => ({
  metrics: [],
  
  addMetric: (weight, bodyFatPercentage, notes) => {
    const { metrics } = get();
    
    const newMetric: BodyMetric = {
      id: uuid.v4().toString(),
      date: new Date(),
      weight,
      bodyFatPercentage,
      notes,
    };
    
    // Insert at the beginning so the newest is first
    set({ metrics: [newMetric, ...metrics] });
  },
  
  removeMetric: (id) => {
    const { metrics } = get();
    set({ metrics: metrics.filter(m => m.id !== id) });
  },

  getLatestMetric: () => {
    const { metrics } = get();
    if (metrics.length === 0) return null;
    return metrics[0]; // Assuming array is sorted newest first
  }
}));
