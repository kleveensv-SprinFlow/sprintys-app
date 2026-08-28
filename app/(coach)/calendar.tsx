import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { HorizontalCalendar } from '../../src/shared/components/HorizontalCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { FastWorkoutBuilder } from '../../src/features/calendar/components/FastWorkoutBuilder';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { Feather } from '@expo/vector-icons';
import { Modal } from 'react-native';

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // For building new sessions
  const [isBuilderVisible, setIsBuilderVisible] = useState(false);

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
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', user!.id)
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

  const getMarkedDates = () => {
    return workouts.length > 0 ? [selectedDate] : [];
  };

  const handleSaveWorkout = () => {
    setIsBuilderVisible(false);
    fetchWorkouts(selectedDate); // Refresh the list
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
              Aucune séance programmée
            </Text>
            
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => setIsBuilderVisible(true)}
            >
              <Feather name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une séance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {workouts.length} séance(s) prévue(s)
              </Text>
              <TouchableOpacity onPress={() => setIsBuilderVisible(true)}>
                <Feather name="plus-circle" size={24} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>

            {workouts.map((w, i) => {
              const dateObj = new Date(w.date_prevue);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
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
                  onPress={() => {
                    // Coach tapping could open an edit view, but for now we do nothing or just show alert
                    alert('Modification en cours de dev');
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Full screen modal for the Fast Builder */}
      <Modal visible={isBuilderVisible} animationType="slide" presentationStyle="formSheet">
        <FastWorkoutBuilder 
          athleteId="test-athlete" // TODO: Add an athlete selector in the builder or here
          date={selectedDate}
          onClose={() => setIsBuilderVisible(false)}
          onSave={handleSaveWorkout}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, 
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
