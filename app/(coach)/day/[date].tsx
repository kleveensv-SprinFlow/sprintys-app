import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/core/theme';
import { Header } from '../../../src/shared/components/Header';
import { workoutService } from '../../../src/services/workoutService';
import { useAuthStore } from '../../../src/store/authStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WorkoutCard } from '../../../src/shared/components/WorkoutCard';
import { RunWorkoutBuilder } from '../../../src/features/calendar/components/RunWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../../src/features/calendar/components/StrengthWorkoutBuilder';
import { getWorkoutColor } from '../../../src/shared/components/MonthlyCalendar';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function CoachDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthStore();

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength'>('none');
  const [builderTitle, setBuilderTitle] = useState('');

  const parsedDate = new Date(date as string);
  const formattedTitle = `${DAY_NAMES[parsedDate.getDay()]} ${parsedDate.getDate()} ${MONTH_NAMES_FULL[parsedDate.getMonth()]}`;

  const fetchDayWorkouts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await workoutService.fetchWorkoutsForDate(user.id, parsedDate, 'coach');
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

  const handleSaveWorkout = useCallback(() => {
    setBuilderType('none');
    fetchDayWorkouts();
  }, [fetchDayWorkouts]);

  const openBuilder = useCallback((type: 'hybrid' | 'strength', defaultTitle: string = '') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuilderTitle(defaultTitle);
    setBuilderType(type);
  }, []);

  const CREATION_OPTIONS = [
    { id: 'muscu', title: 'Musculation', icon: 'barbell-outline' as any, color: '#6366F1', type: 'strength' as const, iconFamily: 'Ionicons' },
    { id: 'course', title: 'Course à pied', icon: 'stopwatch-outline' as any, color: '#EF4444', type: 'hybrid' as const, iconFamily: 'Ionicons' },
    { id: 'technique', title: 'Séance Technique', icon: 'git-merge-outline' as any, color: '#10B981', type: 'hybrid' as const, iconFamily: 'Ionicons' },
    { id: 'repos', title: 'Jour de repos', icon: 'cafe-outline' as any, color: theme.colors.textMuted, type: 'hybrid' as const, iconFamily: 'Ionicons' },
  ];

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
            {CREATION_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => openBuilder(item.type, item.title)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.workoutsContainer}>
            {workouts.map((w, i) => {
              const dateObj = new Date(w.date_prevue);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const typeColor = getWorkoutColor(w.type_seance);

              let summary = w.description ? (w.description.substring(0, 60) + (w.description.length > 60 ? '...' : '')) : '';
              if (w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0) {
                summary = `${w.exercises.length} exercice\${w.exercises.length > 1 ? 's' : ''}`;
              }

              return (
                <View key={w.id || i} style={styles.workoutRow}>
                  <View style={[styles.colorBar, { backgroundColor: typeColor }]} />
                  <WorkoutCard
                    time={timeString}
                    title={w.type_seance}
                    type="Séance Coach"
                    status={w.status}
                    summary={summary}
                    onPress={() => {
                      alert('Édition complète en développement.');
                    }}
                  />
                </View>
              );
            })}

            {/* Light Add Button when there are already workouts */}
            <TouchableOpacity
              style={[styles.smallAddBtn, { backgroundColor: 'transparent' }]}
              onPress={() => openBuilder('hybrid')}
              activeOpacity={0.7}
            >
              <View style={[styles.smallAddIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="plus" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.smallAddText, { color: theme.colors.accent }]}>Nouvelle séance</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* === Builder Modals === */}
      <Modal visible={builderType === 'hybrid'} animationType="slide" presentationStyle="formSheet">
        <RunWorkoutBuilder
          date={parsedDate}
          onClose={() => setBuilderType('none')}
          onSave={handleSaveWorkout}
        />
      </Modal>

      <Modal visible={builderType === 'strength'} animationType="slide" presentationStyle="formSheet">
        <StrengthWorkoutBuilder
          date={parsedDate}
          onClose={() => setBuilderType('none')}
          onSave={handleSaveWorkout}
        />
      </Modal>
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

  // Empty State - Elegant List
  emptyContainer: {
    gap: 16,
    paddingTop: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },

  // Workouts List
  workoutsContainer: {
    gap: 16,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 0, // margin handled by WorkoutCard internally or we can wrap it
    marginTop: 8,
    marginBottom: 8,
  },

  // Small add btn
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  smallAddIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  smallAddText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
