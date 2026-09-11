import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';

// === Workout type colors & abbreviations ===
export const TYPE_CONFIG: Record<string, { abbr: string; color: string; bg: string }> = {
  musculation: { abbr: 'Muscu', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' },
  force: { abbr: 'Muscu', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' },
  strength: { abbr: 'Muscu', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' },
  sprint: { abbr: 'Sprint', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  vitesse: { abbr: 'Sprint', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'vitesse maximale': { abbr: 'Sprint', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  course: { abbr: 'Course', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  lactique: { abbr: 'Lactique', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
  'endurance sprint': { abbr: 'Lactique', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
  aérobie: { abbr: 'Aérobie', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)' },
  endurance: { abbr: 'Aérobie', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)' },
  technique: { abbr: 'Technique', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  pliométrie: { abbr: 'Plio', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  plyo: { abbr: 'Plio', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  puissance: { abbr: 'Plio', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  récupération: { abbr: 'Récup', color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.15)' },
  repos: { abbr: 'Repos', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' },
  'jour de repos': { abbr: 'Repos', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' },
  compétition: { abbr: 'Compet', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  competition: { abbr: 'Compet', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  escaliers: { abbr: 'Escaliers', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' },
  escalier: { abbr: 'Escaliers', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' },
  échauffement: { abbr: 'Échauff.', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' },
  warmup: { abbr: 'Échauff.', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' },
};

export function getWorkoutTypeConfig(typeSeance: string): { abbr: string; color: string; bg: string } {
  const lower = (typeSeance || '').toLowerCase().trim();
  if (TYPE_CONFIG[lower]) return TYPE_CONFIG[lower];
  for (const [key, config] of Object.entries(TYPE_CONFIG)) {
    if (lower.includes(key)) return config;
  }
  return { abbr: typeSeance?.substring(0, 8) || 'Séance', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' };
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

  // === Safe Month Navigation (Functional state to eliminate stale closures) ===
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
        Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onMonthChange, opacityAnim, slideAnim]);

  // Keep a fresh reference to navigateMonth for PanResponder
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

  // Swipe gesture handler with ALWAYS up-to-date handler
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

  // Compute 35 or 42 calendar days
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

  // Adaptive widget tile height based on screen size
  const totalRows = calendarData.numRows;
  const verticalGap = 6;
  const availableGridHeight = gridHeight > 0 ? gridHeight : 460;
  const cellHeight = Math.max(58, Math.floor((availableGridHeight - (totalRows - 1) * verticalGap) / totalRows));

  const isCurrentMonthToday = currentMonth.getMonth() === today.getMonth() &&
                               currentMonth.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {/* === Apple-Style Floating Header === */}
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

      {/* === Apple-Style Day Labels === */}
      <View style={styles.dayLabelsRow}>
        {DAYS_OF_WEEK.map((day, index) => {
          const isWeekend = index >= 5;
          return (
            <View key={index} style={styles.dayLabelCell}>
              <Text
                style={[
                  styles.dayLabelText,
                  { color: isWeekend ? theme.colors.error : theme.colors.textMuted },
                ]}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* === Full-Screen Grid with Apple "Widget Tile" Aesthetics === */}
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
          const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;

          // Max 2 workouts displayed as sleek iOS pills, rest shown with a "+N" counter
          const visibleWorkouts = dayWorkouts.slice(0, 2);
          const extraCount = dayWorkouts.length - 2;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cellTile,
                {
                  height: cellHeight,
                  backgroundColor: !item.isCurrentMonth
                    ? 'transparent'
                    : selected
                      ? theme.colors.accent + '12'
                      : isWeekend
                        ? theme.colors.surfaceLight + '70'
                        : theme.colors.surface,
                  borderColor: selected
                    ? theme.colors.accent
                    : isTodayCell
                      ? theme.colors.accent + '60'
                      : theme.colors.border,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  opacity: item.isCurrentMonth ? 1 : 0.35,
                },
              ]}
              onPress={() => handleSelectDate(item.date)}
              activeOpacity={0.7}
            >
              {/* Day Header (Number with Apple style) */}
              <View style={styles.tileHeader}>
                <View
                  style={[
                    styles.dayBadge,
                    isTodayCell && { backgroundColor: theme.colors.accent },
                    selected && !isTodayCell && { backgroundColor: theme.colors.accent + '25' },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: isTodayCell
                          ? '#FFFFFF'
                          : selected
                            ? theme.colors.accent
                            : isWeekend
                              ? theme.colors.error
                              : theme.colors.text,
                        fontWeight: isTodayCell || selected ? '800' : '600',
                      },
                    ]}
                  >
                    {item.date.getDate()}
                  </Text>
                </View>
              </View>

              {/* Workout Type Capsules (Apple iOS Pills) */}
              {item.isCurrentMonth && dayWorkouts.length > 0 && (
                <View style={styles.pillsContainer}>
                  {visibleWorkouts.map((w, i) => {
                    const config = getWorkoutTypeConfig(w.type_seance);
                    return (
                      <View
                        key={i}
                        style={[
                          styles.workoutPill,
                          { backgroundColor: config.bg, borderColor: config.color + '40' },
                        ]}
                      >
                        <View style={[styles.pillDot, { backgroundColor: config.color }]} />
                        <Text
                          style={[styles.workoutPillText, { color: config.color }]}
                          numberOfLines={1}
                        >
                          {config.abbr}
                        </Text>
                      </View>
                    );
                  })}

                  {extraCount > 0 && (
                    <View style={[styles.extraPill, { backgroundColor: theme.colors.surfaceLight }]}>
                      <Text style={[styles.extraPillText, { color: theme.colors.textSecondary }]}>
                        +{extraCount}
                      </Text>
                    </View>
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
    paddingHorizontal: 8,
    paddingBottom: 6,
  },

  // Apple-Style Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
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

  // Day Labels
  dayLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingBottom: 6,
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
    textTransform: 'uppercase',
  },

  // Grid
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },

  // Apple "Widget Tile" Cell
  cellTile: {
    width: '13.6%',
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 3,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 11,
  },

  // Workout Pills Container
  pillsContainer: {
    flex: 1,
    gap: 2,
    justifyContent: 'flex-start',
    width: '100%',
  },
  workoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 2.5,
  },
  workoutPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  extraPill: {
    alignSelf: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 4,
    marginTop: 1,
  },
  extraPillText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
