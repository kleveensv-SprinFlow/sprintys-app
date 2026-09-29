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
            <View style={styles.sideCircleContainer}>
              <View style={[styles.sideCircle, { borderColor: theme.colors.warning }]}>
                <Text style={[styles.sideCircleText, { color: theme.colors.text }]}>{bodyFat}</Text>
              </View>
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
            <View style={styles.sideCircleContainer}>
              <View style={[styles.sideCircle, { borderColor: theme.colors.success }]}>
                <Text style={[styles.sideCircleText, { color: theme.colors.text }]}>{muscleMass}</Text>
              </View>
              <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>Masse Muscle</Text>
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
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  circlesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 20,
  },
  mainCircleContainer: {
    alignItems: 'center',
  },
  sideCircleContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  mainCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sideCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mainCircleText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  mainCircleUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  sideCircleText: {
    fontSize: 18,
    fontWeight: 'bold',
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
