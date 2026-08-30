import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { HorizontalCalendar } from '../../src/shared/components/HorizontalCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { HybridWorkoutBuilder } from '../../src/features/calendar/components/HybridWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../src/features/calendar/components/StrengthWorkoutBuilder';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { Feather } from '@expo/vector-icons';

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // For building new sessions
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength'>('none');

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
    setBuilderType('none');
    fetchWorkouts(selectedDate);
  };

  const handleAddPress = () => {
    Alert.alert(
      "Type de séance",
      "Quel type de séance souhaitez-vous créer ?",
      [
        {
          text: "Séance Terrain/Piste",
          onPress: () => setBuilderType('hybrid')
        },
        {
          text: "Séance Musculation",
          onPress: () => setBuilderType('strength')
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Périodisation Ribbon (Static for now) */}
      <View style={[styles.periodizationRibbon, { backgroundColor: theme.colors.surfaceLight }]}>
        <View style={[styles.periodDot, { backgroundColor: theme.colors.accent }]} />
        <Text style={[styles.periodText, { color: theme.colors.text }]}>Phase 1 : Développement Général</Text>
        <Feather name="settings" size={16} color={theme.colors.textMuted} />
      </View>

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
              onPress={handleAddPress}
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
              <TouchableOpacity onPress={handleAddPress}>
                <Feather name="plus-circle" size={24} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>

            {workouts.map((w, i) => {
              const dateObj = new Date(w.date_prevue);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let summary = w.description ? (w.description.substring(0, 50) + '...') : '';
              if (w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0) {
                summary = `${w.exercises.length} exercices (Musculation)`;
              }

              return (
                <WorkoutCard 
                  key={w.id || i}
                  time={timeString}
                  title={w.type_seance}
                  type="Séance Coach"
                  status={w.status}
                  summary={summary}
                  onPress={() => {
                    alert('Edition en cours de developpement.');
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modals for Builders */}
      <Modal visible={builderType === 'hybrid'} animationType="slide" presentationStyle="formSheet">
        <HybridWorkoutBuilder 
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
    paddingTop: 50, 
  },
  periodizationRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 8,
  },
  periodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  periodText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
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
    fontSize: 16,
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
