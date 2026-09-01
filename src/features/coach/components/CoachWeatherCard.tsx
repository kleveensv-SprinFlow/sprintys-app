import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView } from 'react-native';
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
  
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationName('Accès refusé');
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
          setLocationName(geocode[0].city || geocode[0].region || 'Position actuelle');
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        setLocationName('Erreur météo');
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
        style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        activeOpacity={0.8}
        onPress={() => setIsModalVisible(true)}
      >
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
      </TouchableOpacity>

      {/* Modal Météo détaillée */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Météo Détaillée</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
              <View style={styles.modalHero}>
                <Feather name={getWeatherIcon(weather?.condition) as any} size={64} color={theme.colors.warning} />
                <Text style={[styles.modalTemp, { color: theme.colors.text }]}>{weather ? `${weather.temperature}°C` : '--'}</Text>
                <Text style={[styles.modalLoc, { color: theme.colors.textSecondary }]}>{locationName}</Text>
                <Text style={[styles.modalCondition, { color: theme.colors.textMuted }]}>{weather?.condition || 'Inconnu'}</Text>
              </View>

              <View style={styles.modalStatsGrid}>
                <View style={[styles.modalStatCard, { backgroundColor: theme.colors.background }]}>
                  <Feather name="wind" size={24} color={theme.colors.accent} />
                  <Text style={[styles.modalStatValue, { color: theme.colors.text }]}>{weather?.windSpeed || '--'} km/h</Text>
                  <Text style={styles.modalStatLabel}>Vent</Text>
                </View>

              </View>
              
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>PRÉVISIONS HORAIRES</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, gap: 12 }}>
                  {weather?.hourly ? weather.hourly.map((h, i) => (
                    <View key={i} style={[styles.hourlyCard, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.hourlyTime, { color: theme.colors.textSecondary }]}>{h.time}</Text>
                      <Feather name={getWeatherIcon(h.condition) as any} size={24} color={theme.colors.text} style={{ marginVertical: 8 }} />
                      <Text style={[styles.hourlyTemp, { color: theme.colors.text }]}>{h.temperature}°</Text>
                    </View>
                  )) : (
                    <Text style={{ color: theme.colors.textMuted }}>Aucune donnée horaire disponible.</Text>
                  )}
                </ScrollView>
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>
    </>
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  modalTemp: {
    fontSize: 56,
    fontWeight: '800',
    marginTop: 12,
  },
  modalLoc: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  modalCondition: {
    fontSize: 14,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  modalStatCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  aiSection: {
    marginTop: 8,
  },
  aiSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  hourlyCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: 70,
  },
  hourlyTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
