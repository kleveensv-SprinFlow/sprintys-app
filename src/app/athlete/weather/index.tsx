import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { fetchWeather, WeatherData, getWeatherCondition } from '../../../utils/weather';
import { analyzeWeather, WeatherSuggestion } from '../../../utils/weatherBrain';
import { HourlyForecastList } from '../../../components/weather/HourlyForecastList';
import { WindVisualizer } from '../../../components/weather/WindVisualizer';
import { LocationSelector } from '../../../components/weather/LocationSelector';

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [suggestions, setSuggestions] = useState<WeatherSuggestion[]>([]);
  const [location, setLocation] = useState({ name: 'Paris', lat: 48.8566, lon: 2.3522 });
  const [refreshing, setRefreshing] = useState(false);

  const loadWeather = async () => {
    try {
      const data = await fetchWeather(location.lat, location.lon);
      setWeatherData(data);
      setSuggestions(analyzeWeather(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWeather();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff4444" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff4444" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weather Intelligence</Text>
        <LocationSelector currentLocation={location} onSelect={setLocation} />
      </View>

      {weatherData && (
        <View style={styles.content}>
          <View style={styles.currentCard}>
            <Text style={styles.currentTemp}>{Math.round(weatherData.current.temp)}°C</Text>
            <Text style={styles.currentCondition}>{getWeatherCondition(weatherData.current.conditionCode)}</Text>
          </View>

          <WindVisualizer speed={weatherData.current.windSpeed} direction={weatherData.current.windDirection} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Impact</Text>
            {suggestions.map((s, i) => (
              <View key={i} style={[styles.suggestionCard, styles[`impact_${s.intensity}`]]}>
                <Text style={styles.suggestionTitle}>{s.title}</Text>
                <Text style={styles.suggestionMessage}>{s.message}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>24h Forecast</Text>
            <HourlyForecastList data={weatherData.hourly} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    backgroundColor: '#111',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  currentCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentTemp: {
    color: '#fff',
    fontSize: 64,
    fontWeight: 'bold',
  },
  currentCondition: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '500',
    marginTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  suggestionMessage: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  impact_low: {
    backgroundColor: '#1a1a1a',
    borderLeftColor: '#4CAF50',
  },
  impact_medium: {
    backgroundColor: '#1a1a1a',
    borderLeftColor: '#FF9800',
  },
  impact_high: {
    backgroundColor: '#1a1a1a',
    borderLeftColor: '#f44336',
  },
});
