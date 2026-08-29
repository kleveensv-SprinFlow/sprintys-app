import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../src/core/theme';
import { useNutritionStore } from '../../../src/store/nutrition/nutritionStore';
import { MealType } from '../../../src/features/nutrition/types';
import { useAuthStore } from '../../../src/store/authStore';
import { FoodSearchModal } from '../../../src/features/nutrition/components/FoodSearchModal';

const mealInfo = {
  petit_dejeuner: { label: 'Petit déjeuner', icon: 'sunrise' },
  dejeuner: { label: 'Déjeuner', icon: 'sun' },
  diner: { label: 'Dîner', icon: 'moon' },
  collation: { label: 'Collation', icon: 'coffee' },
};

export default function MealDetailScreen() {
  const { type } = useLocalSearchParams<{ type: MealType }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  
  const { mealLogs, openSearchModal, currentDate } = useNutritionStore();

  if (!type || !mealInfo[type]) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Repas introuvable.</Text>
      </View>
    );
  }

  const logs = mealLogs.filter(log => log.meal_type === type);
  const info = mealInfo[type];

  // Calculs macros pour CE repas
  const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = logs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = logs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = logs.reduce((sum, log) => sum + Number(log.lipides), 0);

  const mealDistribution = user?.mealDistribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = user?.manualKcalGoal || 2000;
  const targetKcal = Math.round((kcalGoal * mealDistribution[type]) / 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Feather name={info.icon as any} size={22} color={theme.colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{info.label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* SUMMARY CARD */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.kcalBox}>
            <Text style={[styles.kcalValue, { color: theme.colors.text }]}>{Math.round(consumedKcal)}</Text>
            <Text style={[styles.kcalTarget, { color: theme.colors.textSecondary }]}>/ {targetKcal} kcal</Text>
          </View>
          
          <View style={styles.macrosRow}>
            <View style={styles.macroCol}>
              <Text style={[styles.macroVal, { color: '#FF6B6B' }]}>{Math.round(consumedPro)}g</Text>
              <Text style={[styles.macroLbl, { color: theme.colors.textSecondary }]}>Protéines</Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroVal, { color: '#4ECDC4' }]}>{Math.round(consumedGlu)}g</Text>
              <Text style={[styles.macroLbl, { color: theme.colors.textSecondary }]}>Glucides</Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroVal, { color: '#FFE66D' }]}>{Math.round(consumedLip)}g</Text>
              <Text style={[styles.macroLbl, { color: theme.colors.textSecondary }]}>Lipides</Text>
            </View>
          </View>
        </View>

        {/* FOOD LIST */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Aliments consommés</Text>
        
        <View style={[styles.listContainer, { backgroundColor: theme.colors.surface }]}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <View 
                key={log.id} 
                style={[
                  styles.foodRow, 
                  index !== logs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                ]}
              >
                <View style={styles.foodInfo}>
                  <Text style={[styles.foodName, { color: theme.colors.text }]} numberOfLines={1}>
                    {log.custom_food_name || log.food_id || 'Aliment'}
                  </Text>
                  <Text style={[styles.foodDetails, { color: theme.colors.textSecondary }]}>
                    {log.quantity_g}g • {Math.round(log.proteines)}p {Math.round(log.glucides)}g {Math.round(log.lipides)}l
                  </Text>
                </View>
                <Text style={[styles.foodCalories, { color: theme.colors.text }]}>
                  {Math.round(log.calories)} kcal
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Feather name="coffee" size={40} color={theme.colors.border} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Rien n'a encore été ajouté pour ce repas.
              </Text>
            </View>
          )}
        </View>

        {/* ADD BUTTON */}
        <TouchableOpacity 
          style={[styles.bigAddBtn, { backgroundColor: theme.colors.accent }]}
          onPress={() => openSearchModal(type)}
        >
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={styles.bigAddBtnText}>Ajouter un aliment</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Rendre le modal ici pour qu'il s'affiche par-dessus l'écran de détail */}
      <FoodSearchModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 10,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  kcalBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  kcalValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  kcalTarget: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 20,
  },
  macroCol: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  macroLbl: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  listContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  foodInfo: {
    flex: 1,
    marginRight: 15,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 13,
  },
  foodCalories: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 15,
    textAlign: 'center',
  },
  bigAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bigAddBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
