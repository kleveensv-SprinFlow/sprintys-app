import { create } from 'zustand';
import { Profile, BodyMetric } from '../features/body/types';
import { bodyService } from '../services/bodyService';

interface BodyState {
  profile: Profile | null;
  metrics: BodyMetric[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: Profile) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  addMetric: (metric: BodyMetric) => Promise<void>;
  fetchMetrics: (userId: string) => Promise<void>;
}

export const useBodyStore = create<BodyState>((set) => ({
  profile: null,
  metrics: [],
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await bodyService.fetchProfile(userId);
      set({ profile: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateProfile: async (userId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProfile = await bodyService.updateProfile(userId, updates);
      set({ profile: updatedProfile, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  addMetric: async (metric) => {
    set({ isLoading: true, error: null });
    try {
      const newMetric = await bodyService.addBodyMetric(metric);
      set((state) => ({ 
        metrics: [newMetric, ...state.metrics],
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMetrics: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const metrics = await bodyService.getBodyMetrics(userId);
      set({ metrics, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));

export default useBodyStore;
