import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore, getLocalDateString } from '../../../store/nutrition/nutritionStore';
import { MealType } from '../types';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';
import { supabase } from '../../../services/supabase';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { MealIcon } from './MealIcon';
import { MEALS, MEAL_ACCENT, MEAL_ACCENT_TINT } from '../nutritionTheme';

import { tourRef } from '../../onboarding/tourRegistry';
import { ageOn } from '../../../legal/age';
interface MealSectionProps {
  readonly?: boolean;
  athleteId?: string;
  athleteProfile?: any;
}

export const MealSection: React.FC<MealSectionProps> = ({ readonly = false, athleteId, athleteProfile }) => {
  const theme = useTheme();
  const router = useRouter();
  const { mealLogs, openSearchModal, currentDate, copyMealFromDate } = useNutritionStore();
  const user = useAuthStore((state) => state.user);

  const yesterdayDate = React.useMemo(() => {
    if (!currentDate) return '';
    const [y, m, d] = currentDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    return getLocalDateString(prev);
  }, [currentDate]);

  const [yesterdayMeals, setYesterdayMeals] = React.useState<Record<string, { count: number; kcal: number }>>({});

  React.useEffect(() => {
    const targetUserId = athleteId || user?.id;
    if (!targetUserId || !yesterdayDate) return;

    supabase
      .from('meal_logs')
      .select('meal_type, calories')
      .eq('user_id', targetUserId)
      .eq('consumed_at', yesterdayDate)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { count: number; kcal: number }> = {};
          data.forEach((item) => {
            if (!map[item.meal_type]) map[item.meal_type] = { count: 0, kcal: 0 };
            map[item.meal_type].count += 1;
            map[item.meal_type].kcal += Number(item.calories || 0);
          });
          setYesterdayMeals(map);
        }
      });
  }, [currentDate, yesterdayDate, athleteId, user?.id]);

  const activeProfile = athleteProfile || user;
  const athleteAge = ageOn(activeProfile?.dateOfBirth || activeProfile?.date_of_birth);
  const isMinor = athleteAge < 18 || !(activeProfile?.dateOfBirth || activeProfile?.date_of_birth);

  const mealDistribution = activeProfile?.mealDistribution || activeProfile?.meal_distribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const rawKcal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal;
  const kcalGoal = isMinor ? null : (rawKcal || 2000);

  const handleAddFood = (type: MealType) => {
    openSearchModal(type);
  };

  const navigateToMealDetail = (type: MealType) => {
    const query = [
      athleteId ? `athleteId=${athleteId}` : '',
      readonly ? 'readonly=true' : ''
    ].filter(Boolean).join('&');
    router.push(`/meal/${type}${query ? `?${query}` : ''}`);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Repas</Text>

      {MEALS.map((meal) => {
        const logs = mealLogs.filter((log) => log.meal_type === meal.type);
        const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
        const targetKcal = kcalGoal ? Math.round((kcalGoal * mealDistribution[meal.type]) / 100) : null;
        const progress = Math.min(1, targetKcal && targetKcal > 0 ? consumedKcal / targetKcal : 0);
        const yesterday = yesterdayMeals[meal.type];

        return (
          <PressableScale
            key={meal.type}
            onPress={() => navigateToMealDetail(meal.type)}
            style={[glassCard, styles.mealCard]}
          >
            <GlassSheen radius={22} />
            <View style={styles.mealRow}>
              <MealIcon type={meal.type} size={22} />

              <View style={styles.mealInfo}>
                <Text style={[styles.mealTitle, { color: theme.colors.text }]}>{meal.label}</Text>
                <Text style={[styles.kcalText, { color: theme.colors.text }]}>
                  {Math.round(consumedKcal).toLocaleString('fr-FR')} kcal
                  {targetKcal ? (
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '500' }}>
                      {` / ${targetKcal.toLocaleString('fr-FR')} kcal`}
                    </Text>
                  ) : null}
                </Text>
              </View>

              {!readonly && (
                <PressableScale
                  onPress={() => handleAddFood(meal.type)}
                  hitSlop={6}
                  style={styles.addPill}
                  targetRef={meal.type === MEALS[0].type ? tourRef('athlete.addMeal') : undefined}
                >
                  <Feather name="plus" size={15} color={MEAL_ACCENT} />
                  <Text style={styles.addPillText}>Ajouter</Text>
                </PressableScale>
              )}
            </View>

            {/* Share of this meal in the day's target */}
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.glassFill }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            {/* Empty meal: offer yesterday's one tap repeat */}
            {logs.length === 0 && !readonly && (yesterday?.count ?? 0) > 0 && (
              <PressableScale
                haptic="light"
                hitSlop={6}
                onPress={async () => {
                  await copyMealFromDate(yesterdayDate, meal.type, athleteId);
                }}
                style={styles.repeatLink}
              >
                <Feather name="rotate-ccw" size={12} color={MEAL_ACCENT} />
                <Text style={styles.repeatLinkText}>
                  Reprendre hier · {Math.round(yesterday?.kcal ?? 0)} kcal
                </Text>
              </PressableScale>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mealCard: {
    marginBottom: 10,
    paddingVertical: 13,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  kcalText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: MEAL_ACCENT_TINT,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: MEAL_ACCENT,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 11,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: MEAL_ACCENT,
  },
  repeatLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
  },
  repeatLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: MEAL_ACCENT,
  },
});
