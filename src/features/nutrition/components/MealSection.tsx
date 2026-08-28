import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { MealType } from '../types';
import { useAuthStore } from '../../../store/authStore';

export const MealSection: React.FC = () => {
  const theme = useTheme();
  const { mealLogs, openSearchModal } = useNutritionStore();
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

  return (
    <View style={styles.container}>
      {meals.map((meal) => {
        const logs = mealLogs.filter(log => log.meal_type === meal.type);
        const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
        const targetKcal = Math.round((kcalGoal * mealDistribution[meal.type]) / 100);

        return (
          <View key={meal.type} style={[styles.mealCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTitleRow}>
                <Feather name={meal.icon} size={20} color={theme.colors.text} style={styles.icon} />
                <Text style={[styles.mealTitle, { color: theme.colors.text }]}>{meal.label}</Text>
              </View>
              <Text style={[styles.kcalText, { color: theme.colors.textSecondary }]}>
                {Math.round(consumedKcal)} / {targetKcal} kcal
              </Text>
            </View>

            {logs.length > 0 ? (
              <View style={styles.foodList}>
                {logs.map((log) => (
                  <View key={log.id} style={styles.foodItem}>
                    <Text style={[styles.foodName, { color: theme.colors.text }]}>
                      {log.custom_food_name || log.food_id || 'Aliment inconnu'}
                    </Text>
                    <Text style={[styles.foodKcal, { color: theme.colors.textSecondary }]}>
                      {Math.round(log.calories)} kcal
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.background }]}
              onPress={() => handleAddFood(meal.type)}
            >
              <Feather name="plus" size={16} color={theme.colors.accent} />
              <Text style={[styles.addButtonText, { color: theme.colors.accent }]}>Ajouter un aliment</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Espace pour le bouton flottant
    gap: 15,
  },
  mealCard: {
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  kcalText: {
    fontSize: 14,
  },
  foodList: {
    marginBottom: 15,
    gap: 8,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodName: {
    fontSize: 14,
  },
  foodKcal: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 5,
  },
  addButtonText: {
    fontWeight: '600',
    fontSize: 14,
  }
});
