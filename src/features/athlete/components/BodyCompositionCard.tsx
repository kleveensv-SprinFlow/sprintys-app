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
        <Feather name="activity" size={20} color={theme.colors.text} />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Composition Corporelle</Text>
      </View>

      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        activeOpacity={0.8}
        onPress={() => router.push('/(athlete)/body')}
      >
        <View style={styles.circlesContainer}>
          {bodyFat && (
            <View style={styles.sideStatContainer}>
              <Text style={[styles.sideStatValue, { color: theme.colors.text }]}>{bodyFat}</Text>
              <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>Masse Grasse</Text>
            </View>
          )}

          <View style={styles.mainCircleContainer}>
            <View style={[styles.mainCircle, { borderColor: theme.colors.accent }]}>
              <Text style={[styles.mainCircleText, { color: theme.colors.text }]}>{weight}</Text>
              <Text style={[styles.mainCircleUnit, { color: theme.colors.textSecondary }]}>kg</Text>
            </View>
            <Text style={[styles.circleLabel, { color: theme.colors.textSecondary, fontWeight: 'bold' }]}>Poids Actuel</Text>
          </View>

          {muscleMass && (
            <View style={styles.sideStatContainer}>
              <Text style={[styles.sideStatValue, { color: theme.colors.text }]}>{muscleMass}</Text>
              <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>Masse Musculaire</Text>
            </View>
          )}
        </View>

        {!bodyFat && !muscleMass && (
          <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
            Clique pour ajouter plus de détails (balance impédancemètre)
          </Text>
        )}
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: '#F8FAFC',
    padding: 24,
    alignItems: 'center',
  },
  circlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  mainCircleContainer: {
    alignItems: 'center',
  },
  sideStatContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  mainCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mainCircleText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  mainCircleUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  sideStatValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  circleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
  }
});
