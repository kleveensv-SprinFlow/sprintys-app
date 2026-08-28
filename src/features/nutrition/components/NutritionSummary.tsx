import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';

export const NutritionSummary: React.FC = () => {
  const theme = useTheme();
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const user = useAuthStore((state) => state.user);

  const kcalGoal = user?.manualKcalGoal || 2000;

  const consumedKcal = mealLogs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = mealLogs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = mealLogs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = mealLogs.reduce((sum, log) => sum + Number(log.lipides), 0);

  // Estimation macro rapide (simplifiée)
  const proGoal = Math.round((kcalGoal * 0.3) / 4); // 30% protéines
  const gluGoal = Math.round((kcalGoal * 0.4) / 4); // 40% glucides
  const lipGoal = Math.round((kcalGoal * 0.3) / 9); // 30% lipides

  const remainingKcal = Math.max(0, kcalGoal - consumedKcal);
  const progressPercent = Math.min(100, (consumedKcal / kcalGoal) * 100);

  const renderProgressBar = (label: string, current: number, max: number, color: string) => {
    const percent = Math.min(100, max > 0 ? (current / max) * 100 : 0);
    return (
      <View style={styles.macroRow}>
        <View style={styles.macroHeader}>
          <Text style={[styles.macroLabel, { color: theme.colors.text }]}>{label}</Text>
          <Text style={[styles.macroValue, { color: theme.colors.textSecondary }]}>
            {Math.round(current)} / {max}g
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.gaugeContainer}>
        {/* Simple Circle Gauge approximation */}
        <View style={[styles.circle, { borderColor: theme.colors.border }]}>
          <Text style={[styles.remainingValue, { color: theme.colors.text }]}>{Math.round(remainingKcal)}</Text>
          <Text style={[styles.remainingLabel, { color: theme.colors.textSecondary }]}>Kcal restants</Text>
        </View>
      </View>

      <View style={styles.macrosContainer}>
        {renderProgressBar('Protéines', consumedPro, proGoal, '#FF6B6B')}
        {renderProgressBar('Glucides', consumedGlu, gluGoal, '#4ECDC4')}
        {renderProgressBar('Lipides', consumedLip, lipGoal, '#FFE66D')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  remainingLabel: {
    fontSize: 12,
  },
  macrosContainer: {
    gap: 15,
  },
  macroRow: {
    gap: 5,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  }
});
