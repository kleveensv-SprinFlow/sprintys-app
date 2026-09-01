export interface WeatherData {
  temperature: number;
  windSpeed: number;
  condition: string;
  timestamp: number;
  hourly?: {
    time: string;
    temperature: number;
    condition: string;
  }[];
}

export const weatherService = {
  fetchWeather: async (lat: number, lon: number): Promise<WeatherData> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;
    
    const hourly = [];
    if (data.hourly && data.hourly.time) {
      // Safely find the current hour index without relying on timezone/Date objects
      const nowString = new Date().toISOString().substring(0, 14) + "00"; // roughly "YYYY-MM-DDTHH:00"
      let nowIdx = data.hourly.time.findIndex((t: string) => t >= nowString);
      if (nowIdx === -1) nowIdx = 0;
      
      const startIndex = nowIdx > 0 ? nowIdx - 1 : 0;
      for (let i = startIndex; i < startIndex + 12 && i < data.hourly.time.length; i++) {
        // Extract time directly from string "YYYY-MM-DDTHH:mm" -> "HH:mm"
        const timeString = data.hourly.time[i].split('T')[1] || '--:--';
        hourly.push({
          time: timeString,
          temperature: Math.round(data.hourly.temperature_2m[i]),
          condition: getWeatherCondition(data.hourly.weather_code[i])
        });
      }
    }
    
    return {
      temperature: Math.round(current.temperature_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      condition: getWeatherCondition(current.weather_code),
      timestamp: Date.now(),
      hourly,
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
