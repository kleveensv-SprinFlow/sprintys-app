import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar, MonthWorkout } from '../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../src/services/workoutService';
import { periodService } from '../../src/services/periodService';
import { TrainingPeriod } from '../../src/types/period';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function CalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthWorkouts, setMonthWorkouts] = useState<MonthWorkout[]>([]);
  const [periods, setPeriods] = useState<TrainingPeriod[]>([]);

  // === Load month overview (workouts & periods in consultation mode) ===
  const loadMonthData = useCallback(async (year: number, month: number) => {
    if (!user?.id) return;
    try {
      const [workoutsData, periodsData] = await Promise.all([
        workoutService.fetchWorkoutsForMonth(user.id, year, month, 'athlete'),
        periodService.fetchPeriodsForMonth(user.id, year, month, 'athlete'),
      ]);
      setMonthWorkouts(workoutsData || []);
      setPeriods(periodsData || []);
    } catch (error) {
      console.error('Error loading athlete calendar month data:', error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData(selectedDate.getFullYear(), selectedDate.getMonth());
    }, [loadMonthData, selectedDate])
  );

  const handleMonthChange = useCallback((year: number, month: number) => {
    loadMonthData(year, month);
  }, [loadMonthData]);

  // 1st click: selects date
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // 2nd click on selected date: opens day view
  const handleOpenDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    router.push(`/(athlete)/day/${dateString}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendrier" />
      <MonthlyCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onOpenDate={handleOpenDate}
        monthWorkouts={monthWorkouts}
        periods={periods}
        isCoach={false}
        onMonthChange={handleMonthChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
