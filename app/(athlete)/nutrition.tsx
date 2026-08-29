import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { NutritionHeader } from '../../src/features/nutrition/components/NutritionHeader';
import { DateSelector } from '../../src/features/nutrition/components/DateSelector';
import { NutritionSummary } from '../../src/features/nutrition/components/NutritionSummary';
import { MealSection } from '../../src/features/nutrition/components/MealSection';
import { FoodSearchModal } from '../../src/features/nutrition/components/FoodSearchModal';
import { NutritionSettingsModal } from '../../src/features/nutrition/components/NutritionSettingsModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';

export default function NutritionScreen() {
  const theme = useTheme();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { currentDate, fetchMealLogs } = useNutritionStore();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) {
      fetchMealLogs(currentDate);
    }
  }, [currentDate, user]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NutritionHeader onSettingsPress={() => setSettingsVisible(true)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <DateSelector />
        <NutritionSummary />
        <MealSection />
      </ScrollView>

      <FoodSearchModal />

      <NutritionSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
