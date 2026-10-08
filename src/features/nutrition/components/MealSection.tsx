import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { MealType, MealLog } from '../types';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';

interface MealSectionProps {
  readonly?: boolean;
}

export const MealSection: React.FC<MealSectionProps> = ({ readonly = false }) => {
  const theme = useTheme();
  const router = useRouter();
  const { mealLogs, openSearchModal, deleteMealLog } = useNutritionStore();
  const user = useAuthStore((state) => state.user);

  const mealDistribution = user?.mealDistribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = user?.manualKcalGoal || 2000;

  const meals: { type: MealType; label: string; icon: any }[] = [
    { type: 'petit_dejeuner', label: 'Petit déjeuner', icon: 'sunrise' },
    { type: 'dejeuner', label: 'Déjeuner', icon: 'sun' },
    { type: 'diner', label: 'Dîner', icon: 'moon' },
    { type: 'collation', label: 'Collation', icon: 'coffee' },
  ];

  const handleAddFood = (type: MealType) => {
    openSearchModal(type);
  };

  const navigateToMealDetail = (type: MealType) => {
    router.push(`/meal/${type}`);
  };

  const handleDeleteFood = (log: MealLog) => {
    Alert.alert(
      'Supprimer l\'aliment',
      `Voulez-vous retirer "${log.custom_food_name || 'cet aliment'}" de votre repas ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteMealLog(log.id)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {meals.map((meal) => {
        const logs = mealLogs.filter(log => log.meal_type === meal.type);
        const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
        const targetKcal = Math.round((kcalGoal * mealDistribution[meal.type]) / 100);

        return (
          <Pressable 
            key={meal.type} 
            style={({ pressed }) => [
              styles.mealCard, 
              { backgroundColor: theme.colors.surface },
              pressed && { opacity: 0.96 }
            ]}
            onPress={() => navigateToMealDetail(meal.type)}
          >
            {/* Header avec Titre, Calories et Bouton '+' moderne */}
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <View style={[styles.iconBadge, { backgroundColor: theme.colors.surfaceLight }]}>
                  <Feather name={meal.icon} size={18} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={[styles.mealTitle, { color: theme.colors.text }]}>{meal.label}</Text>
                  <Text style={[styles.kcalText, { color: theme.colors.textSecondary }]}>
                    {Math.round(consumedKcal)} <Text style={{ color: theme.colors.textMuted }}>/ {targetKcal} kcal</Text>
                  </Text>
                </View>
              </View>

              {/* Bouton d'ajout compact '+' élégant en haut à droite */}
              {!readonly && (
                <TouchableOpacity
                  style={[styles.addCircleButton, { backgroundColor: theme.colors.accent }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAddFood(meal.type);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Liste des aliments enregistrés */}
            {logs.length > 0 ? (
              <View style={styles.foodList}>
                {logs.map((log) => {
                  const displayName = log.custom_food_name || 'Aliment sans nom';
                  const p = Math.round(Number(log.proteines) || 0);
                  const g = Math.round(Number(log.glucides) || 0);
                  const l = Math.round(Number(log.lipides) || 0);

                  return (
                    <View key={log.id} style={[styles.foodItem, { borderTopColor: theme.colors.border }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.foodName, { color: theme.colors.text }]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <View style={styles.macroPillRow}>
                          <Text style={[styles.macroPill, { color: '#FF5252' }]}>P {p}g</Text>
                          <Text style={[styles.macroDotSeparator, { color: theme.colors.border }]}>•</Text>
                          <Text style={[styles.macroPill, { color: '#00C9A7' }]}>G {g}g</Text>
                          <Text style={[styles.macroDotSeparator, { color: theme.colors.border }]}>•</Text>
                          <Text style={[styles.macroPill, { color: '#FFB703' }]}>L {l}g</Text>
                          {log.quantity_g ? (
                            <>
                              <Text style={[styles.macroDotSeparator, { color: theme.colors.border }]}>•</Text>
                              <Text style={[styles.macroPill, { color: theme.colors.textMuted }]}>{log.quantity_g}g</Text>
                            </>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.foodActionRow}>
                        <Text style={[styles.foodKcal, { color: theme.colors.text }]}>
                          {Math.round(log.calories)} <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>kcal</Text>
                        </Text>
                        {!readonly && (
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteFood(log);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.deleteFoodBtn}
                          >
                            <Feather name="trash-2" size={14} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  mealCard: {
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  kcalText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  addCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0069E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  foodList: {
    marginTop: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  macroPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  macroDotSeparator: {
    fontSize: 10,
  },
  foodActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodKcal: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteFoodBtn: {
    padding: 4,
  }
});
