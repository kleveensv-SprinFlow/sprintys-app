import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Location from 'expo-location';
import { weatherService, WeatherData } from '../../../services/weatherService';
import { weatherAdviceService, WeatherAdvice } from '../../../services/weatherAdviceService';
import { WeatherHubModal } from '../../weather/components/WeatherHubModal';
import { TouchableOpacity } from 'react-native';

export const AthleteWeatherCard = () => {
  const theme = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState<WeatherAdvice | null>(null);
  const [locationName, setLocationName] = useState<string>('Recherche...');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission GPS refusée');
          setIsLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;

        // Récupérer le nom de la ville
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geocode.length > 0) {
          setLocationName(geocode[0].city || geocode[0].region || 'Position actuelle');
        } else {
          setLocationName('Position actuelle');
        }

        // Fetch météo
        const weatherData = await weatherService.fetchWeather(lat, lon);
        setWeather(weatherData);

        // Fetch conseil
        const coachingAdvice = weatherAdviceService.getCoachingAdvice(weatherData);
        setAdvice(coachingAdvice);
        
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Erreur météo');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const getWeatherIcon = (condition?: string) => {
    switch (condition) {
      case 'clear': return 'sun';
      case 'cloudy': return 'cloud';
      case 'foggy': return 'align-justify';
      case 'rainy':
      case 'showers': return 'cloud-rain';
      case 'snowy': return 'cloud-snow';
      case 'stormy': return 'cloud-lightning';
      default: return 'sun';
    }
  };

  const getWeatherLabel = (condition?: string) => {
    switch (condition) {
      case 'clear': return 'Dégagé';
      case 'cloudy': return 'Nuageux';
      case 'foggy': return 'Brouillard';
      case 'rainy': return 'Pluvieux';
      case 'showers': return 'Averses';
      case 'snowy': return 'Neigeux';
      case 'stormy': return 'Orageux';
      default: return '-';
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <View style={styles.topRow}>
          <View style={styles.leftContent}>
            <Text style={[styles.temperature, { color: theme.colors.text }]}>
              {weather ? `${weather.temperature}°` : '--°'}
            </Text>
            <View style={styles.details}>
              <Text style={[styles.condition, { color: theme.colors.text }]}>
                {weather ? getWeatherLabel(weather.condition) : errorMsg}
              </Text>
              <Text style={[styles.location, { color: theme.colors.textSecondary }]}>{locationName}</Text>
            </View>
          </View>
          
          <View style={styles.iconContainer}>
            <Feather name={getWeatherIcon(weather?.condition) as any} size={48} color={theme.colors.warning} />
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Feather name="wind" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {weather ? `${weather.windSpeed} km/h` : '--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Advice Section */}
        {advice && (
          <View style={[styles.adviceContainer, { backgroundColor: theme.colors.background }]}>
            <Feather name="info" size={16} color={theme.colors.accent} style={styles.adviceIcon} />
            <Text style={[styles.adviceText, { color: theme.colors.textSecondary }]}>
              Conseils IA dispos. Clique pour ouvrir le Hub Météo ✨
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <WeatherHubModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        currentWeather={weather} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 96,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  details: {
    justifyContent: 'center',
  },
  condition: {
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    position: 'absolute',
    right: '35%',
    opacity: 0.8,
  },
  statsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  adviceContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  adviceIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  }
});
