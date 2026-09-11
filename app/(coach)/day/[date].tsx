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
import { WorkoutDetailModal } from '../../../src/features/calendar/components/WorkoutDetailModal';
import { RunWorkoutBuilder } from '../../../src/features/calendar/components/RunWorkoutBuilder';
import { StrengthWorkoutBuilder } from '../../../src/features/calendar/components/StrengthWorkoutBuilder';
import { StairsWorkoutBuilder } from '../../../src/features/calendar/components/StairsWorkoutBuilder';
import { getWorkoutColor } from '../../../src/shared/components/MonthlyCalendar';
import { useCoachStore } from '../../../src/store/coach/coachStore';

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
  const [builderType, setBuilderType] = useState<'none' | 'hybrid' | 'strength' | 'escalier'>('none');
  const [builderTitle, setBuilderTitle] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const { teams, fetchTeams, fetchSubgroups, fetchTeamMembers } = useCoachStore();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (teams.length > 0) {
      const activeTeamId = teams[0].id;
      fetchSubgroups(activeTeamId);
      fetchTeamMembers(activeTeamId);
    }
  }, [teams, fetchSubgroups, fetchTeamMembers]);

  const dateString = date as string;

  // Safe date parsing to prevent NaN
  let parsedDate = new Date();
  let formattedTitle = 'Chargement...';

  if (dateString && typeof dateString === 'string' && dateString.includes('-')) {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const day = parseInt(dayStr);

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

  const openBuilder = useCallback((type: 'hybrid' | 'strength' | 'escalier', defaultTitle: string = '') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuilderTitle(defaultTitle);
    setBuilderType(type);
  }, []);

  const CREATION_OPTIONS = [
    { id: 'muscu', title: 'Musculation', icon: 'barbell-outline' as any, color: '#6366F1', type: 'strength' as const },
    { id: 'course', title: 'Course & Sprint', icon: 'stopwatch-outline' as any, color: '#EF4444', type: 'hybrid' as const },
    { id: 'technique', title: 'Séance Technique', icon: 'git-merge-outline' as any, color: '#10B981', type: 'hybrid' as const },
    { id: 'escalier', title: 'Escalier', icon: 'stats-chart-outline' as any, color: '#8B5CF6', type: 'escalier' as const },
    { id: 'repos', title: 'Jour de repos', icon: 'cafe-outline' as any, color: '#6B7280', type: 'hybrid' as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with guaranteed return to the calendar page */}
      <Header
        title={formattedTitle}
        showBackButton
        onBackPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace('/(coach)/calendar');
        }}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Planifier une séance</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Choisissez le type d'entraînement pour cette date
              </Text>
            </View>

            <View style={styles.optionsList}>
              {CREATION_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.appleOptionCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => openBuilder(item.type, item.title)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleIconBox, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.appleOptionTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.workoutsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {workouts.length} séance{workouts.length > 1 ? 's' : ''} programmée{workouts.length > 1 ? 's' : ''}
              </Text>
            </View>

            {workouts.map((w, i) => {
              const dateObj = new Date(w.date_prevue);
              const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const typeColor = getWorkoutColor(w.type_seance);

              let summary = w.description ? (w.description.substring(0, 60) + (w.description.length > 60 ? '...' : '')) : '';
              if (w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0) {
                summary = `${w.exercises.length} exercice${w.exercises.length > 1 ? 's' : ''}`;
              }

              return (
                <View key={w.id || i} style={{ flex: 1 }}>
                  <WorkoutCard
                    time={timeString}
                    title={w.type_seance}
                    type="Séance Coach"
                    status={w.status}
                    summary={summary}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedWorkout(w);
                      setIsDetailModalVisible(true);
                    }}
                  />
                </View>
              );
            })}

            {/* Apple-style floating add button */}
            <TouchableOpacity
              style={[styles.appleAddBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => openBuilder('hybrid')}
              activeOpacity={0.7}
            >
              <View style={[styles.appleAddIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="plus" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.appleAddText, { color: theme.colors.text }]}>Ajouter une autre séance</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* === Builder Modals === */}
      <Modal visible={builderType === 'hybrid'} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setBuilderType('none')}>
        <RunWorkoutBuilder
          date={parsedDate}
          onClose={() => setBuilderType('none')}
          onSave={handleSaveWorkout}
        />
      </Modal>

      <StrengthWorkoutBuilder
        visible={builderType === 'strength'}
        date={parsedDate}
        onClose={() => setBuilderType('none')}
        onSave={handleSaveWorkout}
      />

      <StairsWorkoutBuilder
        visible={builderType === 'escalier'}
        date={parsedDate}
        onClose={() => setBuilderType('none')}
        onSave={handleSaveWorkout}
      />

      <WorkoutDetailModal
        visible={isDetailModalVisible}
        workout={selectedWorkout}
        onClose={() => setIsDetailModalVisible(false)}
      />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },

  // Empty State - Apple Grouped List
  emptyWrapper: {
    paddingTop: 8,
  },
  optionsList: {
    gap: 12,
  },
  appleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  appleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  appleOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Workouts List
  workoutsContainer: {
    gap: 14,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 0,
    marginTop: 8,
    marginBottom: 8,
  },

  // Apple Add Button
  appleAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  appleAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appleAddText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
