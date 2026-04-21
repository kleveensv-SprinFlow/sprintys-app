import { WeatherData } from './weatherService';

export interface WeatherAdvice {
  id: string;
  message: string;
  priority: number;
}

export const weatherAdviceService = {
  getAdvice: (weather: WeatherData): WeatherAdvice[] => {
    const advices: WeatherAdvice[] = [];
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;

    // 1. Temperature Analysis
    if (weather.temperature < 5) {
      advices.push({
        id: 'thermal-layer',
        message: "Conditions critiques (<5°C) : Couches thermiques compressives et gants techniques indispensables pour maintenir la thermorégulation périphérique.",
        priority: 10,
      });
    } else if (weather.temperature < 12) {
      advices.push({
        id: 'mid-layer',
        message: "Fraîcheur détectée : Opte pour un textile respirant à manches longues pour éviter le refroidissement musculaire post-effort.",
        priority: 7,
      });
    } else if (weather.temperature > 28) {
      advices.push({
        id: 'heat-safety',
        message: "Stress thermique élevé : Augmentation du ratio d'hydratation (électrolytes) requise. Attention à la dérive cardiaque.",
        priority: 9,
      });
    }

    // 2. Wind Analysis
    if (weather.windSpeed > 25) {
      advices.push({
        id: 'wind-breaker',
        message: `Vent soutenu (${weather.windSpeed} km/h) : Coupe-vent technique requis pour optimiser l'aérodynamisme et prévenir l'effet de convection thermique.`,
        priority: 8,
      });
    }

    // 3. Time / Visibility Analysis
    if (isNight) {
      advices.push({
        id: 'night-safety',
        message: "Session nocturne : Textile à haute visibilité et bandes réfléchissantes obligatoires pour la sécurité périmétrique.",
        priority: 10,
      });
    } else if (hour < 9) {
      advices.push({
        id: 'morning-routine',
        message: "Éveil musculaire matinal : Temps d'échauffement dynamique prolongé (+5 min) pour optimiser la viscosité synoviale.",
        priority: 6,
      });
    }

    return advices.sort((a, b) => b.priority - a.priority);
  },
};
