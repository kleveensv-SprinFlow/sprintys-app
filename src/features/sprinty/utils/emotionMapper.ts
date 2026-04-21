import { SprintyEmotion, UserMetrics } from '../types';

export const mapMetricsToEmotion = (metrics: UserMetrics): SprintyEmotion => {
  if (metrics.isNewRecord) {
    return 'celebration'; // Succès
  }

  if (metrics.fatigueLevel > 80) {
    return 'fatigue'; // Sommeil / fatigué
  }

  if (metrics.fatigueLevel > 60) {
    return 'caution'; // Attention
  }

  if (metrics.currentStreak > 3) {
    return 'focus'; // Focus / motivé
  }

  if (metrics.isIdle) {
    return 'neutral'; // En attente / idle
  }

  return 'content'; // Content par défaut
};
