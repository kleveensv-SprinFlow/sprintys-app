import { create } from 'zustand';
import { weatherService, WeatherData } from '../services/weatherService';
import { weatherAdviceService } from '../services/weatherAdviceService';
import { useSprintyStore } from './sprintyStore';
import * as Location from 'expo-location';

interface WeatherState {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateWeather: () => Promise<void>;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useWeatherStore = create<WeatherState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,

  updateWeather: async () => {
    const { data } = get();
    
    // Check cache
    if (data && (Date.now() - data.timestamp < CACHE_DURATION)) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // 1. Request Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ error: 'Permission denied', isLoading: false });
        return;
      }

      // 2. Get Location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 3. Fetch Weather
      const weatherData = await weatherService.fetchWeather(latitude, longitude);
      set({ data: weatherData, isLoading: false });

      // Trigger Predictive Weather Coaching
      const advices = weatherAdviceService.getAdvice(weatherData);
      if (advices.length > 0) {
        const { showFeedback } = useSprintyStore.getState();
        // Use 'info' status for weather coaching
        showFeedback('info', advices[0].message, 6000);
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
