import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useWeatherStore } from '../../store/weatherStore';
import { weatherAdviceService } from '../../services/weatherAdviceService';
import { theme } from '../../core/theme';
import { PressableScale } from './PressableScale';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { FeedbackHost } from '../feedback/FeedbackHost';

const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

const CONDITION_LABELS: Record<string, string> = {
  clear: 'Dégagé',
  cloudy: 'Nuageux',
  foggy: 'Brouillard',
  rainy: 'Pluie',
  showers: 'Averses',
  snowy: 'Neige',
  stormy: 'Orage',
};

const getIconName = (condition?: string): keyof typeof Feather.glyphMap => {
  switch (condition) {
    case 'clear': return 'sun';
    case 'cloudy':
    case 'foggy': return 'cloud';
    case 'rainy':
    case 'showers': return 'cloud-rain';
    case 'snowy': return 'cloud-snow';
    case 'stormy': return 'cloud-lightning';
    default: return 'thermometer';
  }
};

export const WeatherBadge: React.FC = () => {
  const { data, isLoading, error, updateWeather } = useWeatherStore();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    updateWeather();
  }, []);

  // Location refused: a small, friendly way to fix it instead of disappearing
  const locationDenied = !data && !isLoading && /localisation refusée/i.test(error ?? '');

  const handleAllow = async () => {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted' && !canAskAgain) {
      Linking.openSettings();
      return;
    }
    updateWeather();
  };

  if (locationDenied) {
    return (
      <PressableScale
        haptic="light"
        onPress={handleAllow}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel="Météo indisponible : autorise ta position"
        style={styles.container}
      >
        <Feather name="map-pin" size={14} color={theme.colors.textSecondary} />
        <Text style={styles.deniedText}>Météo</Text>
        <View style={styles.divider} />
        <Text style={styles.allowText}>Autoriser</Text>
      </PressableScale>
    );
  }

  if (error || (!data && !isLoading)) return null;

  if (isLoading && !data) {
    return (
      <View style={styles.container} accessibilityLabel="Chargement de la météo">
        <Skeleton width={14} height={14} radius={7} />
        <Skeleton width={56} height={10} radius={5} style={{ marginLeft: 8 }} />
      </View>
    );
  }

  const advice = data ? weatherAdviceService.getCoachingAdvice(data) : null;
  const iconName = getIconName(data?.condition);
  const conditionLabel = (data?.condition && CONDITION_LABELS[data.condition]) || 'Conditions actuelles';
  const closeModal = () => setModalVisible(false);

  return (
    <>
      <PressableScale
        haptic="light"
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel={`Météo : ${data?.temperature} degrés, vent ${data?.windSpeed} km/h. Voir le conseil de Sprinty`}
        style={styles.container}
      >
        <Feather name={iconName} size={14} color={theme.colors.sprintyBlue} />
        <Text style={styles.temp}>{data?.temperature}°</Text>
        <View style={styles.divider} />
        <Feather name="wind" size={12} color={theme.colors.textMuted} />
        <Text style={styles.wind}>{data?.windSpeed} km/h</Text>
      </PressableScale>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <FeedbackHost />
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} accessibilityLabel="Fermer" />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.sprintyBadge}>
                <Feather name="zap" size={12} color={theme.colors.sprintyBlue} />
                <Text style={styles.modalTitle}>Conseil de Sprinty</Text>
              </View>
              <IconButton icon="x" size={34} onPress={closeModal} accessibilityLabel="Fermer" />
            </View>

            <View style={styles.weatherInfoRow}>
              <View style={styles.iconBig}>
                <Feather name={iconName} size={26} color={theme.colors.sprintyBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.conditionText}>{data?.temperature}°C</Text>
                <Text style={styles.conditionSub}>
                  {conditionLabel} · Vent {data?.windSpeed} km/h
                </Text>
              </View>
            </View>

            <Text style={styles.adviceMessage}>{advice?.message}</Text>

            <View style={styles.proTip}>
              <View style={styles.proTipHeader}>
                <Feather name="info" size={13} color={theme.colors.sprintyBlue} />
                <Text style={styles.proTipLabel}>Astuce</Text>
              </View>
              <Text style={styles.proTipText}>Ajoute 5 min à ton échauffement.</Text>
            </View>

            <Button title="Compris" onPress={closeModal} />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 12,
    minHeight: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  temp: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.hairline,
    marginHorizontal: 2,
  },
  wind: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  deniedText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  allowText: {
    color: theme.colors.sprintyBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sprintyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BLUE_TINT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  modalTitle: {
    color: theme.colors.sprintyBlue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  weatherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  iconBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BLUE_TINT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionText: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  conditionSub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  adviceMessage: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 16,
  },
  proTip: {
    backgroundColor: theme.colors.glassFill,
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginBottom: 20,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  proTipLabel: {
    color: theme.colors.sprintyBlue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  proTipText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
