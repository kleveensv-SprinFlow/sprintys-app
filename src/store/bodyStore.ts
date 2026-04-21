import { create } from 'zustand';
import { BodyMetric } from '../features/body/types';
import { v4 as uuidv4 } from 'uuid';

interface BodyStoreState {
  metrics: BodyMetric[];
  
  // Actions
  addMetric: (weight: number, bodyFat?: number) => void;
  removeMetric: (id: string) => void;
}

export const useBodyStore = create<BodyStoreState>((set) => ({
  metrics: [],

  addMetric: (weight, bodyFat) => {
    const newMetric: BodyMetric = {
      id: uuidv4(),
      date: new Date().toISOString(),
      weight,
      bodyFat,
    };

    set((state) => ({
      metrics: [newMetric, ...state.metrics].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
  },

  removeMetric: (id) => {
    set((state) => ({
      metrics: state.metrics.filter((m) => m.id !== id),
    }));
  },
}));
