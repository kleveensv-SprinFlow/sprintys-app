import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

// === Workout type colors & abbreviations ===
const TYPE_CONFIG: Record<string, { abbr: string; color: string }> = {
  musculation: { abbr: 'Muscu', color: '#6366F1' },
  force: { abbr: 'Muscu', color: '#6366F1' },
  strength: { abbr: 'Muscu', color: '#6366F1' },
  sprint: { abbr: 'Sprint', color: '#EF4444' },
  vitesse: { abbr: 'Sprint', color: '#EF4444' },
  'vitesse maximale': { abbr: 'Sprint', color: '#EF4444' },
  course: { abbr: 'Sprint', color: '#EF4444' },
  lactique: { abbr: 'Lactique', color: '#F97316' },
  'endurance sprint': { abbr: 'Lactique', color: '#F97316' },
  aérobie: { abbr: 'Aérobie', color: '#3B82F6' },
  endurance: { abbr: 'Aérobie', color: '#3B82F6' },
  technique: { abbr: 'Technique', color: '#14B8A6' },
  pliométrie: { abbr: 'Plio', color: '#8B5CF6' },
  plyo: { abbr: 'Plio', color: '#8B5CF6' },
  puissance: { abbr: 'Plio', color: '#8B5CF6' },
  récupération: { abbr: 'Récup', color: '#10B981' },
  repos: { abbr: 'Récup', color: '#10B981' },
  'jour de repos': { abbr: 'Récup', color: '#10B981' },
  compétition: { abbr: 'Compet', color: '#F59E0B' },
  competition: { abbr: 'Compet', color: '#F59E0B' },
  escaliers: { abbr: 'Escaliers', color: '#A855F7' },
  escalier: { abbr: 'Escaliers', color: '#A855F7' },
  échauffement: { abbr: 'Échauff.', color: '#FB923C' },
  warmup: { abbr: 'Échauff.', color: '#FB923C' },
};

export function getWorkoutTypeConfig(typeSeance: string): { abbr: string; color: string } {
  const lower = (typeSeance || '').toLowerCase().trim();
  if (TYPE_CONFIG[lower]) return TYPE_CONFIG[lower];
  for (const [key, config] of Object.entries(TYPE_CONFIG)) {
    if (lower.includes(key)) return config;
  }
  return { abbr: typeSeance?.substring(0, 8) || '?', color: '#6B7280' };
}

export function getWorkoutColor(typeSeance: string): string {
  return getWorkoutTypeConfig(typeSeance).color;
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

const DAYS_OF_WEEK = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

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
  const [gridHeight, setGridHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const today = useMemo(() => new Date(), []);

  const isSameDay = useCallback((d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  , []);

  const isToday = useCallback((d: Date) => isSameDay(d, today), [today, isSameDay]);

  // Group workouts by day key
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
      Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 100, useNativeDriver: true })
    ]).start(() => {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
      setCurrentMonth(newMonth);
      onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth());
      slideAnim.setValue(-toValue);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 140, useNativeDriver: true })
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
      onMoveShouldSetPanResponder: (_e, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx > 50) navigateMonth('prev');
        else if (gs.dx < -50) navigateMonth('next');
      },
    })
  ).current;

  // === Calendar grid computation ===
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay() - 1;
    if (startDow === -1) startDow = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const totalNeeded = days.length <= 35 ? 35 : 42;
    for (let i = 1; i <= totalNeeded - days.length; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    const numRows = Math.ceil(days.length / 7);
    return { days, numRows };
  }, [currentMonth]);

  const handleSelectDate = useCallback((date: Date) => {
    onSelectDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (date.getMonth() !== currentMonth.getMonth()) {
      navigateMonth(date > currentMonth ? 'next' : 'prev');
    }
  }, [onSelectDate, currentMonth, navigateMonth]);

  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridHeight(e.nativeEvent.layout.height);
  }, []);

  const cellHeight = gridHeight > 0 ? gridHeight / calendarData.numRows : 70;
  const isCurrentMonthToday = currentMonth.getMonth() === today.getMonth() &&
                               currentMonth.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {/* === Header === */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navBtn}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.headerCenter}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navBtn}>
          <Feather name="chevron-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* === Day labels === */}
      <View style={[styles.dayLabels, { borderBottomColor: theme.colors.border }]}>
        {DAYS_OF_WEEK.map((day, index) => (
          <View key={index} style={styles.dayLabelCell}>
            <Text style={[
              styles.dayLabelText,
              { color: index >= 5 ? theme.colors.error : theme.colors.textSecondary }
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* === Grid (fills remaining space) === */}
      <Animated.View
        style={[styles.grid, { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }]}
        onLayout={onGridLayout}
      >
        {calendarData.days.map((item, index) => {
          const selected = isSameDay(item.date, selectedDate);
          const isTodayCell = isToday(item.date);
          const dayWorkouts = getWorkoutsForDay(item.date);
          const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;

          // Max 2 labels shown, rest as "+N"
          const visibleWorkouts = dayWorkouts.slice(0, 2);
          const extraCount = dayWorkouts.length - 2;

          // Borders: right border on all except last column, bottom on all except last row
          const col = index % 7;
          const row = Math.floor(index / 7);
          const isLastCol = col === 6;
          const isLastRow = row === calendarData.numRows - 1;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cell,
                {
                  height: cellHeight,
                  borderRightWidth: 0,
                  borderBottomWidth: 0,
                  borderRightColor: theme.colors.border,
                  borderBottomColor: theme.colors.border,
                  backgroundColor: 'transparent',
                },
              ]}
              onPress={() => handleSelectDate(item.date)}
              activeOpacity={0.5}
            >
              {/* Day number */}
              <View style={styles.dayNumberRow}>
                <View style={[
                  styles.dayNumberWrap,
                  isTodayCell && { backgroundColor: theme.colors.accent },
                  selected && !isTodayCell && { backgroundColor: theme.colors.accent + '18' },
                ]}>
                  <Text style={[
                    styles.dayNumber,
                    {
                      color: !item.isCurrentMonth
                        ? theme.colors.border
                        : isTodayCell
                          ? '#FFFFFF'
                          : selected
                            ? theme.colors.accent
                            : theme.colors.text,
                    },
                    isTodayCell && { fontWeight: '800' },
                  ]}>
                    {item.date.getDate()}
                  </Text>
                </View>
              </View>

              {/* Workout type labels */}
              {item.isCurrentMonth && (
                <View style={styles.labelsContainer}>
                  {visibleWorkouts.map((w, i) => {
                    const config = getWorkoutTypeConfig(w.type_seance);
                    return (
                      <View key={i} style={[styles.typeLabel, { backgroundColor: config.color }]} />
                    );
                  })}
                  {extraCount > 0 && (
                    <View style={[styles.typeLabel, { backgroundColor: theme.colors.textMuted }]} />
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
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  todayBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Day labels
  dayLabels: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Cell
  cell: {
    width: `${100 / 7}%` as any,
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingTop: 3,
  },

  // Day number
  dayNumberRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumberWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Workout labels inside cell
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  typeLabel: {
    borderRadius: 3,
    width: 12,
    height: 4,
  },
  typeLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  extraLabel: {
    fontSize: 9,
    fontWeight: '700',
    paddingLeft: 3,
  },
});
