import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { HorizontalCalendar } from '../../src/shared/components/HorizontalCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../src/features/calendar/components/WorkoutDetailModal';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { WorkoutSession } from '../../src/features/workout/types';

export default function CalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchWorkouts(selectedDate);
    }
  }, [selectedDate, user?.id]);

  const fetchWorkouts = async (date: Date) => {
    setIsLoading(true);
    
    // Format date bounds for the selected day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('athlete_id', user!.id)
        .gte('date_prevue', startOfDay.toISOString())
        .lte('date_prevue', endOfDay.toISOString())
        .order('date_prevue', { ascending: true });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openWorkoutDetail = (workoutData: any) => {
    // Map Supabase JSONB to local session interface
    const mappedWorkout: WorkoutSession = {
      id: workoutData.id,
      name: workoutData.type_seance,
      startTime: new Date(workoutData.date_prevue).getTime(),
      status: workoutData.status as 'active' | 'completed' | 'cancelled' | 'pending' as any,
      exercises: workoutData.exercises || [],
      blocks: workoutData.blocks || undefined,
    };
    setSelectedWorkout(mappedWorkout);
    setIsModalVisible(true);
  };

  const getMarkedDates = () => {
    // Ideally, fetch a summary of the month to get dots. 
    // For now, we only highlight if there are workouts on the selected day
    return workouts.length > 0 ? [selectedDate] : [];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <HorizontalCalendar 
        selectedDate={selectedDate} 
        onSelectDate={setSelectedDate}
        markedDates={getMarkedDates()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              Aucune séance prévue
            </Text>
            <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
              Journée libre
            </Text>
          </View>
        ) : (
          workouts.map((w, i) => {
            const dateObj = new Date(w.date_prevue);
            const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Calculate total volume or duration as summary
            let summary = '';
            if (w.blocks) {
              summary = `${w.blocks.length} Blocs d'entraînement`;
            } else if (w.exercises) {
              summary = `${w.exercises.length} Exercices`;
            }

            return (
              <WorkoutCard 
                key={w.id || i}
                time={timeString}
                title={w.type_seance}
                type="Séance"
                status={w.status}
                summary={summary}
                onPress={() => openWorkoutDetail(w)}
              />
            );
          })
        )}
      </ScrollView>

      <WorkoutDetailModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
        workout={selectedWorkout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Safe area approx
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  centerContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
  },
});
