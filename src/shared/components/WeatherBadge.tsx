import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';
import { useWeatherStore } from '../../store/weatherStore';
import { weatherAdviceService } from '../../services/weatherAdviceService';
import { theme } from '../../core/theme';
import { GlassView } from './GlassView';
import Svg, { Path, Circle } from 'react-native-svg';

export const WeatherBadge: React.FC = () => {
  const { data, isLoading, error, updateWeather } = useWeatherStore();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    updateWeather();
  }, []);

  if (error || (!data && !isLoading)) return null;

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  const advice = data ? weatherAdviceService.getCoachingAdvice(data) : null;

  const renderIcon = () => {
    const color = theme.colors.accent;
    switch (data?.condition) {
      case 'clear':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Circle cx="12" cy="12" r="5" />
            <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </Svg>
        );
      case 'cloudy':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M17.5 19c2.5 0 4.5-2 4.5-4.5s-2-4.5-4.5-4.5c-.2 0-.4 0-.6.1-.9-3-3.7-5.1-6.9-5.1-4.1 0-7.5 3.4-7.5 7.5s3.4 7.5 7.5 7.5c.9 0 1.7-.2 2.5-.5.6.3 1.3.5 2.5.5z" />
          </Svg>
        );
      case 'rainy':
      case 'showers':
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M16 13a4 4 0 0 1-8 0" />
            <Path d="M8 15v3M12 17v3M16 15v3" />
            <Path d="M20 10a8 8 0 1 0-16 0" />
          </Svg>
        );
      default:
        return (
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Circle cx="12" cy="12" r="10" />
          </Svg>
        );
    }
  };

  return (
    <>
      <Pressable 
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.container,
          pressed && { opacity: 0.7, scale: 0.98 }
        ]}
      >
        <View style={styles.iconWrapper}>
          {renderIcon()}
        </View>
        <Text style={styles.temp}>{data?.temperature}°</Text>
        <View style={styles.divider} />
        <Text style={styles.wind}>{data?.windSpeed} km/h</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <BlurView intensity={80} tint="dark" style={styles.glassCard}>
                  <View style={styles.modalHeader}>
                    <View style={styles.sprintyBadge}>
                      <Text style={styles.modalTitle}>SPRINTY ADVICE</Text>
                    </View>
                    <Pressable onPress={() => setModalVisible(false)}>
                      <View style={styles.closeIcon} />
                    </Pressable>
                  </View>
                  
                  <View style={styles.weatherInfoRow}>
                    <View style={styles.iconBig}>
                      {renderIcon()}
                    </View>
                    <View>
                      <Text style={styles.conditionText}>
                        {data?.temperature}°C
                      </Text>
                      <Text style={styles.conditionSub}>
                        {data?.condition?.toUpperCase()} • {data?.windSpeed} KM/H
                      </Text>
                    </View>
                  </View>

                  <View style={styles.adviceContainer}>
                    <Text style={styles.adviceMessage}>{advice?.message}</Text>
                    <View style={styles.proTip}>
                      <Text style={styles.proTipLabel}>ELITE TIP</Text>
                      <Text style={styles.proTipText}>Ajustez l'échauffement de +5 min.</Text>
                    </View>
                  </View>

                  <Pressable 
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>COMPRIS</Text>
                  </Pressable>
                </BlurView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrapper: {
    marginRight: 6,
  },
  temp: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  wind: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  glassCard: {
    padding: theme.spacing.xxl,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  sprintyBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  modalTitle: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  closeIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  weatherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
    gap: 20,
  },
  iconBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionText: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: theme.typography.fontWeights.bold as any,
    lineHeight: 48,
  },
  conditionSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  adviceContainer: {
    marginBottom: theme.spacing.xxxl,
  },
  adviceMessage: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: theme.typography.fontWeights.medium as any,
    marginBottom: theme.spacing.xl,
  },
  proTip: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  proTipLabel: {
    color: theme.colors.accent,
    fontSize: 8,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: 4,
  },
  proTipText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: theme.typography.fontWeights.medium as any,
  },
  closeButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  closeButtonText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
});
