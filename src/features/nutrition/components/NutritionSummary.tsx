import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { EnergyTrack } from './EnergyTrack';
import { MacroLanes } from './MacroLanes';
import { macroGoals } from '../nutritionTheme';
import { ageOn } from '../../../legal/age';

interface NutritionSummaryProps {
  athleteProfile?: any;
}

/** "Énergie du jour": calories on the track, macros in their lanes. */
export const NutritionSummary: React.FC<NutritionSummaryProps> = ({ athleteProfile }) => {
  const theme = useTheme();
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const athleteAge = ageOn(activeProfile?.dateOfBirth || activeProfile?.date_of_birth);
  const isMinor = athleteAge < 18 || !(activeProfile?.dateOfBirth || activeProfile?.date_of_birth);

  // Pour les mineurs : aucune cible chiffrée automatique ni résiduelle
  const rawKcal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal;
  const kcalGoal = isMinor ? null : (rawKcal || 2000);

  const sum = (key: 'calories' | 'proteines' | 'glucides' | 'lipides') =>
    mealLogs.reduce((total, log) => total + Number(log[key] || 0), 0);

  return (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Énergie du jour</Text>
        <Text style={[styles.goal, { color: theme.colors.textSecondary }]}>
          {isMinor
            ? 'Repères individualisés (sans chiffre imposé)'
            : `Objectif ${kcalGoal.toLocaleString('fr-FR')} kcal`}
        </Text>
      </View>

      <EnergyTrack consumed={sum('calories')} goal={kcalGoal || 0} />

      <View style={styles.lanes}>
        <MacroLanes
          values={{ proteines: sum('proteines'), glucides: sum('glucides'), lipides: sum('lipides') }}
          goals={isMinor ? undefined : macroGoals(kcalGoal)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  goal: {
    fontSize: 13,
    fontWeight: '600',
  },
  lanes: {
    marginTop: 18,
  },
});
