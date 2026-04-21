import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export type SprintyStatus = 'idle' | 'active' | 'success' | 'error' | 'warning' | 'rest' | 'info';

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
    if (isVisible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    set({ status, message, isVisible });
  },

  showFeedback: (status, message, duration = 3000) => {
    if (status === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (status === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

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
