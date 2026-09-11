import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

// === Workout type colors & abbreviations ===
export const TYPE_CONFIG: Record<string, { abbr: string; color: string }> = {
  musculation: { abbr: 'Muscu', color: '#6366F1' },
  force: { abbr: 'Muscu', color: '#6366F1' },
  strength: { abbr: 'Muscu', color: '#6366F1' },
  sprint: { abbr: 'Sprint', color: '#EF4444' },
  vitesse: { abbr: 'Sprint', color: '#EF4444' },
  'vitesse maximale': { abbr: 'Sprint', color: '#EF4444' },
  course: { abbr: 'Course', color: '#EF4444' },
  lactique: { abbr: 'Lactique', color: '#F97316' },
  'endurance sprint': { abbr: 'Lactique', color: '#F97316' },
  aérobie: { abbr: 'Aérobie', color: '#0EA5E9' },
  endurance: { abbr: 'Aérobie', color: '#0EA5E9' },
  technique: { abbr: 'Technique', color: '#10B981' },
  pliométrie: { abbr: 'Plio', color: '#8B5CF6' },
  plyo: { abbr: 'Plio', color: '#8B5CF6' },
  puissance: { abbr: 'Plio', color: '#8B5CF6' },
  récupération: { abbr: 'Récup', color: '#14B8A6' },
  repos: { abbr: 'Repos', color: '#6B7280' },
  'jour de repos': { abbr: 'Repos', color: '#6B7280' },
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
  return { abbr: typeSeance?.substring(0, 8) || 'Séance', color: '#6B7280' };
}

export function getWorkoutColor(typeSeance: string): string {
  return getWorkoutTypeConfig(typeSeance).color;
}

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

const DAYS_OF_WEEK = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onSelectDate,
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

  // Group workouts by day string key (YYYY-M-D)
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

  // === Safe Month Navigation ===
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const toValue = direction === 'next' ? -50 : 50;

    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setCurrentMonth(prev => {
        const nextMonthDate = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
        onMonthChange?.(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
        return nextMonthDate;
      });

      slideAnim.setValue(-toValue);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true }),
      ]).start();
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onMonthChange, opacityAnim, slideAnim]);

  const navigateMonthRef = useRef(navigateMonth);
  useEffect(() => {
    navigateMonthRef.current = navigateMonth;
  }, [navigateMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setCurrentMonth(targetMonth);
    onSelectDate(now);
    onMonthChange?.(targetMonth.getFullYear(), targetMonth.getMonth());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onSelectDate, onMonthChange]);

  // PanResponder with fresh callback
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx > 40 || gs.vx > 0.4) {
          navigateMonthRef.current('prev');
        } else if (gs.dx < -40 || gs.vx < -0.4) {
          navigateMonthRef.current('next');
        }
      },
    })
  ).current;

  // Calendar grid computation
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

  const totalRows = calendarData.numRows;
  const availableGridHeight = gridHeight > 0 ? gridHeight : 480;
  const cellHeight = Math.floor(availableGridHeight / totalRows);

  const isCurrentMonthToday = currentMonth.getMonth() === today.getMonth() &&
                               currentMonth.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {/* === Preserved Clean Navigation Header === */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTH_NAMES[currentMonth.getMonth()]}
          </Text>
          <Text style={[styles.yearSubtitle, { color: theme.colors.textSecondary }]}>
            {currentMonth.getFullYear()}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {!isCurrentMonthToday && (
            <TouchableOpacity
              onPress={goToToday}
              style={[styles.todayButton, { backgroundColor: theme.colors.accent + '15' }]}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={13} color={theme.colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.todayButtonText, { color: theme.colors.accent }]}>Aujourd'hui</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.navPills, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => navigateMonth('prev')}
              style={styles.navArrow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={18} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={[styles.navDivider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              onPress={() => navigateMonth('next')}
              style={styles.navArrow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-right" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* === Days of Week Header (clean line like screenshot) === */}
      <View style={[styles.dayLabelsRow, { borderBottomColor: theme.colors.border }]}>
        {DAYS_OF_WEEK.map((day, index) => {
          const isSunday = index === 6;
          return (
            <View key={index} style={styles.dayLabelCell}>
              <Text
                style={[
                  styles.dayLabelText,
                  { color: isSunday ? '#E11D48' : theme.colors.textSecondary },
                ]}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* === Grid inspired by the requested visual (tall clean columns, subtle dividers, rounded outline for selected) === */}
      <Animated.View
        style={[
          styles.grid,
          { opacity: opacityAnim, transform: [{ translateX: slideAnim }] },
        ]}
        onLayout={onGridLayout}
      >
        {calendarData.days.map((item, index) => {
          const selected = isSameDay(item.date, selectedDate);
          const isTodayCell = isToday(item.date);
          const dayWorkouts = getWorkoutsForDay(item.date);
          const isSunday = item.date.getDay() === 0;

          const col = index % 7;
          const row = Math.floor(index / 7);
          const isLastCol = col === 6;
          const isLastRow = row === totalRows - 1;

          // Max 2 workouts displayed in the tall cell
          const visibleWorkouts = dayWorkouts.slice(0, 2);
          const extraCount = dayWorkouts.length - 2;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cell,
                {
                  height: cellHeight,
                  borderRightWidth: isLastCol ? 0 : StyleSheet.hairlineWidth,
                  borderBottomWidth: isLastRow ? 0 : StyleSheet.hairlineWidth,
                  borderRightColor: theme.colors.border,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              onPress={() => handleSelectDate(item.date)}
              activeOpacity={0.7}
            >
              {/* Inner wrapper: when selected, creates the rounded outlined box shown in the screenshot */}
              <View
                style={[
                  styles.innerCellContent,
                  selected && [
                    styles.selectedOutlineBox,
                    { borderColor: theme.colors.text },
                  ],
                ]}
              >
                {/* Day number header */}
                <View style={styles.dateHeaderRow}>
                  {isTodayCell ? (
                    // In screenshot: Today has a dark pill/squircle badge
                    <View style={[styles.todayNumberBadge, { backgroundColor: theme.colors.text }]}>
                      <Text style={[styles.todayNumberText, { color: theme.colors.background }]}>
                        {item.date.getDate()}
                      </Text>
                    </View>
                  ) : (
                    // Regular number, dimmed if out of month, red on Sunday
                    <Text
                      style={[
                        styles.dayNumberText,
                        {
                          color: !item.isCurrentMonth
                            ? theme.colors.border
                            : isSunday
                              ? '#E11D48'
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {item.date.getDate()}
                    </Text>
                  )}
                </View>

                {/* Workout entries: subtle tinted cards with left colored stripe (like day 31 in screenshot) */}
                {item.isCurrentMonth && dayWorkouts.length > 0 && (
                  <View style={styles.workoutsContainer}>
                    {visibleWorkouts.map((w, i) => {
                      const config = getWorkoutTypeConfig(w.type_seance);
                      return (
                        <View
                          key={i}
                          style={[
                            styles.workoutStripeCard,
                            {
                              backgroundColor: config.color + '14',
                              borderLeftColor: config.color,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.workoutStripeText, { color: config.color }]}
                            numberOfLines={1}
                          >
                            {config.abbr}
                          </Text>
                        </View>
                      );
                    })}

                    {extraCount > 0 && (
                      <Text style={[styles.extraCountText, { color: theme.colors.textMuted }]}>
                        +{extraCount}
                      </Text>
                    )}
                  </View>
                )}
              </View>
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

  // Preserved Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  yearSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  navPills: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navArrow: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
  },

  // Days of Week Header
  dayLabelsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
    paddingTop: 2,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Full-Screen Grid (like screenshot)
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Each day column cell
  cell: {
    width: '14.285%',
    overflow: 'hidden',
    padding: 1.5,
  },

  // Inner wrapper
  innerCellContent: {
    flex: 1,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },

  // Active/Selected state: rounded rectangle outline border like day 11 in screenshot
  selectedOutlineBox: {
    borderWidth: 1.5,
    borderRadius: 10,
  },

  // Date Header Row
  dateHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 3,
    minHeight: 22,
  },

  // Normal day number
  dayNumberText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Today Badge (black pill badge with white text, like screenshot)
  todayNumberBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumberText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Workouts Container inside tall cell
  workoutsContainer: {
    flex: 1,
    gap: 2,
    marginTop: 2,
    width: '100%',
  },

  // Subtle striped workout card (like day 31 in screenshot)
  workoutStripeCard: {
    borderLeftWidth: 2,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    width: '100%',
  },
  workoutStripeText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  extraCountText: {
    fontSize: 8,
    fontWeight: '800',
    alignSelf: 'center',
    marginTop: 1,
  },
});
