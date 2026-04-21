import { create } from 'zustand';

export type SprintyStatus = 'idle' | 'active' | 'success' | 'error' | 'warning' | 'rest';

interface SprintyState {
  status: SprintyStatus;
  message: string | null;
  isVisible: boolean;
  
  // Actions
  setStatus: (status: SprintyStatus, message?: string | null) => void;
  showFeedback: (status: SprintyStatus, message: string, duration?: number) => void;
  hide: () => void;
  reset: () => void;
}

export const useSprintyStore = create<SprintyState>((set) => ({
  status: 'idle',
  message: null,
  isVisible: false,

  setStatus: (status, message = null) => {
    const isVisible = status !== 'idle' && status !== 'rest';
    set({ status, message, isVisible });
  },

  showFeedback: (status, message, duration = 3000) => {
    set({ status, message, isVisible: true });
    
    if (duration > 0) {
      setTimeout(() => {
        set({ isVisible: false, status: 'idle', message: null });
      }, duration);
    }
  },

  hide: () => set({ isVisible: false }),
  
  reset: () => set({ status: 'idle', message: null, isVisible: false }),
}));
