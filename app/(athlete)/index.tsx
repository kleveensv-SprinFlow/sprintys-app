import React, { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/core/theme';
import { AthleteHeader } from '../../src/features/athlete/components/AthleteHeader';
import { AthleteGauges } from '../../src/features/athlete/components/AthleteGauges';
import { SessionCarousel } from '../../src/features/athlete/components/SessionCarousel';
import { BodyCompositionCard } from '../../src/features/athlete/components/BodyCompositionCard';
import { WeatherCard } from '../../src/shared/components/WeatherCard';
import { useNutritionStore } from '../../src/store/nutrition/nutritionStore';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useFocusEffect } from '@react-navigation/native';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 18) return 'Bonsoir';
  return 'Bonjour';
};

export default function DashboardScreen() {
  const theme = useTheme();
  const { fetchMealLogs, currentDate } = useNutritionStore();
  const { user } = useAuthStore();
  const { loadUpcomingWorkouts } = useWorkoutStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMealLogs(currentDate);
      if (user?.id) {
        loadUpcomingWorkouts(user.id);
      }
    }, [user?.id, currentDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Cards that load their own data (check-in, competition, weight) reload on refreshKey
    setRefreshKey((k) => k + 1);
    try {
      await Promise.all([
        fetchMealLogs(currentDate),
        user?.id ? loadUpcomingWorkouts(user.id) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const now = new Date();
  const dateLabel = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <AthleteHeader />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.textMuted}
              colors={[theme.colors.sprintyBlue]}
            />
          }
        >
          <View style={styles.greeting}>
            <Text style={[styles.greetingDate, { color: theme.colors.textMuted }]}>{dateLabel.toUpperCase()}</Text>
            <Text style={[styles.greetingTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {firstName ? `${getGreeting()} ${firstName}` : getGreeting()}
            </Text>
          </View>

          <AthleteGauges refreshKey={refreshKey} />
          <SessionCarousel />
          <View style={styles.cardGutter}>
            <WeatherCard />
          </View>
          <BodyCompositionCard refreshKey={refreshKey} />
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
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  greetingDate: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  greetingTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  cardGutter: {
    // WeatherCard has no horizontal margin (the coach screen pads its scroll view)
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for the custom tab bar at the bottom
  },
});
