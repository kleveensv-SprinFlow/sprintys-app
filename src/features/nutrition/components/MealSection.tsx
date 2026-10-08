import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { MealType } from '../types';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

interface MealSectionProps {
  readonly?: boolean;
}

export const MealSection: React.FC<MealSectionProps> = ({ readonly = false }) => {
  const theme = useTheme();
  const router = useRouter();
  const { mealLogs, openSearchModal } = useNutritionStore();
  const user = useAuthStore((state) => state.user);

  const mealDistribution = user?.mealDistribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = user?.manualKcalGoal || 2000;

  const meals: { type: MealType; label: string; icon: any; color: string }[] = [
    { type: 'petit_dejeuner', label: 'Petit déjeuner', icon: 'coffee', color: '#00C9A7' },
    { type: 'dejeuner', label: 'Déjeuner', icon: 'sun', color: '#FFB703' },
    { type: 'diner', label: 'Dîner', icon: 'moon', color: '#0069E8' },
    { type: 'collation', label: 'Collation', icon: 'smile', color: '#FF5252' },
  ];

  const handleAddFood = (type: MealType) => {
    openSearchModal(type);
  };

  const navigateToMealDetail = (type: MealType) => {
    router.push(`/meal/${type}`);
  };

  const ICON_RING_SIZE = 46;
  const STROKE_WIDTH = 3.5;
  const RADIUS = (ICON_RING_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <View style={styles.container}>
      {/* HEADER DE SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Alimentation</Text>
      </View>

      {/* CARTE UNIQUE UNIFIÉE STYLE YAZIO */}
      <View style={[styles.unifiedCard, { backgroundColor: theme.colors.surface }]}>
        {meals.map((meal, index) => {
          const logs = mealLogs.filter(log => log.meal_type === meal.type);
          const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
          const targetKcal = Math.round((kcalGoal * mealDistribution[meal.type]) / 100);
          
          const progressPercent = Math.min(1, targetKcal > 0 ? consumedKcal / targetKcal : 0);
          const strokeDashoffset = CIRCUMFERENCE * (1 - progressPercent);

          // Résumé textuel compact des aliments sur 1 seule ligne
          const foodsSummary = logs.map(l => l.custom_food_name || 'Aliment').join(', ');
          const isLast = index === meals.length - 1;

          return (
            <Pressable 
              key={meal.type} 
              style={({ pressed }) => [
                styles.mealRow, 
                !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                pressed && { backgroundColor: theme.colors.surfaceLight }
              ]}
              onPress={() => navigateToMealDetail(meal.type)}
            >
              {/* Jauge circulaire SVG avec icône centrale */}
              <View style={styles.iconRingContainer}>
                <Svg width={ICON_RING_SIZE} height={ICON_RING_SIZE}>
                  {/* Piste de fond */}
                  <Circle
                    cx={ICON_RING_SIZE / 2}
                    cy={ICON_RING_SIZE / 2}
                    r={RADIUS}
                    stroke={theme.colors.border}
                    strokeWidth={STROKE_WIDTH}
                    strokeOpacity={0.6}
                    fill="none"
                  />
                  {/* Anneau de progression actif */}
                  {progressPercent > 0 && (
                    <Circle
                      cx={ICON_RING_SIZE / 2}
                      cy={ICON_RING_SIZE / 2}
                      r={RADIUS}
                      stroke={meal.color}
                      strokeWidth={STROKE_WIDTH}
                      strokeDasharray={`${CIRCUMFERENCE}`}
                      strokeDashoffset={`${strokeDashoffset}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${ICON_RING_SIZE / 2} ${ICON_RING_SIZE / 2})`}
                      fill="none"
                    />
                  )}
                </Svg>

                <View style={styles.centerIconWrap}>
                  <Feather 
                    name={meal.icon} 
                    size={18} 
                    color={progressPercent > 0 ? meal.color : theme.colors.textSecondary} 
                  />
                </View>
              </View>

              {/* Contenu central : Titre + flèche, Calories, et Aperçu des aliments */}
              <View style={styles.mealInfo}>
                <View style={styles.titleWithChevron}>
                  <Text style={[styles.mealTitle, { color: theme.colors.text }]}>
                    {meal.label}
                  </Text>
                  <Feather name="arrow-right" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                </View>

                <Text style={[styles.kcalText, { color: theme.colors.textSecondary }]}>
                  {Math.round(consumedKcal)} / {targetKcal} kcal
                </Text>

                {foodsSummary.length > 0 && (
                  <Text style={[styles.foodSummaryText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {foodsSummary}
                  </Text>
                )}
              </View>

              {/* Gros bouton '+' circulaire noir style Yazio */}
              {!readonly && (
                <TouchableOpacity
                  style={[styles.addButtonPill, { backgroundColor: '#111827' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAddFood(meal.type);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unifiedCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconRingContainer: {
    width: 46,
    height: 46,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  centerIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    paddingRight: 12,
  },
  titleWithChevron: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  kcalText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  foodSummaryText: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  addButtonPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
