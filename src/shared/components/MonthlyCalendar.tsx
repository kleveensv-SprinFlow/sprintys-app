import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

// === Color mapping for workout types ===
export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  // Sprint / Vitesse
  sprint: '#EF4444',
  vitesse: '#EF4444',
  'vitesse maximale': '#EF4444',
  // Force / Musculation
  musculation: '#6366F1',
  force: '#6366F1',
  strength: '#6366F1',
  // Endurance
  endurance: '#3B82F6',
  'endurance sprint': '#F59E0B',
  // Puissance / Pliométrie
  puissance: '#8B5CF6',
  pliométrie: '#8B5CF6',
  plyo: '#8B5CF6',
  // Récupération
  récupération: '#10B981',
  repos: '#10B981',
  'jour de repos': '#10B981',
  // Technique
  technique: '#14B8A6',
  // Compétition
  compétition: '#F59E0B',
  competition: '#F59E0B',
  // Escaliers / Hybride
  escaliers: '#8B5CF6',
  course: '#EF4444',
  // Échauffement
  échauffement: '#F97316',
  warmup: '#F97316',
};

export function getWorkoutColor(typeSeance: string): string {
  const lower = (typeSeance || '').toLowerCase().trim();
  // Check direct match first
  if (WORKOUT_TYPE_COLORS[lower]) return WORKOUT_TYPE_COLORS[lower];
  // Check partial match
  for (const [key, color] of Object.entries(WORKOUT_TYPE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#6B7280'; // Default grey
}

// === Types ===
export interface MonthWorkout {
  id: string;
  date_prevue: string;
  type_seance: string;
  status?: string;
}

interface MonthlyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markedDates?: Date[];
  monthWorkouts?: MonthWorkout[];
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onSelectDate,
  markedDates = [],
  monthWorkouts = [],
  onMonthChange,
}) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const today = useMemo(() => new Date(), []);

  const isSameDay = useCallback((d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }, []);

  const isToday = useCallback((d: Date) => isSameDay(d, today), [today, isSameDay]);

  // Group workouts by day number for fast lookup
  const workoutsByDay = useMemo(() => {
    const map: Record<string, MonthWorkout[]> = {};
    monthWorkouts.forEach(w => {
      const d = new Date(w.date_prevue);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(w);
    });
    return map;
  }, [monthWorkouts]);

  const getWorkoutsForDay = useCallback((date: Date): MonthWorkout[] => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return workoutsByDay[key] || [];
  }, [workoutsByDay]);

  // === Navigation ===
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const toValue = direction === 'next' ? -40 : 40;

    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 120, useNativeDriver: true })
    ]).start(() => {
      const newMonth = new Date(currentMonth);
      if (direction === 'next') {
        newMonth.setMonth(newMonth.getMonth() + 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() - 1);
      }
      setCurrentMonth(newMonth);
      onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth());

      slideAnim.setValue(-toValue);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 160, useNativeDriver: true })
      ]).start();
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentMonth, onMonthChange, opacityAnim, slideAnim]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(now);
    onMonthChange?.(now.getFullYear(), now.getMonth());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onSelectDate, onMonthChange]);

  // Swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dx > 50) navigateMonth('prev');
        else if (gs.dx < -50) navigateMonth('next');
      },
    })
  ).current;

  // === Calendar grid computation ===
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay() - 1;
    if (startDow === -1) startDow = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding (fill to 35 or 42)
    const totalNeeded = days.length <= 35 ? 35 : 42;
    const remaining = totalNeeded - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const handleSelectDate = useCallback((date: Date) => {
    onSelectDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (date.getMonth() !== currentMonth.getMonth()) {
      navigateMonth(date > currentMonth ? 'next' : 'prev');
    }
  }, [onSelectDate, currentMonth, navigateMonth]);

  // === Render ===
  const isCurrentMonthToday = currentMonth.getMonth() === today.getMonth() &&
                               currentMonth.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {/* === Header: Navigation === */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTH_NAMES[currentMonth.getMonth()]}
          </Text>
          <Text style={[styles.yearText, { color: theme.colors.textMuted }]}>
            {currentMonth.getFullYear()}
          </Text>
        </View>

        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-right" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        {!isCurrentMonthToday && (
          <TouchableOpacity onPress={goToToday} style={[styles.todayBtn, { backgroundColor: theme.colors.accent + '15' }]}>
            <Text style={[styles.todayBtnText, { color: theme.colors.accent }]}>Auj.</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* === Day labels === */}
      <View style={styles.dayLabels}>
        {DAYS_OF_WEEK.map((day, index) => (
          <View key={index} style={styles.dayLabelCell}>
            <Text style={[
              styles.dayLabelText,
              { color: index >= 5 ? theme.colors.textMuted : theme.colors.textSecondary }
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* === Grid === */}
      <Animated.View
        style={[styles.grid, { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }]}
      >
        {calendarDays.map((item, index) => {
          const selected = isSameDay(item.date, selectedDate);
          const isTodayCell = isToday(item.date);
          const dayWorkouts = getWorkoutsForDay(item.date);
          const hasWorkouts = dayWorkouts.length > 0;
          const isSun = item.date.getDay() === 0;
          const isSat = item.date.getDay() === 6;

          // Get unique workout colors for this day (max 3 dots)
          const dotColors = dayWorkouts
            .slice(0, 3)
            .map(w => getWorkoutColor(w.type_seance));
          const extraCount = dayWorkouts.length - 3;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.cell]}
              onPress={() => handleSelectDate(item.date)}
              activeOpacity={0.6}
            >
              {/* Selection ring */}
              {selected && !isTodayCell && (
                <View style={[styles.selectionRing, { borderColor: theme.colors.accent }]} />
              )}

              {/* Today filled circle */}
              {isTodayCell && (
                <View style={[
                  styles.todayCircle,
                  { backgroundColor: theme.colors.accent },
                  selected && { shadowColor: theme.colors.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }
                ]} />
              )}

              {/* Day number */}
              <Text style={[
                styles.dayText,
                {
                  color: !item.isCurrentMonth
                    ? theme.colors.border
                    : isTodayCell
                      ? '#FFFFFF'
                      : (isSun || isSat)
                        ? theme.colors.textMuted
                        : theme.colors.text,
                },
                isTodayCell && styles.dayTextToday,
                selected && !isTodayCell && { color: theme.colors.accent, fontWeight: '800' },
              ]}>
                {item.date.getDate()}
              </Text>

              {/* Workout indicator dots */}
              {hasWorkouts && item.isCurrentMonth && (
                <View style={styles.dotsRow}>
                  {dotColors.map((color, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                  {extraCount > 0 && (
                    <Text style={[styles.dotExtra, { color: theme.colors.textMuted }]}>
                      +{extraCount}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 40,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '500',
  },
  todayBtn: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Day labels
  dayLabels: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dayLabelCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },

  // Cell
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Day text
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    zIndex: 2,
  },
  dayTextToday: {
    fontWeight: '700',
    zIndex: 2,
  },

  // Today circle (behind text)
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    zIndex: 1,
  },

  // Selection ring
  selectionRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    zIndex: 0,
  },

  // Workout dots
  dotsRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotExtra: {
    fontSize: 8,
    fontWeight: '700',
    marginLeft: 1,
  },
});
