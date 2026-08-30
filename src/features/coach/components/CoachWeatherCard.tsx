import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Location from 'expo-location';
import { weatherService, WeatherData } from '../../../services/weatherService';
import { fetchOpenAIResponse } from '../../../services/aiService';

export const CoachWeatherCard = () => {
  const theme = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('Recherche...');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const data = await weatherService.fetchWeather(location.coords.latitude, location.coords.longitude);
        setWeather(data);
        
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode && geocode.length > 0) {
          setLocationName(geocode[0].city || geocode[0].region || 'Lieu inconnu');
        }
      } catch (error) {
        console.error("Error fetching weather", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleGenerateAdvice = async () => {
    if (!weather) return;
    setIsGenerating(true);
    try {
      const prompt = `Tu es l'assistant IA d'un entraǩneur d'athlǸtisme et prǸparation physique.
La mǸtǸo actuelle est de ${weather.temperature}C, condition: ${weather.condition}, vent: ${weather.windSpeed} km/h.
Donne un conseil trs court (2-3 phrases) sur comment le coach doit adapter sa sǸance d'entraǩnement aujourd'hui.`;
      
      const response = await fetchOpenAIResponse([{ role: 'user', content: prompt }], "Tu es un assistant météo pour coach sportif.");
      setAiAdvice(response);
    } catch (err) {
      setAiAdvice("Erreur de gǸnǸration. Essayez de privilǸgier un Ǹchauffement adaptǸ  la tempǸrature.");
    } finally {
      setIsGenerating(false);
    }
  };

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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={styles.cardHeaderTitle}>CONDITIONS D'ENTRAÎNEMENT</Text>
      
      <View style={styles.topRow}>
        <View style={styles.leftContent}>
          <Text style={[styles.temperature, { color: theme.colors.text }]}>
            {weather ? `${weather.temperature}°` : '--°'}
          </Text>
          <View style={styles.details}>
            <Text style={[styles.location, { color: theme.colors.textSecondary }]}>{locationName}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Feather name="wind" size={12} color={theme.colors.textMuted} />
              <Text style={[styles.statText, { color: theme.colors.textMuted, marginLeft: 4 }]}>
                {weather ? `${weather.windSpeed} km/h` : '--'}
              </Text>
            </View>
          </View>
        </View>
        <Feather name={getWeatherIcon(weather?.condition) as any} size={42} color={theme.colors.warning} />
      </View>

      {!aiAdvice && !isGenerating && (
        <TouchableOpacity 
          style={[styles.generateBtn, { backgroundColor: theme.colors.surfaceLight }]}
          onPress={handleGenerateAdvice}
        >
          <Feather name="cpu" size={16} color={theme.colors.accent} />
          <Text style={[styles.generateBtnText, { color: theme.colors.accent }]}>Générer un conseil IA pour la séance</Text>
        </TouchableOpacity>
      )}

      {isGenerating && (
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={{ color: theme.colors.textMuted, marginLeft: 8, fontSize: 12 }}>L'IA analyse les conditions...</Text>
        </View>
      )}

      {aiAdvice && !isGenerating && (
        <View style={[styles.adviceContainer, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
          <Feather name="info" size={16} color={theme.colors.accent} style={styles.adviceIcon} />
          <Text style={[styles.adviceText, { color: theme.colors.text }]}>
            {aiAdvice}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  temperature: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  details: {
    justifyContent: 'center',
  },
  location: {
    fontSize: 14,
    fontWeight: '600',
  },
  statText: {
    fontSize: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  generateBtnText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 13,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  adviceContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  adviceIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  }
});
