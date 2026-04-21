import { WeatherData, getWeatherCondition } from './weather';

export interface WeatherSuggestion {
  title: string;
  message: string;
  intensity: 'low' | 'medium' | 'high'; // impact on session
}

export const analyzeWeather = (data: WeatherData): WeatherSuggestion[] => {
  const suggestions: WeatherSuggestion[] = [];
  const { current } = data;
  const condition = getWeatherCondition(current.conditionCode);

  // Temperature analysis
  if (current.temp > 30) {
    suggestions.push({
      title: 'Heat Warning',
      message: 'High temperatures detected. Increase hydration and consider reducing intensity.',
      intensity: 'high',
    });
  } else if (current.temp < 5) {
    suggestions.push({
      title: 'Cold Weather',
      message: 'Low temperatures. Extend your warm-up and wear thermal layers.',
      intensity: 'medium',
    });
  }

  // Wind analysis
  if (current.windSpeed > 25) {
    suggestions.push({
      title: 'Strong Wind',
      message: 'Significant wind resistance. Expect tougher intervals on the track.',
      intensity: 'high',
    });
  } else if (current.windSpeed > 15) {
    suggestions.push({
      title: 'Moderate Wind',
      message: 'Noticeable breeze. Adjust your pacing expectations accordingly.',
      intensity: 'low',
    });
  }

  // Condition analysis
  if (condition === 'Rainy' || condition === 'Rain Showers') {
    suggestions.push({
      title: 'Wet Conditions',
      message: 'Slippery surface risk. Be careful with high-speed turns or plyometrics.',
      intensity: 'medium',
    });
  } else if (condition === 'Thunderstorm') {
    suggestions.push({
      title: 'Extreme Weather',
      message: 'Thunderstorms detected. Moving session indoors is highly recommended.',
      intensity: 'high',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Optimal Conditions',
      message: 'Perfect weather for a high-performance session. Go for it!',
      intensity: 'low',
    });
  }

  return suggestions;
};
