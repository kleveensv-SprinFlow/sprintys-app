import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { MonthlyCalendar, MonthWorkout } from '../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../src/services/workoutService';
import { periodService } from '../../src/services/periodService';
import { TrainingPeriod } from '../../src/types/period';
import { PeriodModal } from '../../src/features/calendar/components/PeriodModal';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function CoachCalendarScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { teams, fetchTeams, fetchSubgroups, fetchTeamMembers } = useCoachStore();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthWorkouts, setMonthWorkouts] = useState<MonthWorkout[]>([]);
  const [periods, setPeriods] = useState<TrainingPeriod[]>([]);

  // Period Modal state
  const [isPeriodModalVisible, setIsPeriodModalVisible] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<TrainingPeriod | null>(null);

  // === Fetch month overview (workouts & periods) ===
  const loadMonthData = useCallback(async (year: number, month: number) => {
    if (!user?.id) return;
    try {
      const [workoutsData, periodsData] = await Promise.all([
        workoutService.fetchWorkoutsForMonth(user.id, year, month, 'coach'),
        periodService.fetchPeriodsForMonth(user.id, year, month, 'coach'),
      ]);
      setMonthWorkouts(workoutsData || []);
      setPeriods(periodsData || []);
    } catch (error) {
      console.error('Error loading calendar month data:', error);
    }
  }, [user?.id]);

  // Load current month on mount & screen focus
  useFocusEffect(
    useCallback(() => {
      loadMonthData(selectedDate.getFullYear(), selectedDate.getMonth());
      fetchTeams();
    }, [loadMonthData, selectedDate, fetchTeams])
  );

  // Load team details (subgroups, members) for the period modal
  useEffect(() => {
    if (teams.length > 0) {
      const activeTeamId = teams[0].id;
      fetchSubgroups(activeTeamId);
      fetchTeamMembers(activeTeamId);
    }
  }, [teams, fetchSubgroups, fetchTeamMembers]);

  const handleMonthChange = useCallback((year: number, month: number) => {
    loadMonthData(year, month);
  }, [loadMonthData]);

  // === 1st click: Selects date and moves contour smoothly (no navigation) ===
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // === 2nd click on already selected date: Opens day session view ===
  const handleOpenDate = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    router.push(`/(coach)/day/${dateString}`);
  }, [router]);

  // Open modal for editing/deleting an existing period
  const handlePressPeriodBadge = useCallback((period: TrainingPeriod) => {
    setPeriodToEdit(period);
    setIsPeriodModalVisible(true);
  }, []);

  const handleOpenCreatePeriod = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriodToEdit(null);
    setIsPeriodModalVisible(true);
  }, []);

  const handlePeriodSaved = useCallback(() => {
    loadMonthData(selectedDate.getFullYear(), selectedDate.getMonth());
  }, [loadMonthData, selectedDate]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Calendrier"
        rightComponent={
          <TouchableOpacity
            onPress={handleOpenCreatePeriod}
            style={[
              styles.periodActionBtn,
              { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
            ]}
            activeOpacity={0.8}
          >
            <Feather name="layers" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.periodActionBtnText}>Périodisation</Text>
          </TouchableOpacity>
        }
      />

      <MonthlyCalendar
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onOpenDate={handleOpenDate}
        monthWorkouts={monthWorkouts}
        periods={periods}
        onPressPeriodBadge={handlePressPeriodBadge}
        isCoach={true}
        onMonthChange={handleMonthChange}
      />

      {/* Planning Modal for Periods */}
      <PeriodModal
        visible={isPeriodModalVisible}
        onClose={() => setIsPeriodModalVisible(false)}
        selectedDate={selectedDate}
        periodToEdit={periodToEdit}
        onSuccess={handlePeriodSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  periodActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
