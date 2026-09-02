import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar, MonthWorkout, getWorkoutColor } from '../../src/shared/components/MonthlyCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { RunWorkoutBuilder } from '../../src/features/calendar/components/RunWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../src/features/calendar/components/StrengthWorkoutBuilder';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/store/authStore';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayModalVisible, setDayModalVisible] = useState(false);

  // Day workouts (for the modal)
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Month workouts (for the calendar dots)
  const [monthWorkouts, setMonthWorkouts] = useState<MonthWorkout[]>([]);

  // Builder state
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength'>('none');
  const [builderTitle, setBuilderTitle] = useState('');

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

  // === Fetch day details (for the popup) ===
  const fetchDayWorkouts = useCallback(async (date: Date) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await workoutService.fetchWorkoutsForDate(user.id, date, 'coach');
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching day workouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load current month on mount
  useEffect(() => {
    const now = new Date();
    fetchMonthWorkouts(now.getFullYear(), now.getMonth());
  }, [fetchMonthWorkouts]);

  // Reload day when modal opens
  useEffect(() => {
    if (dayModalVisible) {
      fetchDayWorkouts(selectedDate);
    }
  }, [dayModalVisible, selectedDate, fetchDayWorkouts]);

  const handleMonthChange = useCallback((year: number, month: number) => {
    fetchMonthWorkouts(year, month);
  }, [fetchMonthWorkouts]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setDayModalVisible(true);
  }, []);

  const handleSaveWorkout = useCallback(() => {
    setBuilderType('none');
    fetchDayWorkouts(selectedDate);
    // Refresh month dots
    fetchMonthWorkouts(selectedDate.getFullYear(), selectedDate.getMonth());
  }, [selectedDate, fetchDayWorkouts, fetchMonthWorkouts]);

  const openBuilder = useCallback((type: 'hybrid' | 'strength', defaultTitle: string = '') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuilderTitle(defaultTitle);
    setBuilderType(type);
  }, []);

  // Format selected date for modal header
  const formatModalDate = (date: Date): string => {
    const dayName = DAY_NAMES[date.getDay()];
    const dayNum = date.getDate();
    const monthName = MONTH_NAMES_FULL[date.getMonth()];
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum} ${monthName}`;
  };

  // Workout type config for the creation grid
  const WORKOUT_TYPES = [
    { id: 'muscu', title: 'Musculation', icon: 'bold' as const, color: '#6366F1', type: 'strength' as const },
    { id: 'course', title: 'Course', icon: 'activity' as const, color: '#EF4444', type: 'hybrid' as const },
    { id: 'technique', title: 'Technique', icon: 'target' as const, color: '#10B981', type: 'hybrid' as const },
    { id: 'escalier', title: 'Escaliers', icon: 'trending-up' as const, color: '#8B5CF6', type: 'hybrid' as const },
    { id: 'competition', title: 'Compétition', icon: 'award' as const, color: '#F59E0B', type: 'hybrid' as const },
  ];

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

      {/* === Premium Calendar === */}
      <MonthlyCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        monthWorkouts={monthWorkouts}
        onMonthChange={handleMonthChange}
      />

      {/* === Day Details Popup === */}
      <Modal visible={dayModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {formatModalDate(selectedDate)}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
                  {workouts.length > 0
                    ? `${workouts.length} séance${workouts.length > 1 ? 's' : ''} programmée${workouts.length > 1 ? 's' : ''}`
                    : 'Aucune séance'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDayModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
              >
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
              ) : workouts.length === 0 ? (
                /* === Empty state: creation grid === */
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.accent + '10' }]}>
                    <Feather name="plus-circle" size={32} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    Planifier une séance
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                    Que souhaitez-vous programmer ?
                  </Text>

                  <View style={styles.gridContainer}>
                    {WORKOUT_TYPES.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.gridItem, { backgroundColor: item.color + '12', borderColor: item.color + '30' }]}
                        onPress={() => openBuilder(item.type, item.title)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.gridIconBg, { backgroundColor: item.color }]}>
                          <Feather name={item.icon} size={20} color="#fff" />
                        </View>
                        <Text style={[styles.gridItemTitle, { color: theme.colors.text }]}>{item.title}</Text>
                      </TouchableOpacity>
                    ))}

                    {/* Repos */}
                    <TouchableOpacity
                      style={[styles.gridItemFull, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
                      onPress={() => openBuilder('hybrid', 'Jour de repos')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.gridIconBg, { backgroundColor: theme.colors.textMuted }]}>
                        <Feather name="coffee" size={20} color="#fff" />
                      </View>
                      <Text style={[styles.gridItemTitle, { color: theme.colors.text }]}>Jour de repos</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* === Workout list === */
                <View style={{ paddingBottom: 40 }}>
                  {workouts.map((w, i) => {
                    const dateObj = new Date(w.date_prevue);
                    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const typeColor = getWorkoutColor(w.type_seance);

                    let summary = w.description ? (w.description.substring(0, 60) + (w.description.length > 60 ? '...' : '')) : '';
                    if (w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0) {
                      summary = `${w.exercises.length} exercice${w.exercises.length > 1 ? 's' : ''}`;
                    }

                    return (
                      <View key={w.id || i} style={styles.workoutRow}>
                        {/* Color accent bar */}
                        <View style={[styles.colorBar, { backgroundColor: typeColor }]} />
                        <WorkoutCard
                          time={timeString}
                          title={w.type_seance}
                          type="Séance Coach"
                          status={w.status}
                          summary={summary}
                          onPress={() => {
                            alert('Édition en cours de développement.');
                          }}
                        />
                      </View>
                    );
                  })}

                  {/* Add another session button */}
                  <TouchableOpacity
                    style={[styles.addBtn, { borderColor: theme.colors.border }]}
                    onPress={() => openBuilder('hybrid')}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={18} color={theme.colors.accent} />
                    <Text style={[styles.addBtnText, { color: theme.colors.accent }]}>
                      Ajouter une séance
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* === Builder Modals === */}
      <Modal visible={builderType === 'hybrid'} animationType="slide" presentationStyle="formSheet">
        <RunWorkoutBuilder
          date={selectedDate}
          onClose={() => setBuilderType('none')}
          onSave={handleSaveWorkout}
        />
      </Modal>

      <Modal visible={builderType === 'strength'} animationType="slide" presentationStyle="formSheet">
        <StrengthWorkoutBuilder
          date={selectedDate}
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

  // Header button
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Loading
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 28,
  },

  // Creation grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  gridItem: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
  },
  gridItemFull: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
  },
  gridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Workout list
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 0,
    marginTop: 8,
    marginBottom: 28,
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 16,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
