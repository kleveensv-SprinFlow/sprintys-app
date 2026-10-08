import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { MealType } from '../types';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

interface MealSectionProps {
  readonly?: boolean;
  athleteId?: string;
  athleteProfile?: any;
}

export const MealSection: React.FC<MealSectionProps> = ({ readonly = false, athleteId, athleteProfile }) => {
  const theme = useTheme();
  const router = useRouter();
  const { mealLogs, openSearchModal } = useNutritionStore();
  const user = useAuthStore((state) => state.user);

  const activeProfile = athleteProfile || user;
  const mealDistribution = activeProfile?.mealDistribution || activeProfile?.meal_distribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal || 2000;

  const meals: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { type: 'petit_dejeuner', label: 'Petit déjeuner', icon: 'cafe-outline', color: '#F59E0B' },
    { type: 'dejeuner', label: 'Déjeuner', icon: 'restaurant-outline', color: '#10B981' },
    { type: 'diner', label: 'Dîner', icon: 'moon-outline', color: '#6366F1' },
    { type: 'collation', label: 'Collation', icon: 'nutrition-outline', color: '#EC4899' },
  ];

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

  const ICON_RING_SIZE = 44;
  const STROKE_WIDTH = 3;
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
                    strokeOpacity={0.35}
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
                  <Ionicons 
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
                  <Feather name="chevron-right" size={14} color={theme.colors.textMuted} style={{ marginLeft: 4 }} />
                </View>

                <Text style={[styles.kcalText, { color: theme.colors.textSecondary }]}>
                  {Math.round(consumedKcal)} <Text style={{ color: theme.colors.textMuted }}>/ {targetKcal} kcal</Text>
                </Text>

                {foodsSummary.length > 0 && (
                  <Text style={[styles.foodSummaryText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {foodsSummary}
                  </Text>
                )}
              </View>

              {/* Bouton '+' compact et cerclé assorti à la couleur du repas */}
              {!readonly && (
                <TouchableOpacity
                  style={[
                    styles.addButtonCompact,
                    {
                      backgroundColor: `${meal.color}15`,
                      borderColor: `${meal.color}35`,
                    }
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAddFood(meal.type);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={17} color={meal.color} />
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unifiedCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconRingContainer: {
    width: 44,
    height: 44,
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
    fontSize: 15,
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
  addButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
