import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export type SprintyStatus = 'idle' | 'active' | 'success' | 'error' | 'warning' | 'rest' | 'info';

interface SprintyState {
  status: SprintyStatus;
  title: string | null;
  message: string | null;
  isVisible: boolean;

  // Actions
  setStatus: (status: SprintyStatus, message?: string | null) => void;
  showFeedback: (status: SprintyStatus, message: string, duration?: number, title?: string) => void;
  hide: () => void;
  reset: () => void;
}

const safe = (fn: () => Promise<void>) => {
  try {
    fn().catch(() => undefined);
  } catch {
    // haptics unavailable (web)
  }
};

// Only the latest toast may hide itself: an older timer must never close a newer message
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const clearHideTimer = () => {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
};

export const useSprintyStore = create<SprintyState>((set) => ({
  status: 'idle',
  title: null,
  message: null,
  isVisible: false,

  setStatus: (status, message = null) => {
    clearHideTimer();
    const isVisible = status !== 'idle' && status !== 'rest';
    if (isVisible) safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    set({ status, message, title: null, isVisible });
  },

  showFeedback: (status, message, duration = 3000, title) => {
    if (status === 'success') safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    else if (status === 'error') safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    else if (status === 'warning') safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    else safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

    clearHideTimer();
    set({ status, message, title: title ?? null, isVisible: true });

    if (duration > 0) {
      hideTimer = setTimeout(() => {
        hideTimer = null;
        set({ isVisible: false, status: 'idle', message: null, title: null });
      }, duration);
    }
  },

  hide: () => {
    clearHideTimer();
    set({ isVisible: false, status: 'idle', message: null, title: null });
  },

  reset: () => {
    clearHideTimer();
    set({ status: 'idle', message: null, title: null, isVisible: false });
  },
}));
