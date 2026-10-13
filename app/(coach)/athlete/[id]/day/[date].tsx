import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../../../src/core/theme';
import { Header } from '../../../../../src/shared/components/Header';
import { workoutService } from '../../../../../src/services/workoutService';
import { useFocusEffect } from '@react-navigation/native';
import { WorkoutCard } from '../../../../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../../../../src/features/calendar/components/WorkoutDetailModal';
import { GlassScreen } from '../../../../../src/shared/components/GlassScreen';
import { glassCard } from '../../../../../src/core/glass';
import { EmptyState } from '../../../../../src/shared/components/EmptyState';
import { SkeletonCard } from '../../../../../src/shared/components/Skeleton';
import { useFrostedHeader } from '../../../../../src/shared/hooks/useFrostedHeader';

import { useRefresh } from '../../../../../src/shared/hooks/useRefresh';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function CoachAthleteDayScreen() {
  const { id, date } = useLocalSearchParams<{ id: string, date: string }>();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const theme = useTheme();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Parse date
  const selectedDateObj = new Date(date);
  const dayName = DAY_NAMES[selectedDateObj.getDay()];
  const dayNum = selectedDateObj.getDate();
  const monthName = MONTH_NAMES_FULL[selectedDateObj.getMonth()];
  const dateTitle = `${dayName} ${dayNum} ${monthName}`;

  const fetchWorkouts = useCallback(async () => {
    if (!id || !date) return;
    setIsLoading(true);
    try {
      const data = await workoutService.fetchWorkoutsForDate(id, new Date(date), 'athlete');
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching day workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, date]);

  const refreshControl = useRefresh(() => fetchWorkouts());
  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const openWorkoutDetail = (workout: any) => {
    setSelectedWorkout(workout);
    setIsModalVisible(true);
  };

  return (
    <GlassScreen scrollY={scrollY}>
      <Header
        scrollY={scrollY}
        title={dateTitle}
        showBackButton
        onBackPress={() => router.back()}
      />

      <Animated.ScrollView {...scrollProps} refreshControl={refreshControl} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Séances prévues</Text>

        {isLoading ? (
          <>
            <SkeletonCard avatar />
            <SkeletonCard avatar />
          </>
        ) : workouts.length === 0 ? (
          <View style={glassCard}>
            <EmptyState
              compact
              icon="calendar"
              title="Aucune séance"
              message="Rien n’est prévu pour ce jour."
            />
          </View>
        ) : (
          workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              title={w.type_seance || 'Séance'} status={w.status as any}
              onPress={() => openWorkoutDetail(w)}
            />
          ))
        )}
      </Animated.ScrollView>

      {/* Workout Detail Modal (Read-Only) */}
      <WorkoutDetailModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedWorkout(null);
        }}
        workout={selectedWorkout}
        readOnlyAthleteId={id}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
});
