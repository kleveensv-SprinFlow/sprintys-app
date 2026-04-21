export interface WeatherData {
  current: {
    temp: number;
    windSpeed: number;
    windDirection: number;
    conditionCode: number;
  };
  hourly: Array<{
    time: string;
    temp: number;
    conditionCode: number;
  }>;
}

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      current: {
        temp: data.current.temperature_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        conditionCode: data.current.weather_code,
      },
      hourly: data.hourly.time.slice(0, 24).map((time: string, index: number) => ({
        time,
        temp: data.hourly.temperature_2m[index],
        conditionCode: data.hourly.weather_code[index],
      })),
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

export const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};
