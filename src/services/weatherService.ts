export const weatherService = {
  fetchWeather: async () => {
    // Mocking technical weather data for athletes
    return {
      temp: 24,
      condition: 'Ensoleillé',
      windSpeed: 2.1,
      windDirection: 'NE',
      description: 'Conditions optimales'
    };
  }
};
