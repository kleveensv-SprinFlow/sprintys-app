import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/core/theme';
import { Header } from '../../../src/shared/components/Header';
import { workoutService } from '../../../src/services/workoutService';
import { useAuthStore } from '../../../src/store/authStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { WorkoutCard } from '../../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../../src/features/calendar/components/WorkoutDetailModal';
import { WorkoutSession } from '../../../src/features/workout/types';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AthleteDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthStore();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);

  const parsedDate = new Date(date as string);
  const formattedTitle = \`\${DAY_NAMES[parsedDate.getDay()]} \${parsedDate.getDate()} \${MONTH_NAMES_FULL[parsedDate.getMonth()]}\`;

  const fetchDayWorkouts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await workoutService.fetchWorkoutsForDate(user.id, parsedDate, 'athlete');
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching day workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, date]);

  useEffect(() => {
    fetchDayWorkouts();
  }, [fetchDayWorkouts]);

  const openWorkoutDetail = (workoutData: any) => {
    const mappedWorkout: WorkoutSession = {
      id: workoutData.id,
      name: workoutData.type_seance,
      startTime: new Date(workoutData.date_prevue).getTime(),
      status: workoutData.status as 'active' | 'completed' | 'cancelled' | 'pending' as any,
      exercises: workoutData.exercises || [],
      blocks: workoutData.blocks || undefined,
    };
    setSelectedWorkout(mappedWorkout);
    setIsWorkoutModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={formattedTitle}
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="cafe-outline" size={48} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucune séance</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Profite de ta journée pour récupérer !
            </Text>
          </View>
        ) : (
          <View style={styles.workoutsContainer}>
            {workouts.map((w, i) => {
              const dateObj = new Date(w.date_prevue);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              let summary = '';
              if (w.blocks) summary = \`\${w.blocks.length} Blocs d'entraînement\`;
              else if (w.exercises) summary = \`\${w.exercises.length} Exercices\`;

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
            })}
          </View>
        )}
      </ScrollView>

      <WorkoutDetailModal
        visible={isWorkoutModalVisible}
        onClose={() => setIsWorkoutModalVisible(false)}
        workout={selectedWorkout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 80,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Workouts List
  workoutsContainer: {
    gap: 16,
  },
});
