export type SprintyEmotion = 'neutral' | 'focus' | 'content' | 'fatigue' | 'celebration' | 'perplexed' | 'caution';

export interface SprintyState {
  isVisible: boolean;
  currentEmotion: SprintyEmotion;
  message: string | null;
}

export interface UserMetrics {
  currentStreak: number;
  fatigueLevel: number; // 0 to 100
  isNewRecord: boolean;
  isIdle: boolean;
}
