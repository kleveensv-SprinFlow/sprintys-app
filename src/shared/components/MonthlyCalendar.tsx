import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import * as Haptics from 'expo-haptics';
import { TrainingPeriod } from '../../types/period';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// === Pastel workout banners (matching screenshot style) ===
export const TYPE_CONFIG: Record<string, { abbr: string; bg: string; text: string; icon?: any }> = {
  musculation: { abbr: 'Musculation', bg: '#EDE9FE', text: '#5B21B6', icon: 'barbell-outline' },
  force: { abbr: 'Muscu', bg: '#EDE9FE', text: '#5B21B6', icon: 'barbell-outline' },
  strength: { abbr: 'Muscu', bg: '#EDE9FE', text: '#5B21B6', icon: 'barbell-outline' },
  sprint: { abbr: 'Sprint', bg: '#FFE4E6', text: '#BE123C', icon: 'stopwatch-outline' },
  vitesse: { abbr: 'Vitesse', bg: '#FFE4E6', text: '#BE123C', icon: 'flash-outline' },
  'vitesse maximale': { abbr: 'Vitesse Max', bg: '#FFE4E6', text: '#BE123C', icon: 'flash-outline' },
  course: { abbr: 'Course', bg: '#FFE4E6', text: '#BE123C', icon: 'stopwatch-outline' },
  'course & sprint': { abbr: 'Course', bg: '#FFE4E6', text: '#BE123C', icon: 'stopwatch-outline' },
  piste: { abbr: 'Piste', bg: '#FFE4E6', text: '#BE123C', icon: 'stopwatch-outline' },
  côte: { abbr: 'Côte', bg: '#FEF3C7', text: '#B45309', icon: 'trending-up-outline' },
  cote: { abbr: 'Côte', bg: '#FEF3C7', text: '#B45309', icon: 'trending-up-outline' },
  lactique: { abbr: 'Lactique', bg: '#FFEDD5', text: '#C2410C', icon: 'flame-outline' },
  'endurance sprint': { abbr: 'End. Sprint', bg: '#FFEDD5', text: '#C2410C', icon: 'flame-outline' },
  aérobie: { abbr: 'Aérobie', bg: '#BAE6FD', text: '#0369A1', icon: 'water-outline' },
  endurance: { abbr: 'Endurance', bg: '#BAE6FD', text: '#0369A1', icon: 'pulse-outline' },
  technique: { abbr: 'Technique', bg: '#D1FAE5', text: '#047857', icon: 'git-merge-outline' },
  pliométrie: { abbr: 'Plio', bg: '#F3E8FF', text: '#7E22CE', icon: 'fitness-outline' },
  plyo: { abbr: 'Plio', bg: '#F3E8FF', text: '#7E22CE', icon: 'fitness-outline' },
  puissance: { abbr: 'Puissance', bg: '#F3E8FF', text: '#7E22CE', icon: 'flash-outline' },
  récupération: { abbr: 'Récup', bg: '#CCFBF1', text: '#0F766E', icon: 'leaf-outline' },
  repos: { abbr: 'Repos', bg: '#F1F5F9', text: '#475569', icon: 'cafe-outline' },
  'jour de repos': { abbr: 'Repos', bg: '#F1F5F9', text: '#475569', icon: 'cafe-outline' },
  compétition: { abbr: 'Compétition', bg: '#FEF3C7', text: '#B45309', icon: 'trophy-outline' },
  competition: { abbr: 'Compétition', bg: '#FEF3C7', text: '#B45309', icon: 'trophy-outline' },
  escaliers: { abbr: 'Escaliers', bg: '#E0E7FF', text: '#4338CA', icon: 'stats-chart-outline' },
  escalier: { abbr: 'Escaliers', bg: '#E0E7FF', text: '#4338CA', icon: 'stats-chart-outline' },
  échauffement: { abbr: 'Échauffement', bg: '#FED7AA', text: '#9A3412', icon: 'thermometer-outline' },
  warmup: { abbr: 'Échauff.', bg: '#FED7AA', text: '#9A3412', icon: 'thermometer-outline' },
};

export function getWorkoutTypeConfig(typeSeance: string): { abbr: string; bg: string; text: string; icon: any } {
  const lower = (typeSeance || '').toLowerCase().trim();
  if (TYPE_CONFIG[lower]) return { ...TYPE_CONFIG[lower], icon: TYPE_CONFIG[lower].icon || 'calendar-outline' };
  for (const [key, config] of Object.entries(TYPE_CONFIG)) {
    if (lower.includes(key)) return { ...config, icon: config.icon || 'calendar-outline' };
  }
  return { abbr: typeSeance?.substring(0, 10) || 'Séance', bg: '#E2E8F0', text: '#334155', icon: 'calendar-outline' };
}

export function getWorkoutColor(typeSeance: string): string {
  return getWorkoutTypeConfig(typeSeance).text;
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
  onOpenDate?: (date: Date) => void;
  markedDates?: Date[];
  monthWorkouts?: MonthWorkout[];
  periods?: TrainingPeriod[];
  onPressPeriodBadge?: (period: TrainingPeriod) => void;
  onPressCreatePeriod?: (date: Date) => void;
  isCoach?: boolean;
  onMonthChange?: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDate,
  monthWorkouts = [],
  periods = [],
  onPressPeriodBadge,
  onPressCreatePeriod,
  isCoach = false,
  onMonthChange,
}) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [gridHeight, setGridHeight] = useState(0);

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

  // Find active period for any date (Option A: most recently created has visual priority)
  const getPeriodForDate = useCallback((date: Date): TrainingPeriod | null => {
    if (!periods || periods.length === 0) return null;
    const dateIso = toLocalDateString(date);
    const matching = periods.filter(p => p.start_date <= dateIso && p.end_date >= dateIso);
    if (matching.length === 0) return null;
    return matching.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [periods]);

  // Active period for currently selected day
  const activeSelectedPeriod = useMemo(
    () => getPeriodForDate(selectedDate),
    [getPeriodForDate, selectedDate]
  );

  // Month navigation with pure cross-fade (eliminates horizontal column shift)
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    Animated.timing(opacityAnim, {
      toValue: 0.05,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setCurrentMonth(prev => {
        const nextMonthDate = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
        onMonthChange?.(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
        return nextMonthDate;
      });

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onMonthChange, opacityAnim]);

  const navigateMonthRef = useRef(navigateMonth);
  useEffect(() => {
    navigateMonthRef.current = navigateMonth;
  }, [navigateMonth]);

  // Swipe gesture
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

  // Compute weeks
  const weeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay() - 1;
    if (startDow === -1) startDow = 6;

    const allDays: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      allDays.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      allDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const totalNeeded = 42;
    for (let i = 1; i <= totalNeeded - allDays.length; i++) {
      allDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    const result: { date: Date; isCurrentMonth: boolean }[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [currentMonth]);

  // 2-step click interaction
  const handleDayPress = useCallback((date: Date) => {
    if (isSameDay(date, selectedDate)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onOpenDate) {
        onOpenDate(date);
      } else {
        onSelectDate(date);
      }
    } else {
      Haptics.selectionAsync();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onSelectDate(date);
      if (date.getMonth() !== currentMonth.getMonth()) {
        navigateMonth(date > currentMonth ? 'next' : 'prev');
      }
    }
  }, [isSameDay, selectedDate, onOpenDate, onSelectDate, currentMonth, navigateMonth]);

  const totalWeeks = weeks.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {/* === Header (< Septembre 2026 >) === */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTH_NAMES[currentMonth.getMonth()]}
          </Text>
          <Text style={[styles.yearSubtitle, { color: theme.colors.textSecondary }]}>
            {currentMonth.getFullYear()}
          </Text>
        </View>

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

      {/* === Active Phase Badge or Quick Create Prompt === */}
      {activeSelectedPeriod ? (
        <TouchableOpacity
          style={[
            styles.periodBadgeRow,
            {
              backgroundColor: activeSelectedPeriod.color + '18',
              borderColor: activeSelectedPeriod.color + '45',
            },
          ]}
          onPress={() => {
            if (isCoach && onPressPeriodBadge) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressPeriodBadge(activeSelectedPeriod);
            }
          }}
          activeOpacity={isCoach ? 0.7 : 1}
        >
          <View style={[styles.periodDot, { backgroundColor: activeSelectedPeriod.color }]} />
          <Text style={[styles.periodBadgeText, { color: theme.colors.text }]} numberOfLines={1}>
            Phase active : <Text style={{ fontWeight: '800', color: activeSelectedPeriod.color }}>{activeSelectedPeriod.name}</Text>
          </Text>
          {isCoach && (
            <View style={styles.periodEditHint}>
              <Feather name="edit-3" size={12} color={activeSelectedPeriod.color} />
            </View>
          )}
        </TouchableOpacity>
      ) : isCoach && onPressCreatePeriod ? (
        <TouchableOpacity
          style={[
            styles.periodBadgeRow,
            styles.periodBadgeRowEmpty,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressCreatePeriod(selectedDate);
          }}
          activeOpacity={0.7}
        >
          <Feather name="plus-circle" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.periodBadgeText, { color: theme.colors.textSecondary }]}>
            Définir une phase d'entraînement
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* === Days of Week Header === */}
      <View style={styles.dayLabelsRow}>
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

      {/* === Calendar Grid (with 15% tinted period backgrounds) === */}
      <Animated.View
        style={[
          styles.gridContainer,
          { opacity: opacityAnim },
        ]}
      >
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((item, dayIndex) => {
              const selected = isSameDay(item.date, selectedDate);
              const isTodayCell = isToday(item.date);
              const dayWorkouts = getWorkoutsForDay(item.date);
              const isSunday = dayIndex === 6;
              const hasWorkouts = dayWorkouts.length > 0;

              // Period covering this specific day
              const period = item.isCurrentMonth ? getPeriodForDate(item.date) : null;
              const periodColor = period ? period.color : null;

              // Background tint calculation:
              // - If day is in active period: 15% opacity tint of period color (#RRGGBB26)
              // - If day has workouts but no period: subtle light tint
              // - Else standard clean surface
              const cellBgColor = !item.isCurrentMonth
                ? 'transparent'
                : periodColor
                  ? periodColor + '26' // 15% opacity tint
                  : hasWorkouts
                    ? 'rgba(186, 230, 253, 0.08)'
                    : theme.colors.surface;

              const visibleWorkouts = dayWorkouts.slice(0, 3);
              const extraCount = dayWorkouts.length - 3;

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: cellBgColor,
                      borderColor: selected
                        ? theme.colors.text
                        : periodColor
                          ? periodColor + '40'
                          : theme.colors.border,
                      borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                      opacity: item.isCurrentMonth ? 1 : 0.28,
                    },
                  ]}
                  onPress={() => handleDayPress(item.date)}
                  activeOpacity={0.7}
                >
                  {/* Date number header */}
                  <View style={styles.dateHeaderRow}>
                    {isTodayCell ? (
                      <View style={[styles.todayNumberBadge, { backgroundColor: theme.colors.text }]}>
                        <Text style={[styles.todayNumberText, { color: theme.colors.background }]}>
                          {item.date.getDate()}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.dayNumberText,
                          {
                            color: !item.isCurrentMonth
                              ? theme.colors.border
                              : isSunday
                                ? '#E11D48'
                                : theme.colors.text,
                            fontWeight: selected ? '800' : '600',
                          },
                        ]}
                      >
                        {item.date.getDate()}
                      </Text>
                    )}
                  </View>

                  {/* Horizontal pastel session icons */}
                  {item.isCurrentMonth && hasWorkouts && (
                    <View style={styles.bannersContainer}>
                      {visibleWorkouts.map((w, i) => {
                        const config = getWorkoutTypeConfig(w.type_seance);
                        return (
                          <View
                            key={i}
                            style={[
                              styles.sessionIconPill,
                              { backgroundColor: config.bg },
                            ]}
                          >
                            <Ionicons
                              name={config.icon}
                              size={12}
                              color={config.text}
                            />
                          </View>
                        );
                      })}

                      {extraCount > 0 && (
                        <Text style={[styles.extraCountText, { color: theme.colors.textSecondary }]}>
                          +{extraCount}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
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
  navPills: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navArrow: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
  },

  // Active Phase Badge (Option A: under header, above day labels)
  periodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  periodBadgeRowEmpty: {
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  periodDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodEditHint: {
    marginLeft: 2,
    opacity: 0.8,
  },

  // Days of Week Header
  dayLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingBottom: 6,
    paddingTop: 2,
    gap: 3,
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

  // Grid Container
  gridContainer: {
    flex: 1,
    gap: 4,
  },
  weekRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 2,
  },

  // Cells
  cell: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 2,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },

  // Date number
  dateHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
    marginBottom: 2,
  },
  dayNumberText: {
    fontSize: 13,
  },
  todayNumberBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumberText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Session banners
  bannersContainer: {
    flex: 1,
    gap: 2,
    justifyContent: 'flex-start',
    width: '100%',
  },
  sessionBanner: {
    borderRadius: 4,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    width: '100%',
  },
  sessionIconPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sessionBannerText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  extraCountText: {
    fontSize: 8,
    fontWeight: '800',
    alignSelf: 'center',
    marginTop: 0.5,
  },
});
