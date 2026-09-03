import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar } from '../../src/shared/components/MonthlyCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { WorkoutDetailModal } from '../../src/features/calendar/components/WorkoutDetailModal';
import { workoutService } from '../../src/services/workoutService';
import { useAuthStore } from '../../src/store/authStore';
import { WorkoutSession } from '../../src/features/workout/types';
import { Feather } from '@expo/vector-icons';

const MONTH_NAMES_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function CalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchWorkouts(selectedDate);
    }
  }, [selectedDate, user?.id]);

  const fetchWorkouts = async (date: Date) => {
    setIsLoading(true);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const data = await workoutService.fetchWorkoutsForDate(user!.id, date, 'athlete');
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getMarkedDates = () => {
    return workouts.length > 0 ? [selectedDate] : [];
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setDayModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendrier" />
      <MonthlyCalendar 
        selectedDate={selectedDate} 
        onSelectDate={handleSelectDate}
        markedDates={getMarkedDates()}
      />

      {/* Day Details Modal */}
      <Modal visible={dayModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedDate.getDate()} {MONTH_NAMES_SHORT[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
              ) : workouts.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Feather name="calendar" size={48} color={theme.colors.textMuted} style={{ opacity: 0.5 }} />
                  </View>
                  <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                    Aucune séance prévue
                  </Text>
                  <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>
                    Journée libre ! Repose-toi bien.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingBottom: 40 }}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                    {workouts.length} SÉANCE(S) PRÉVUE(S)
                  </Text>

                  {workouts.map((w, i) => {
                    const dateObj = new Date(w.date_prevue);
                    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    let summary = '';
                    if (w.blocks) summary = `${w.blocks.length} Blocs d'entraînement`;
                    else if (w.exercises) summary = `${w.exercises.length} Exercices`;

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
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
