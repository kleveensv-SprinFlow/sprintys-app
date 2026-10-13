import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import * as Location from 'expo-location';
import { weatherService, WeatherData } from '../../services/weatherService';
import { PressableScale } from './PressableScale';
import { IconButton } from './IconButton';
import { Skeleton } from './Skeleton';
import { glassCard, DashboardCardHeader } from './DashboardCard';
import { GlassSheen } from './GlassSheen';
import { FeedbackHost } from '../feedback/FeedbackHost';

const WEATHER_TINT = '#0284C7';

const getWeatherIconColor = (condition?: string) => {
  switch (condition) {
    case 'clear': return '#FACC15'; // Yellow
    case 'cloudy':
    case 'foggy': return '#94A3B8'; // Slate Gray
    case 'rainy':
    case 'showers': return '#38BDF8'; // Sky Blue
    case 'snowy': return '#7DD3FC'; // Ice (visible on white)
    case 'stormy': return '#A855F7'; // Purple
    default: return '#FACC15';
  }
};

const getWeatherIcon = (condition?: string): keyof typeof Feather.glyphMap => {
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

export const WeatherCard = () => {
  const cardStyle = glassCard;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('Recherche…');
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<'denied' | 'error' | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

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

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
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

  if (isLoading) {
    return (
      <View
        style={[cardStyle, styles.container]}
        accessibilityLabel="Chargement de la météo"
        accessibilityRole="progressbar"
      >
        <GlassSheen radius={22} />
        <Skeleton width={90} height={12} radius={6} />
        <View style={[styles.topRow, { marginTop: 14 }]}>
          <View style={styles.leftContent}>
            <Skeleton width={64} height={36} radius={10} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="60%" height={13} />
              <Skeleton width="85%" height={11} />
            </View>
          </View>
          <Skeleton width={34} height={34} radius={17} />
        </View>
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
    const handleRecover = async () => {
      if (denied) {
        // Coming back from the OS settings with access granted: just reload
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' && !canAskAgain) {
          Linking.openSettings();
          return;
        }
      }
      loadWeather();
    };

    return (
      <View style={[cardStyle, styles.container]}>
        <GlassSheen radius={22} />
        <DashboardCardHeader
          icon={<Feather name={denied ? 'map-pin' : 'cloud-off'} size={15} color={WEATHER_TINT} />}
          label="Météo"
          tint={WEATHER_TINT}
          showChevron={false}
        />
        <View style={styles.failureRow}>
          <View style={styles.failureIcon}>
            <Feather name={denied ? 'navigation' : 'wifi-off'} size={18} color={theme.colors.sprintyBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.failureTitle}>
              {denied ? 'Localisation désactivée' : 'Météo indisponible'}
            </Text>
            <Text style={styles.failureText}>
              {denied
                ? 'Autorise ta position pour voir le vent et la pluie sur ta piste.'
                : 'Vérifie ta connexion puis réessaie.'}
            </Text>
          </View>
        </View>
        <PressableScale
          haptic="light"
          onPress={handleRecover}
          accessibilityRole="button"
          style={styles.failureAction}
        >
          <Feather name={denied ? 'map-pin' : 'refresh-cw'} size={14} color="#FFFFFF" />
          <Text style={styles.failureActionText}>{denied ? 'Autoriser' : 'Réessayer'}</Text>
        </PressableScale>
      </View>
    );
  }

  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <PressableScale
        style={[cardStyle, styles.container]}
        onPress={() => setIsModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Météo à ${locationName} : ${weather.temperature} degrés, ${weather.conditionLabel || 'dégagé'}`}
      >
        <GlassSheen radius={22} />
        <DashboardCardHeader
          icon={<Feather name={getWeatherIcon(weather.condition)} size={15} color={WEATHER_TINT} />}
          label="Météo"
          tint={WEATHER_TINT}
          meta={locationName}
        />

        <View style={styles.topRow}>
          <View style={styles.leftContent}>
            <Text style={styles.temperature}>{`${weather.temperature}°`}</Text>
            <View style={styles.details}>
              <Text style={styles.location} numberOfLines={1}>
                {weather.conditionLabel || 'Dégagé'}
              </Text>
              <Text style={[styles.statText, { marginTop: 2 }]} numberOfLines={1}>
                {`Vent ${weather.windSpeed} km/h · ${weather.precipitation && weather.precipitation > 0 ? 'piste humide' : 'piste sèche'}`}
              </Text>
            </View>
          </View>
          <Feather name={getWeatherIcon(weather.condition)} size={34} color={getWeatherIconColor(weather.condition)} />
        </View>
      </PressableScale>

      {/* Detailed weather */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <FeedbackHost />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <IconButton icon="x" onPress={closeModal} accessibilityLabel="Fermer" />
              <Text style={styles.modalTitle}>Météo détaillée</Text>
              <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Hero */}
              <View style={styles.modalHero}>
                <Feather name={getWeatherIcon(weather.condition)} size={52} color={getWeatherIconColor(weather.condition)} />
                <Text style={styles.modalTemp}>{`${weather.temperature}°C`}</Text>
                <Text style={styles.modalLoc}>{locationName}</Text>
                <View style={styles.conditionPill}>
                  <Text style={styles.modalConditionText}>{weather.conditionLabel || 'Dégagé'}</Text>
                </View>
              </View>

              {/* 3 key indicators for sprint training */}
              <View style={styles.modalStatsRow}>
                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="wind" size={16} color={theme.colors.sprintyBlue} />
                  </View>
                  <Text style={styles.metricValue}>
                    {weather.windSpeed || '--'} <Text style={styles.metricUnit}>km/h</Text>
                  </Text>
                  <Text style={styles.metricSub}>
                    {weather.windDirection ? `Cap ${weather.windDirection}` : 'Vent'}
                  </Text>
                </View>

                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="cloud-rain" size={16} color={WEATHER_TINT} />
                  </View>
                  <Text style={styles.metricValue}>
                    {weather.precipitation != null ? `${weather.precipitation}` : '0'} <Text style={styles.metricUnit}>mm</Text>
                  </Text>
                  <Text style={styles.metricSub}>
                    {weather.precipitation && weather.precipitation > 0 ? 'Piste humide' : 'Piste sèche'}
                  </Text>
                </View>

                <View style={styles.modalMetricCard}>
                  <View style={styles.metricIconWrap}>
                    <Feather name="sunset" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.metricValue}>{weather.sunset || '--:--'}</Text>
                  <Text style={styles.metricSub}>Coucher</Text>
                </View>
              </View>

              {/* Hourly forecast */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Prévisions horaires (24 h)</Text>
                {selectedDate && (
                  <PressableScale
                    haptic="selection"
                    onPress={() => setSelectedDate(null)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.resetText}>Réinitialiser</Text>
                  </PressableScale>
                )}
              </View>

              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
              >
                {displayHourly.length > 0 ? displayHourly.map((h, i) => (
                  <View key={i} style={styles.hourlyCard}>
                    <Text style={styles.hourlyTime}>{h.time}</Text>
                    <Feather name={getWeatherIcon(h.condition)} size={22} color={getWeatherIconColor(h.condition)} style={{ marginVertical: 8 }} />
                    <Text style={styles.hourlyTemp}>{h.temperature}°</Text>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>Aucune donnée horaire disponible.</Text>
                )}
              </ScrollView>

              {/* Daily forecast */}
              <Text style={[styles.sectionLabel, { marginTop: 24, marginBottom: 10 }]}>Les 7 prochains jours</Text>
              {weather.daily?.map((d, i) => {
                const selected = selectedDate === d.date;
                return (
                  <PressableScale
                    key={i}
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => setSelectedDate(d.date)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.dailyCard, selected && styles.dailyCardSelected]}
                  >
                    <Text style={styles.dailyDay}>{d.displayDay}</Text>
                    <Feather name={getWeatherIcon(d.condition)} size={20} color={getWeatherIconColor(d.condition)} style={{ width: 40, textAlign: 'center' }} />
                    <View style={styles.dailyTemps}>
                      <Text style={styles.dailyMin}>{d.tempMin}°</Text>
                      <View style={styles.dailyBar} />
                      <Text style={styles.dailyMax}>{d.tempMax}°</Text>
                    </View>
                  </PressableScale>
                );
              })}
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
    color: theme.colors.text,
  },
  details: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  location: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // Failure state (location refused / network)
  failureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  failureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  failureText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  failureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 44,
    paddingHorizontal: 18,
    marginTop: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.sprintyBlue,
  },
  failureActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    height: '80%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
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
    color: theme.colors.text,
  },
  modalLoc: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  conditionPill: {
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginTop: 10,
  },
  modalConditionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  modalMetricCard: {
    flex: 1,
    backgroundColor: theme.colors.glassFill,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  metricSub: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resetText: {
    fontSize: 13,
    color: theme.colors.sprintyBlue,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  hourlyCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    width: 68,
    backgroundColor: theme.colors.glassFill,
  },
  hourlyTime: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hourlyTemp: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
  },
  dailyCardSelected: {
    borderColor: theme.colors.sprintyBlue,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  dailyDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
  },
  dailyMax: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  dailyBar: {
    height: 4,
    width: 30,
    backgroundColor: theme.colors.hairline,
    borderRadius: 2,
  },
});
