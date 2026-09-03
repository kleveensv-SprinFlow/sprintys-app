import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar, MonthWorkout } from '../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/store/authStore';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthWorkouts, setMonthWorkouts] = useState<MonthWorkout[]>([]);

  // === Fetch month overview (lightweight, for calendar dots) ===
  const fetchMonthWorkouts = useCallback(async (year: number, month: number) => {
    if (!user?.id) return;
    try {
      const data = await workoutService.fetchWorkoutsForMonth(user.id, year, month, 'coach');
      setMonthWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching month workouts:', error);
    }
  }, [user?.id]);

  // Load current month on mount & focus
  useFocusEffect(
    useCallback(() => {
      fetchMonthWorkouts(selectedDate.getFullYear(), selectedDate.getMonth());
    }, [fetchMonthWorkouts, selectedDate])
  );

  const handleMonthChange = useCallback((year: number, month: number) => {
    fetchMonthWorkouts(year, month);
  }, [fetchMonthWorkouts]);

  // === Navigate to day view ===
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // YYYY-MM-DD local format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = \`\${year}-\${month}-\${day}\`;

    router.push(\`/(coach)/day/\${dateString}\`);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Calendrier"
        rightComponent={
          <TouchableOpacity
            onPress={() => router.push('/(coach)/library')}
            style={[styles.headerBtn, { backgroundColor: theme.colors.surface }]}
          >
            <Feather name="book" size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        }
      />

      <MonthlyCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        monthWorkouts={monthWorkouts}
        onMonthChange={handleMonthChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
