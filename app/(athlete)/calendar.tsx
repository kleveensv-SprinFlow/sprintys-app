import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar } from '../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';

export default function CalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchWorkouts(selectedDate);
    }
  }, [selectedDate, user?.id]);

  const fetchWorkouts = async (date: Date) => {
    try {
      const data = await workoutService.fetchWorkoutsForDate(user!.id, date, 'athlete');
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const getMarkedDates = () => {
    return workouts.length > 0 ? [selectedDate] : [];
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = \`\${year}-\${month}-\${day}\`;
    router.push(\`/(athlete)/day/\${dateString}\`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendrier" />
      <MonthlyCalendar 
        selectedDate={selectedDate} 
        onSelectDate={handleSelectDate}
        markedDates={getMarkedDates()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
