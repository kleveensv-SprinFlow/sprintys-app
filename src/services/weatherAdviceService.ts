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
        message: "Froid extrême (<5°C) : Collant long, couches thermiques, et gants. Allonge ton échauffement de +10 à 15 min. Reste couvert entre tes séries.",
        priority: 10,
      });
    } else if (weather.temperature < 15) {
      advices.push({
        id: 'mid-layer',
        message: `Frais (${weather.temperature}°C) : Prévois un haut à manches longues et un bas de survêtement pour l'échauffement (+5 min recommandées).`,
        priority: 7,
      });
    } else if (weather.temperature > 28) {
      advices.push({
        id: 'heat-safety',
        message: "Forte chaleur : Hydratation maximale (électrolytes). Privilégie l'ombre sur les recups. Risque de dérive cardiaque accru.",
        priority: 9,
      });
    }

    // 2. Conditions & Rain Analysis
    if (weather.condition === 'rainy' || weather.condition === 'showers' || weather.condition === 'stormy') {
      advices.push({
        id: 'rain-spikes',
        message: "Piste mouillée : Attention aux appuis fuyants en virage. Opte pour des pointes de 9mm si tu fais du sprint, ou garde tes baskets si l'eau stagne.",
        priority: 9,
      });
    }

    // 3. Wind Analysis
    if (weather.windSpeed > 25) {
      advices.push({
        id: 'wind-breaker',
        message: `Vent fort (${weather.windSpeed} km/h) : Coupe-vent indispensable. Demande au coach d'inverser le sens de la ligne droite si c'est de face.`,
        priority: 8,
      });
    }

    // 4. Time Analysis
    if (isNight) {
      advices.push({
        id: 'night-safety',
        message: "Session de nuit : Sois prudent sur les obstacles (cônes, haies). L'obscurité altère l'appréciation des distances.",
        priority: 6,
      });
    }

    return advices.sort((a, b) => b.priority - a.priority);
  },

  getCoachingAdvice: (weather: WeatherData): WeatherAdvice => {
    const advices = weatherAdviceService.getAdvice(weather);
    return advices[0] || {
      id: 'standard',
      message: "Conditions optimales. Prêt pour une performance Élite.",
      priority: 0,
    };
  },

  generateAIAdvice: async (weather: WeatherData, timeString: string): Promise<any> => {
    // Import aiService dynamically to avoid circular dependencies if any
    const { fetchOpenAIResponse } = require('./aiService');
    
    const systemPrompt = `Tu es un coach sportif IA spécialisé en athlétisme (sprint). 
L'athlète s'entraîne à ${timeString}. 
La météo à cette heure sera : ${weather.temperature}°C, Vent: ${weather.windSpeed}km/h, Condition: ${weather.condition}.

Analyse ces conditions météo et donne tes recommandations.
Tu DOIS renvoyer ta réponse sous forme de JSON exact avec la structure suivante :
{
  "tenue": "Explication courte pour la tenue",
  "echauffement": "Explication courte pour l'échauffement",
  "hydratation": "Explication courte pour l'hydratation",
  "terrain": "Explication courte pour le terrain/piste"
}`;

    const messages = [{ role: 'user', content: 'Génère la stratégie météo pour ma séance.' }];
    
    try {
      const response = await fetchOpenAIResponse(messages, systemPrompt);
      // The response might be wrapped in markdown code blocks
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (e) {
      console.error("AI Weather Error", e);
      throw e;
    }
  }
};
