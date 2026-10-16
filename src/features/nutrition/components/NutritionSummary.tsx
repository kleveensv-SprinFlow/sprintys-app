import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { EnergyTrack } from './EnergyTrack';
import { MacroLanes } from './MacroLanes';
import { MealIcon } from './MealIcon';
import { MEALS, MEAL_ACCENT, macroGoals } from '../nutritionTheme';
import { ageOn, isMinorAthlete } from '../../../legal/age';

interface NutritionSummaryProps {
  athleteProfile?: any;
}

/** "Énergie du jour": calories on the track, macros in their lanes (adulte).
 *  Pour les mineurs : vue calme sans calories, sans macros et sans jauge. */
export const NutritionSummary: React.FC<NutritionSummaryProps> = ({ athleteProfile }) => {
  const theme = useTheme();
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const isMinor = isMinorAthlete(activeProfile);

  // Pour les mineurs : aucune cible chiffrée automatique ni résiduelle
  const rawKcal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal;
  const kcalGoal = isMinor ? null : (rawKcal || 2000);

  const sum = (key: 'calories' | 'proteines' | 'glucides' | 'lipides') =>
    mealLogs.reduce((total, log) => total + Number(log[key] || 0), 0);

  return (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {isMinor ? 'Repas du jour' : 'Énergie du jour'}
        </Text>
        <Text style={[styles.goal, { color: theme.colors.textSecondary }]}>
          {isMinor
            ? (mealLogs.length > 0
                ? `${mealLogs.length} aliment${mealLogs.length > 1 ? 's enregistrés' : ' enregistré'}`
                : 'Repères du jour')
            : `Objectif ${kcalGoal.toLocaleString('fr-FR')} kcal`}
        </Text>
      </View>

      {isMinor ? (
        <View style={styles.minorContainer}>
          <Text style={[styles.minorHelper, { color: theme.colors.textSecondary }]}>
            {mealLogs.length === 0
              ? 'Enregistre tes repas au fil de la journée pour garder une trace.'
              : 'Suivi régulier de tes repas et collations de la journée.'}
          </Text>
          <View style={styles.minorGrid}>
            {MEALS.map((meal) => {
              const mealCount = mealLogs.filter((l) => l.meal_type === meal.type).length;
              const hasLogged = mealCount > 0;
              return (
                <View
                  key={meal.type}
                  style={[
                    styles.minorPill,
                    {
                      backgroundColor: hasLogged ? theme.colors.surfaceLight : theme.colors.glassFill,
                      borderColor: hasLogged ? theme.colors.border : 'transparent',
                    },
                  ]}
                >
                  <MealIcon type={meal.type} size={15} />
                  <Text
                    style={[
                      styles.minorPillLabel,
                      { color: hasLogged ? theme.colors.text : theme.colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {meal.label}
                  </Text>
                  {hasLogged && (
                    <View style={styles.minorPillBadge}>
                      <Feather name="check" size={11} color={MEAL_ACCENT} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <>
          <EnergyTrack consumed={sum('calories')} goal={kcalGoal || 0} />
          <View style={styles.lanes}>
            <MacroLanes
              values={{ proteines: sum('proteines'), glucides: sum('glucides'), lipides: sum('lipides') }}
              goals={macroGoals(kcalGoal)}
            />
          </View>
        </>
      )}
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
  minorContainer: {
    marginTop: 4,
  },
  minorHelper: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  minorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  minorPillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  minorPillBadge: {
    marginLeft: 2,
  },
});

