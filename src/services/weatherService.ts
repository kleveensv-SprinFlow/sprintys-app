export const weatherService = {
  fetchWeather: async (coords?: { latitude: number; longitude: number } | string) => {
    // Mocking technical weather data for athletes based on location
    // In a real app, we would call an API like OpenWeatherMap here
    const isParis = typeof coords === 'string' && coords.toLowerCase().includes('paris');
    
    return {
      location: typeof coords === 'string' ? coords : 'Ma Position',
      temp: isParis ? 18 : 24,
      condition: isParis ? 'Nuageux' : 'Ensoleillé',
      windSpeed: isParis ? 4.5 : 2.1,
      windDirection: 'NE',
      humidity: 65,
      description: 'Conditions optimales'
    };
  },

  getCoachingAdvice: (weather: any) => {
    const { temp, windSpeed, condition } = weather;
    let advice = {
      clothes: "Tenue standard : Short et débardeur/t-shirt technique.",
      warmup: "Échauffement classique : 15 min de footing + gammes.",
      sprintyState: 'happy'
    };

    // Scénarios de Température
    if (temp < 10) {
      advice.clothes = "FROID INTENSE : Collant long, haut thermique et coupe-vent. Garde tes vêtements jusqu'au dernier moment.";
      advice.warmup = "ÉCHAUFFEMENT LONG : 25 min de réveil musculaire. Utilise de l'huile chauffante sur les ischios.";
      advice.sprintyState = 'cold';
    } else if (temp < 18) {
      advice.clothes = "FRAIS : T-shirt manches longues et cuissard. Prévois un pull pour les récupérations.";
      advice.warmup = "ÉCHAUFFEMENT MODÉRÉ : 20 min. Sois progressif sur les premières accélérations.";
      advice.sprintyState = 'neutral';
    } else if (temp > 30) {
      advice.clothes = "CANICULE : Tenue ultra-légère. Casquette obligatoire. Prévois une serviette humide pour la nuque.";
      advice.warmup = "ÉCHAUFFEMENT COURT : Ne surchauffe pas. 10-12 min suffisent, privilégie l'ombre.";
      advice.sprintyState = 'hot';
    }

    // Scénarios de Vent
    if (windSpeed > 5) {
      advice.warmup += "\nVENT FORT : Fais tes gammes face au vent pour bien monter en température.";
      if (temp < 15) advice.clothes = "VENT & FRAIS : Le ressenti sera bien plus bas. Coupe-vent indispensable.";
    }

    // Scénarios de Pluie / Humidité
    if (condition.toLowerCase().includes('pluie') || condition.toLowerCase().includes('nuageux')) {
      advice.clothes += "\nPLUIE : Veste imperméable et chaussettes de rechange dans le sac.";
      advice.warmup += "\nSOL GLISSANT : Attention aux appuis en virage. Vérifie tes pointes (6mm min).";
    }

    return advice;
  }
};
