import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '../../../src/shared/components/Header';
import { workoutService } from '../../../src/services/workoutService';
import { useAuthStore } from '../../../src/store/authStore';
import { WorkoutCard } from '../../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../../src/features/calendar/components/WorkoutDetailModal';
import { WorkoutSession } from '../../../src/features/workout/types';
import { GlassScreen } from '../../../src/shared/components/GlassScreen';
import { glassCard } from '../../../src/core/glass';
import { EmptyState } from '../../../src/shared/components/EmptyState';
import { SkeletonCard } from '../../../src/shared/components/Skeleton';
import { useFrostedHeader } from '../../../src/shared/hooks/useFrostedHeader';

import { useRefresh } from '../../../src/shared/hooks/useRefresh';
import { timeLabelOf } from '../../../src/features/calendar/components/TimeField';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function AthleteDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const { user } = useAuthStore();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);

  const dateString = date as string;
  let parsedDate = new Date();
  let formattedTitle = 'Chargement…';
  if (dateString && typeof dateString === 'string') {
    let year, month, day;
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
    } else {
      const d = new Date(dateString);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      parsedDate = new Date(year, month, day);
      const dayName = DAY_NAMES[parsedDate.getDay()] || '';
      const dayNum = parsedDate.getDate() || '';
      const monthName = MONTH_NAMES_FULL[parsedDate.getMonth()] || '';
      formattedTitle = `${dayName} ${dayNum} ${monthName}`.trim();
    } else {
      formattedTitle = 'Date invalide';
    }
  } else {
    formattedTitle = 'Date invalide';
  }

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

  const refreshControl = useRefresh(() => fetchDayWorkouts());
  useEffect(() => {
    fetchDayWorkouts();
  }, [fetchDayWorkouts]);

  const openWorkoutDetail = (workoutData: any) => {
    const mappedWorkout = {
      ...workoutData,
      id: workoutData.id,
      name: workoutData.type_seance,
      type_seance: workoutData.type_seance,
      description: workoutData.description,
      measures: workoutData.measures,
      startTime: new Date(workoutData.date_prevue).getTime(),
      status: workoutData.status,
      exercises: workoutData.exercises || [],
      blocks: workoutData.blocks || undefined,
    };
    setSelectedWorkout(mappedWorkout);
    setIsWorkoutModalVisible(true);
  };

  return (
    <GlassScreen scrollY={scrollY}>
      <Header
        scrollY={scrollY}
        title={formattedTitle}
        showBackButton
        onBackPress={() => {
          router.back();
        }}
      />

      <Animated.ScrollView {...scrollProps} refreshControl={refreshControl} style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <>
            <SkeletonCard avatar />
            <SkeletonCard avatar />
          </>
        ) : workouts.length === 0 ? (
          <View style={glassCard}>
            <EmptyState
              icon="coffee"
              title="Aucune séance"
              message="Profite de ta journée pour récupérer !"
              actionLabel="Voir mon calendrier"
              onAction={() => router.push('/(athlete)/calendar')}
            />
          </View>
        ) : (
          <View style={styles.workoutsContainer}>
            {workouts.map((w, i) => {
              let summary = '';
              if (w.blocks && w.blocks.length > 0) summary = `${w.blocks.length} bloc${w.blocks.length > 1 ? 's' : ''} d’entraînement`;
              else if (w.exercises && w.exercises.length > 0) summary = `${w.exercises.length} exercice${w.exercises.length > 1 ? 's' : ''}`;
              else if (w.type_seance?.toLowerCase().includes('technique')) summary = 'Consignes techniques';
              else if (w.type_seance?.toLowerCase().includes('repos')) summary = 'Récupération';
              else if (w.description) summary = w.description.substring(0, 50);

              return (
                <WorkoutCard
                  key={w.id || i}
                  time={timeLabelOf(w) || undefined}
                  title={w.type_seance}
                  status={w.status}
                  summary={w.source === 'sprinty' ? `Sprinty · ${summary}` : summary}
                  onPress={() => openWorkoutDetail(w)}
                />
              );
            })}
          </View>
        )}
      </Animated.ScrollView>

      <WorkoutDetailModal
        visible={isWorkoutModalVisible}
        onClose={() => setIsWorkoutModalVisible(false)}
        workout={selectedWorkout}
        onUpdated={fetchDayWorkouts}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  workoutsContainer: {
    gap: 12,
  },
});
