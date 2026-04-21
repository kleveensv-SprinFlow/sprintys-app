import { useSprintyStore } from '../../../store/useSprintyStore';
import { mapMetricsToEmotion } from '../utils/emotionMapper';
import { UserMetrics } from '../types';

class SprintyManagerClass {
  // Met à jour l'émotion en fonction des métriques
  updateFromMetrics(metrics: UserMetrics) {
    const emotion = mapMetricsToEmotion(metrics);
    useSprintyStore.getState().setEmotion(emotion);
  }

  // Affiche un message temporaire avec une émotion spécifique
  triggerEvent(emotion: any, message: string, durationMs: number = 3000) {
    const store = useSprintyStore.getState();
    store.showSprinty(emotion, message);

    setTimeout(() => {
      // On retire le message après le délai, on garde l'avatar visible
      useSprintyStore.getState().setMessage(null);
    }, durationMs);
  }

  // Animations Lottie vs SVG (Logique à ajouter ici si besoin)
}

export const SprintyManager = new SprintyManagerClass();
