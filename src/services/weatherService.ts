export const weatherService = {
  fetchWeather: async () => {
    // Mocking weather fetch for now
    return {
      temp: 24,
      wind: 1.2,
      condition: 'Clear',
      description: 'Ciel dégagé'
    };
  }
};
