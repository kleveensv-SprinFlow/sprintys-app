import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/core/theme';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayModalVisible, setDayModalVisible] = useState(false);
  
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

  const openBuilder = (type: 'hybrid' | 'strength') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuilderType(type);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setDayModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      
      {/* Full-screen Calendar */}
      <MonthlyCalendar 
        selectedDate={selectedDate} 
        onSelectDate={handleSelectDate}
        markedDates={getMarkedDates()}
      />

      {/* Floating Action Button (pill style) */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.colors.surface }]}
          onPress={() => setDayModalVisible(true)}
        >
          <Text style={[styles.fabText, { color: theme.colors.textMuted }]}>
            Ajouter le {selectedDate.getDate()} {MONTH_NAMES_SHORT[selectedDate.getMonth()]}
          </Text>
          <Feather name="plus" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

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
                  <View style={styles.emptyIconContainer}>
                    <Feather name="calendar" size={48} color={theme.colors.textMuted} style={{ opacity: 0.5 }} />
                  </View>
                  <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                    Rien de prévu pour ce jour.
                  </Text>
                  
                  {/* Beautiful Custom Buttons */}
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => openBuilder('hybrid')}>
                    <View style={styles.actionIconBg}>
                      <Feather name="activity" size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.actionBtnTitle}>Ajouter une séance</Text>
                      <Text style={styles.actionBtnSub}>Piste, Terrain ou Hybride</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#fff" style={styles.actionChevron} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border, borderWidth: 1, marginTop: 12 }]} onPress={() => openBuilder('strength')}>
                    <View style={[styles.actionIconBg, { backgroundColor: theme.colors.text }]}>
                      <Feather name="bold" size={20} color={theme.colors.background} />
                    </View>
                    <View>
                      <Text style={[styles.actionBtnTitle, { color: theme.colors.text }]}>Séance de Musculation</Text>
                      <Text style={[styles.actionBtnSub, { color: theme.colors.textMuted }]}>En salle, force, haltérophilie</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.text} style={styles.actionChevron} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtnSecondary}>
                    <Feather name="coffee" size={20} color={theme.colors.text} />
                    <Text style={[styles.actionBtnSecondaryText, { color: theme.colors.text }]}>
                      Ajouter un jour de repos
                    </Text>
                  </TouchableOpacity>
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
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 32,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
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
  
  // Custom Action Buttons
  actionBtnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionBtnTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  actionChevron: {
    marginLeft: 'auto',
  },
  
  actionBtnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginTop: 8,
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
