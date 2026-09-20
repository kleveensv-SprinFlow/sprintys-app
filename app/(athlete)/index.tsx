import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/core/theme';
import { AthleteHeader } from '../../src/features/athlete/components/AthleteHeader';
import { AthleteGauges } from '../../src/features/athlete/components/AthleteGauges';
import { SessionCarousel } from '../../src/features/athlete/components/SessionCarousel';
import { WeatherCard } from '../../src/shared/components/WeatherCard';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const theme = useTheme();
  const { fetchMealLogs, currentDate } = useNutritionStore();
  const { user } = useAuthStore();
  const { loadUpcomingWorkouts } = useWorkoutStore();

  useFocusEffect(
    useCallback(() => {
      fetchMealLogs(currentDate);
      if (user?.id) {
        loadUpcomingWorkouts(user.id);
      }
    }, [user?.id, currentDate])
  );
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <AthleteHeader />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AthleteGauges />
          <SessionCarousel />
          <WeatherCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for the custom tab bar at the bottom
  },
});

