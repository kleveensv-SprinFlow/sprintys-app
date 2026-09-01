export interface WeatherData {
  temperature: number;
  windSpeed: number;
  condition: string;
  timestamp: number;
  hourly?: {
    datetime: string;
    time: string;
    date: string;
    temperature: number;
    condition: string;
  }[];
  daily?: {
    date: string;
    displayDay: string;
    tempMax: number;
    tempMin: number;
    condition: string;
  }[];
}

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const weatherService = {
  fetchWeather: async (lat: number, lon: number): Promise<WeatherData> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;
    
    const hourly = [];
    if (data.hourly && data.hourly.time) {
      for (let i = 0; i < data.hourly.time.length; i++) {
        const datetimeStr = data.hourly.time[i];
        const [dateStr, timeStr] = datetimeStr.split('T');
        hourly.push({
          datetime: datetimeStr,
          time: timeStr || '--:--',
          date: dateStr,
          temperature: Math.round(data.hourly.temperature_2m[i]),
          condition: getWeatherCondition(data.hourly.weather_code[i])
        });
      }
    }

    const daily = [];
    if (data.daily && data.daily.time) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (let i = 0; i < data.daily.time.length; i++) {
        const dateStr = data.daily.time[i];
        const d = new Date(dateStr);
        d.setHours(0,0,0,0);
        
        let displayDay = DAYS_FR[d.getDay()];
        if (d.getTime() === today.getTime()) displayDay = "Aujourd'hui";
        else if (d.getTime() === tomorrow.getTime()) displayDay = "Demain";

        daily.push({
          date: dateStr,
          displayDay,
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          condition: getWeatherCondition(data.daily.weather_code[i])
        });
      }
    }
    
    return {
      temperature: Math.round(current.temperature_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      condition: getWeatherCondition(current.weather_code),
      timestamp: Date.now(),
      hourly,
      daily,
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
