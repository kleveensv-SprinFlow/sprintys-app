import React, { useState, useEffect, useCallback } from 'react';
import { MonthlyCalendar, MonthWorkout } from '../../src/shared/components/MonthlyCalendar';
import { workoutService } from '../../src/services/workoutService';
import { periodService } from '../../src/services/periodService';
import { TrainingPeriod } from '../../src/types/period';
import { PeriodModal } from '../../src/features/calendar/components/PeriodModal';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CoachCalendarScreen() {
  // Content scrolls under the floating tab bar
  const tabBarSpace = useTabBarSpace(8);
  const insets = useSafeAreaInsets();
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
    // The month title is the large title; content scrolls under the floating tab bar
    <GlassScreen>
      <MonthlyCalendar
        topInset={insets.top}
        bottomInset={tabBarSpace}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onOpenDate={handleOpenDate}
        monthWorkouts={monthWorkouts}
        periods={periods}
        onPressPeriodBadge={handlePressPeriodBadge}
        onPressCreatePeriod={handleOpenCreatePeriod}
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
    </GlassScreen>
  );
}

