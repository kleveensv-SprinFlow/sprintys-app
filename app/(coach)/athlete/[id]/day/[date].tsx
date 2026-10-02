import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../../../src/core/theme';
import { Header } from '../../../../../src/shared/components/Header';
import { workoutService } from '../../../../../src/services/workoutService';
import { useFocusEffect } from '@react-navigation/native';
import { WorkoutCard } from '../../../../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../../../../src/features/calendar/components/WorkoutDetailModal';

const MONTH_NAMES_FULL = [
  'janvier', 'fÃ©vrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aoÃ»t', 'septembre', 'octobre', 'novembre', 'dÃ©cembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function CoachAthleteDayScreen() {
  const { id, date } = useLocalSearchParams<{ id: string, date: string }>();
  const router = useRouter();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={dateTitle}
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          SÃ‰ANCES PRÃ‰VUES
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : workouts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Aucune sÃ©ance enregistrÃ©e ce jour.</Text>
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
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
  }
});
