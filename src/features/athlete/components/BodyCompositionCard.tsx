import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBodyStore } from '../../../store/bodyStore';
import { useAuthStore } from '../../../store/authStore';

export const BodyCompositionCard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, loadMetrics } = useBodyStore();

  useEffect(() => {
    if (user?.id) {
      loadMetrics(user.id);
    }
  }, [user]);

  const latestMetric = metrics[metrics.length - 1];

  const weight = latestMetric ? latestMetric.weight : '--';
  const bodyFat = latestMetric?.body_fat ? `${latestMetric.body_fat}%` : null;
  const muscleMass = latestMetric?.muscle_mass_kg ? `${latestMetric.muscle_mass_kg}kg` : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Feather name="activity" size={18} color={theme.colors.text} />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Composition Corporelle</Text>
      </View>

      <TouchableOpacity 
        style={styles.cardsRow}
        activeOpacity={0.85}
        onPress={() => router.push('/(athlete)/body')}
      >
        {/* Carte 1 : Masse Grasse */}
        <View style={[styles.sideCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
          <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.sideValue, { color: theme.colors.text }]}>
            {bodyFat || '--'}
          </Text>
          <Text style={[styles.sideLabel, { color: '#B45309' }]}>
            Masse Grasse
          </Text>
        </View>

        {/* Carte 2 (Centrale) : Poids Actuel */}
        <View style={[styles.centerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.centerRing, { borderColor: '#0066FF' }]}>
            <Text style={[styles.centerValue, { color: theme.colors.text }]}>{weight}</Text>
            <Text style={[styles.centerUnit, { color: theme.colors.textSecondary }]}>kg</Text>
          </View>
          <Text style={[styles.centerLabel, { color: theme.colors.text }]}>
            Poids Actuel
          </Text>
        </View>

        {/* Carte 3 : Masse Musculaire */}
        <View style={[styles.sideCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.sideValue, { color: theme.colors.text }]}>
            {muscleMass || '--'}
          </Text>
          <Text style={[styles.sideLabel, { color: '#047857' }]}>
            Masse Muscle
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  sideCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  sideValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerCard: {
    flex: 1.25,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  centerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  centerValue: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  centerUnit: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
