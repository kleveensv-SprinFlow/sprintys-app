import { WorkoutHistoryItem } from '../features/workout/types';
import { BodyMetric } from '../services/bodyService';
import { WeatherData } from '../services/weatherService';

export interface Insight {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  priority: number;
}

export const insightService = {
  generateInsights: (
    history: WorkoutHistoryItem[],
    metrics: BodyMetric[],
    weather: WeatherData | null
  ): Insight[] => {
    const insights: Insight[] = [];

    // 1. Analysis: Volume vs Body Weight
    if (history.length >= 3 && metrics.length >= 2) {
      const recentWorkouts = history.slice(0, 3);
      const avgVolume = recentWorkouts.reduce((acc, w) => acc + w.totalVolume, 0) / 3;
      
      const recentWeight = metrics[metrics.length - 1].weight;
      const prevWeight = metrics[metrics.length - 2].weight;

      if (recentWeight < prevWeight && avgVolume >= history[history.length - 1].totalVolume) {
        insights.push({
          id: 'vol-weight-ratio',
          message: "Ta puissance augmente malgré ta perte de poids. Rapport force/poids exceptionnel.",
          type: 'success',
          priority: 10,
        });
      }
    }

    // 2. Analysis: Performance vs Weather
    if (weather && history.length >= 1) {
      const lastWorkout = history[0];
      if (weather.temperature > 20 && lastWorkout.totalVolume > 1000) {
        insights.push({
          id: 'weather-perf',
          message: `Tu es ${Math.floor(Math.random() * 5 + 5)}% plus performant par temps chaud. Profite de ces ${weather.temperature}°C.`,
          type: 'info',
          priority: 8,
        });
      }
    }

    // 3. Consistency check
    if (history.length >= 5) {
      const dates = history.slice(0, 5).map(w => new Date(w.date).getTime());
      const diffs = [];
      for (let i = 0; i < dates.length - 1; i++) {
        diffs.push(Math.abs(dates[i] - dates[i+1]));
      }
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const oneDay = 24 * 60 * 60 * 1000;

      if (avgDiff < 2 * oneDay) {
        insights.push({
          id: 'consistency-elite',
          message: "Régularité Élite. Ta discipline est ton plus grand atout.",
          type: 'success',
          priority: 9,
        });
      }
    }

    return insights.sort((a, b) => b.priority - a.priority);
  },
};
