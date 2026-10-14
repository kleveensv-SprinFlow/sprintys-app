import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_VERSION } from '../features/onboarding/tourContent';

const keyFor = (userId: string) => `@sprintys_tour_seen_v${TOUR_VERSION}:${userId}`;

interface OnboardingState {
  visible: boolean;
  /** Current step of the guided tour. */
  step: number;
  setStep: (step: number) => void;
  /** Accounts already looked at in this session, so the automatic check runs once. */
  checkedFor: string | null;
  /** Automatic first showing: only if this account has never seen (or skipped) the tour. */
  checkAuto: (userId: string) => Promise<void>;
  /** Replay from the profile. Never changes the "seen" flag. */
  start: () => void;
  /** Skip or finish: remembers it for this account. */
  finish: (userId?: string | null) => Promise<void>;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  visible: false,
  step: 0,
  setStep: (step) => set({ step }),
  checkedFor: null,

  checkAuto: async (userId) => {
    if (get().checkedFor === userId) return;
    set({ checkedFor: userId });
    try {
      const seen = await AsyncStorage.getItem(keyFor(userId));
      if (!seen) set({ visible: true, step: 0 });
    } catch {
      // storage unavailable: don't nag
    }
  },

  start: () => set({ visible: true, step: 0 }),

  finish: async (userId) => {
    set({ visible: false, step: 0 });
    if (!userId) return;
    try {
      await AsyncStorage.setItem(keyFor(userId), String(Date.now()));
    } catch {
      // ignore
    }
  },

  reset: () => set({ visible: false, step: 0, checkedFor: null }),
}));
