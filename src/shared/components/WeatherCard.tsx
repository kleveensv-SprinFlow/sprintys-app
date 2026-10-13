import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Dimensions, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Location from 'expo-location';
import { weatherService, WeatherData } from '../../services/weatherService';
import { PressableScale } from './PressableScale';
import { dashboardCard, glassCard, DashboardCardHeader } from './DashboardCard';

const WEATHER_TINT = '#0284C7';

export const WeatherCard = ({ variant = 'solid' }: { variant?: 'solid' | 'glass' }) => {
  const theme = useTheme();
  const cardStyle = variant === 'glass' ? glassCard : dashboardCard;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('Recherche...');
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<'denied' | 'error' | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const getThermalBackgroundColor = (temp: number) => {
    if (temp < 10) return 'rgba(59, 130, 246, 0.15)'; // Cold Blue
    if (temp < 19) return 'rgba(16, 185, 129, 0.15)'; // Mild Green
    if (temp < 26) return 'rgba(245, 158, 11, 0.15)'; // Warm Orange
    return 'rgba(239, 68, 68, 0.15)'; // Hot Red
  };

  const getWeatherIconColor = (condition?: string) => {
    switch (condition) {
      case 'clear': return '#FACC15'; // Yellow
      case 'cloudy':
      case 'foggy': return '#94A3B8'; // Slate Gray
      case 'rainy':
      case 'showers': return '#38BDF8'; // Sky Blue
      case 'snowy': return '#E0F2FE'; // Light Ice
      case 'stormy': return '#A855F7'; // Purple
      default: return '#FACC15';
    }
  };

  const loadWeather = async () => {
    setIsLoading(true);
    setFailure(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Accès refusé');
        setFailure('denied');
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
      setFailure('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
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
      <View style={[cardStyle, styles.container, styles.loading]}>
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
      </View>
    );
  }

  const getFilteredHourly = () => {
    if (!weather?.hourly) return [];
    if (!selectedDate) {
      // Return next 24 hours from now
      const nowString = new Date().toISOString().substring(0, 14) + "00";
      let nowIdx = weather.hourly.findIndex(h => h.datetime >= nowString);
      if (nowIdx === -1) nowIdx = 0;
      return weather.hourly.slice(nowIdx, nowIdx + 24);
    } else {
      // Return all 24 hours of selected date
      return weather.hourly.filter(h => h.date === selectedDate);
    }
  };

  const displayHourly = getFilteredHourly();

  // No data: the card becomes a way to fix it instead of a dead "--°"
  if (!weather) {
    const denied = failure === 'denied';
    return (
      <PressableScale
        style={[cardStyle, styles.container]}
        onPress={async () => {
          if (denied) {
            // Coming back from the OS settings with access granted: just reload
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
              Linking.openSettings();
              return;
            }
          }
          loadWeather();
        }}
      >
        <DashboardCardHeader
          icon={<Feather name="map-pin" size={15} color={WEATHER_TINT} />}
          label="Météo"
          tint={WEATHER_TINT}
        />
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.location, { color: theme.colors.text }]}>
              {denied ? 'Météo indisponible' : 'Impossible de charger la météo'}
            </Text>
            <Text style={[styles.statText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {denied ? 'Autorise la localisation pour voir vent et pluie sur ta piste.' : 'Vérifie ta connexion.'}
            </Text>
            <Text style={[styles.statText, { color: theme.colors.sprintyBlue, fontWeight: '700', marginTop: 8 }]}>
              {denied ? 'Activer la localisation' : 'Réessayer'}
            </Text>
          </View>
          <Feather name={denied ? 'navigation' : 'refresh-cw'} size={26} color={theme.colors.textMuted} />
        </View>
      </PressableScale>
    );
  }

  return (
    <>
      <PressableScale style={[cardStyle, styles.container]} onPress={() => setIsModalVisible(true)}>
        <DashboardCardHeader
          icon={<Feather name={getWeatherIcon(weather.condition) as any} size={15} color={WEATHER_TINT} />}
          label="Météo"
          tint={WEATHER_TINT}
          meta={locationName}
        />

        <View style={styles.topRow}>
          <View style={styles.leftContent}>
            <Text style={[styles.temperature, { color: theme.colors.text }]}>{`${weather.temperature}°`}</Text>
            <View style={styles.details}>
              <Text style={[styles.location, { color: theme.colors.text }]} numberOfLines={1}>
                {weather.conditionLabel || 'Dégagé'}
              </Text>
              <Text style={[styles.statText, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                {`Vent ${weather.windSpeed} km/h · ${weather.precipitation && weather.precipitation > 0 ? 'piste humide' : 'piste sèche'}`}
              </Text>
            </View>
          </View>
          <Feather name={getWeatherIcon(weather.condition) as any} size={34} color={getWeatherIconColor(weather.condition)} />
        </View>
      </PressableScale>

      {/* Modal Météo Détaillée */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Météo Détaillée</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
              {/* Hero Météo Pro & Compact */}
              <View style={styles.modalHero}>
                <Feather name={getWeatherIcon(weather?.condition) as any} size={52} color={theme.colors.warning} />
                <Text style={[styles.modalTemp, { color: theme.colors.text }]}>{weather ? `${weather.temperature}°C` : '--'}</Text>
                <Text style={[styles.modalLoc, { color: theme.colors.textSecondary }]}>{locationName}</Text>
                <View style={styles.conditionPill}>
                  <Text style={[styles.modalConditionText, { color: theme.colors.text }]}>
                    {weather?.conditionLabel || 'Dégagé'}
                  </Text>
                </View>
              </View>

              {/* 3 Indicateurs Clés pour l'Entraînement Sprint */}
              <View style={styles.modalStatsRow}>
                {/* 1. Vent (km/h + orientation cardinale) */}
                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="wind" size={16} color="#0069E8" />
                  </View>
                  <Text style={styles.metricValue}>
                    {weather?.windSpeed || '--'} <Text style={styles.metricUnit}>km/h</Text>
                  </Text>
                  <Text style={styles.metricSub}>
                    {weather?.windDirection ? `Cap ${weather.windDirection}` : 'Vent'}
                  </Text>
                </View>

                {/* 2. Précipitations (Pluie / Piste) */}
                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="cloud-rain" size={16} color="#0284C7" />
                  </View>
                  <Text style={styles.metricValue}>
                    {weather?.precipitation != null ? `${weather.precipitation}` : '0'} <Text style={styles.metricUnit}>mm</Text>
                  </Text>
                  <Text style={styles.metricSub}>
                    {weather?.precipitation && weather.precipitation > 0 ? 'Piste humide' : 'Piste sèche'}
                  </Text>
                </View>

                {/* 3. Coucher du soleil */}
                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="sunset" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.metricValue}>
                    {weather?.sunset || '--:--'}
                  </Text>
                  <Text style={styles.metricSub}>Coucher</Text>
                </View>
              </View>

              {/* Prévisions horaires épurées */}
              <View style={styles.aiSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.aiSectionTitle}>PRÉVISIONS HORAIRES (24H)</Text>
                  {selectedDate && (
                    <TouchableOpacity onPress={() => setSelectedDate(null)}>
                      <Text style={{ fontSize: 12, color: '#0069E8', fontWeight: '700' }}>Réinitialiser</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 10 }}>
                  {displayHourly.length > 0 ? displayHourly.map((h, i) => (
                    <View key={i} style={styles.hourlyCard}>
                      <Text style={styles.hourlyTime}>{h.time}</Text>
                      <Feather name={getWeatherIcon(h.condition) as any} size={22} color={getWeatherIconColor(h.condition)} style={{ marginVertical: 8 }} />
                      <Text style={styles.hourlyTemp}>{h.temperature}°</Text>
                    </View>
                  )) : (
                    <Text style={{ color: theme.colors.textMuted }}>Aucune donnée horaire disponible.</Text>
                  )}
                </ScrollView>
              </View>

              <View style={{ marginTop: 24 }}>
                <Text style={styles.aiSectionTitle}>LES 7 PROCHAINS JOURS</Text>
                <View style={{ marginTop: 8 }}>
                  {weather?.daily?.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={() => setSelectedDate(d.date)}
                      style={[styles.dailyCard, selectedDate === d.date && { borderColor: theme.colors.accent, borderWidth: 1 }]}
                    >
                      <Text style={[styles.dailyDay, { color: theme.colors.text }]}>{d.displayDay}</Text>
                      <Feather name={getWeatherIcon(d.condition) as any} size={20} color={getWeatherIconColor(d.condition)} style={{ width: 40, textAlign: 'center' }} />
                      <View style={styles.dailyTemps}>
                        <Text style={[styles.dailyMin, { color: theme.colors.textSecondary }]}>{d.tempMin}°</Text>
                        <View style={styles.dailyBar} />
                        <Text style={[styles.dailyMax, { color: theme.colors.text }]}>{d.tempMax}°</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
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
    marginHorizontal: 0,
    marginVertical: 6,
  },
  loading: {
    minHeight: 96,
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
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
    gap: 14,
    flex: 1,
    marginRight: 12,
  },
  temperature: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  details: {
    justifyContent: 'center',
    flexShrink: 1,
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
    marginBottom: 20,
    paddingTop: 8,
  },
  modalTemp: {
    fontSize: 48,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: -1,
  },
  modalLoc: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  conditionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  modalConditionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  modalMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  aiSection: {
    marginTop: 4,
  },
  aiSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hourlyCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    width: 68,
    backgroundColor: '#F8FAFC',
  },
  hourlyTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  hourlyTemp: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  dailyDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  dailyTemps: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  dailyMin: {
    fontSize: 15,
    fontWeight: '600',
  },
  dailyMax: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dailyBar: {
    height: 4,
    width: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
  }
});


