import { create } from 'zustand';
import { SprintyState, SprintyEmotion } from '../features/sprinty/types';

interface SprintyStore extends SprintyState {
  showSprinty: (emotion?: SprintyEmotion, message?: string) => void;
  hideSprinty: () => void;
  setEmotion: (emotion: SprintyEmotion) => void;
  setMessage: (message: string | null) => void;
}

export const useSprintyStore = create<SprintyStore>((set) => ({
  isVisible: false,
  currentEmotion: 'neutral',
  message: null,

  showSprinty: (emotion = 'neutral', message = null) => 
    set({ isVisible: true, currentEmotion: emotion, message }),
    
  hideSprinty: () => set({ isVisible: false }),
  
  setEmotion: (emotion) => set({ currentEmotion: emotion }),
  
  setMessage: (message) => set({ message }),
}));
