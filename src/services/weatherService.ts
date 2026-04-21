export interface WeatherData {
  temperature: number;
  windSpeed: number;
  condition: string;
  timestamp: number;
}

export const weatherService = {
  fetchWeather: async (lat: number, lon: number): Promise<WeatherData> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;
    
    return {
      temperature: Math.round(current.temperature_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      condition: getWeatherCondition(current.weather_code),
      timestamp: Date.now(),
    };
  },
};

function getWeatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'foggy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 95) return 'stormy';
  return 'clear';
}
