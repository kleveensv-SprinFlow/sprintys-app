import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar } from '../../src/shared/components/MonthlyCalendar';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { HybridWorkoutBuilder } from '../../src/features/calendar/components/HybridWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../src/features/calendar/components/StrengthWorkoutBuilder';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const MONTH_NAMES_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayModalVisible, setDayModalVisible] = useState(false);
  
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // For building new sessions
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength'>('none');
  const [builderTitle, setBuilderTitle] = useState('');

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

  const openBuilder = (type: 'hybrid' | 'strength', defaultTitle: string = '') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuilderTitle(defaultTitle);
    setBuilderType(type);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setDayModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendrier" />
      
      {/* Full-screen Calendar */}
      <MonthlyCalendar 
        selectedDate={selectedDate} 
        onSelectDate={handleSelectDate}
        markedDates={getMarkedDates()}
      />

      {/* Day Details Modal */}
      <Modal visible={dayModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
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
                  <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                    Que souhaitez-vous planifier ?
                  </Text>
                  
                  <View style={styles.gridContainer}>
                    {[
                      { id: 'muscu', title: 'Musculation', icon: 'bold', color: '#6366F1', type: 'strength' },
                      { id: 'lactique', title: 'Lactique', icon: 'activity', color: '#EF4444', type: 'hybrid' },
                      { id: 'aerobie', title: 'Aérobie', icon: 'wind', color: '#0EA5E9', type: 'hybrid' },
                      { id: 'technique', title: 'Technique', icon: 'target', color: '#10B981', type: 'hybrid' },
                      { id: 'escalier', title: 'Escaliers', icon: 'trending-up', color: '#8B5CF6', type: 'hybrid' },
                      { id: 'competition', title: 'Compétition', icon: 'award', color: '#F59E0B', type: 'hybrid' },
                    ].map((item) => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={[styles.gridItem, { backgroundColor: item.color + '15' }]} 
                        onPress={() => openBuilder(item.type as 'hybrid' | 'strength', item.title)}
                      >
                        <View style={[styles.gridIconBg, { backgroundColor: item.color }]}>
                          <Feather name={item.icon as any} size={24} color="#fff" />
                        </View>
                        <Text style={[styles.gridItemTitle, { color: theme.colors.text }]}>{item.title}</Text>
                      </TouchableOpacity>
                    ))}
                    
                    {/* Repos - takes full width */}
                    <TouchableOpacity 
                      style={[styles.gridItemFull, { backgroundColor: theme.colors.surfaceLight }]}
                      onPress={() => openBuilder('hybrid', 'Jour de repos')}
                    >
                      <View style={[styles.gridIconBg, { backgroundColor: theme.colors.textMuted }]}>
                        <Feather name="coffee" size={24} color="#fff" />
                      </View>
                      <Text style={[styles.gridItemTitle, { color: theme.colors.text }]}>Jour de repos</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ paddingBottom: 40 }}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                      {workouts.length} SÉANCE(S)
                    </Text>
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

                  <TouchableOpacity style={[styles.actionBtnSecondary, { marginTop: 24 }]} onPress={() => openBuilder('hybrid')}>
                    <Feather name="plus" size={20} color={theme.colors.text} />
                    <Text style={[styles.actionBtnSecondaryText, { color: theme.colors.text }]}>
                      Ajouter une autre séance
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  },
  
  // Day Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
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
    marginBottom: 32,
    textAlign: 'center',
  },
  
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  gridItem: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  gridItemFull: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  gridIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionBtnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
