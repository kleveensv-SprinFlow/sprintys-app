import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../../src/core/theme';
import { Header } from '../../../../src/shared/components/Header';
import { MonthlyCalendar } from '../../../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../../../src/services/workoutService';
import { useFocusEffect } from '@react-navigation/native';
import { useCoachStore } from '../../../../src/store/coach/coachStore';

export default function CoachAthleteCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get athlete details for header title
  const { teamMembers } = useCoachStore();
  const athleteMember = teamMembers.find(m => m.user_id === id);
  const athleteName = athleteMember?.profile?.full_name || 'Athlète';

  const loadMonthData = useCallback(async (year: number, month: number) => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Pass 'athlete' role to fetch workouts targeted AT this athlete
      const monthWorkouts = await workoutService.fetchWorkoutsForMonth(id, year, month, 'athlete');
      setWorkouts(monthWorkouts);
    } catch (error) {
      console.error('Error fetching athlete workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData(selectedDate.getFullYear(), selectedDate.getMonth());
    }, [loadMonthData, selectedDate])
  );

  const handleMonthChange = useCallback((year: number, month: number) => {
    loadMonthData(year, month);
  }, [loadMonthData]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleOpenDate = useCallback((date: Date) => {
    // Navigate to the day view for this specific athlete
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    router.push(`/(coach)/athlete/${id}/day/${dateStr}`);
  }, [id, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={`Entraînement de ${athleteName.split(' ')[0]}`}
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={styles.calendarContainer}>
        {isLoading && workouts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <MonthlyCalendar
            selectedDate={selectedDate}
            monthWorkouts={workouts as any}
            periods={[]} // Read-only, no periods
            onSelectDate={handleSelectDate}
            onOpenDate={handleOpenDate}
            onMonthChange={handleMonthChange}
            onPressCreatePeriod={() => {}} // Disabled
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
