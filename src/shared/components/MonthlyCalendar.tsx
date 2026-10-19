import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Animated,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { glassCard, glassSurface } from '../../core/glass';
import * as Haptics from 'expo-haptics';
import { TrainingPeriod } from '../../types/period';
import { GlassSheen } from './GlassSheen';
import { FrostedBar } from './FrostedBar';
import { PressableScale } from './PressableScale';
import { useFrostedHeader } from '../hooks/useFrostedHeader';


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
  mobilité: { abbr: 'Mobilité', bg: '#CCFBF1', text: '#0F766E', icon: 'leaf-outline' },
  mobilite: { abbr: 'Mobilité', bg: '#CCFBF1', text: '#0F766E', icon: 'leaf-outline' },
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
  /**
   * Safe-area top inset when the calendar is the top of the screen (no <Header />):
   * the month title then acts as the large title, with a frosted bar on scroll.
   */
  topInset?: number;
  /** Bottom padding of the scroll content (e.g. room for the floating tab bar). */
  bottomInset?: number;
  /** Extra control next to the phase line (e.g. the coach's "+ Phase" button). */
  headerAccessory?: React.ReactNode;
  /** External scroll position, to drive a <Header /> placed above the calendar. */
  scrollY?: Animated.Value;
}

const DAYS_OF_WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const BLUE = '#0069E8';
const SUNDAY_RED = '#E11D48';
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
  topInset,
  bottomInset = 24,
  headerAccessory,
  scrollY: externalScrollY,
}) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const frosted = useFrostedHeader();
  const scrollY = externalScrollY || frosted.scrollY;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY]
  );

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

  // Find active period for any date
  const getPeriodForDate = useCallback((date: Date): TrainingPeriod | null => {
    if (!periods || periods.length === 0) return null;
    const dateIso = toLocalDateString(date);
    const matching = periods.filter(p => p.start_date <= dateIso && p.end_date >= dateIso);
    if (matching.length === 0) return null;
    return matching.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [periods]);

  // Active period for currently displayed month or selected day
  // CRITICAL FIX: If selectedDate belongs to currentMonth, check selectedDate.
  // Otherwise, find the active period covering the current month's dates.
  const activeSelectedPeriod = useMemo(() => {
    if (!periods || periods.length === 0) return null;

    const isSelectedInCurrentMonth =
      selectedDate.getFullYear() === currentMonth.getFullYear() &&
      selectedDate.getMonth() === currentMonth.getMonth();

    if (isSelectedInCurrentMonth) {
      return getPeriodForDate(selectedDate);
    }

    // Month boundary check (YYYY-MM-01 to YYYY-MM-LastDay)
    const monthStartIso = toLocalDateString(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const monthEndIso = toLocalDateString(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

    const monthMatching = periods.filter(p => p.start_date <= monthEndIso && p.end_date >= monthStartIso);
    if (monthMatching.length === 0) return null;

    return monthMatching.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [periods, selectedDate, currentMonth, getPeriodForDate]);

  // Month navigation with pure cross-fade
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    Animated.timing(opacityAnim, {
      toValue: 0.05,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setCurrentMonth(prev => {
        const nextMonthDate = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
        onSelectDate(nextMonthDate);
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
  }, [onSelectDate, onMonthChange, opacityAnim]);

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
    // Always six rows (42 cells): the layout below the calendar never jumps from one month to another.
    const trailing = 42 - allDays.length;
    for (let i = 1; i <= trailing; i++) {
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
      onSelectDate(date);
      if (date.getMonth() !== currentMonth.getMonth()) {
        navigateMonth(date > currentMonth ? 'next' : 'prev');
      }
    }
  }, [isSameDay, selectedDate, onOpenDate, onSelectDate, currentMonth, navigateMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    Haptics.selectionAsync();
    if (now.getFullYear() !== currentMonth.getFullYear() || now.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
      onMonthChange?.(now.getFullYear(), now.getMonth());
    }
    onSelectDate(now);
  }, [currentMonth, onMonthChange, onSelectDate]);

  const isViewingToday =
    isSameDay(selectedDate, today) &&
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const selectedWorkouts = getWorkoutsForDay(selectedDate);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedLabel = `${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()].toLowerCase()}`;

  const formatShort = (iso: string) => {
    const d = new Date(iso);
    const m = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'][d.getMonth()];
    return `${d.getDate()} ${m}${m.length <= 4 && !['avr', 'oct', 'nov', 'déc'].includes(m) ? '' : '.'}`;
  };

  // Légende : seulement les types de séances présents dans le mois affiché
  const legend = (() => {
    const seen = new Map<string, string>();
    (monthWorkouts || []).forEach((w) => {
      const d = new Date(w.date_prevue);
      if (d.getFullYear() !== currentMonth.getFullYear() || d.getMonth() !== currentMonth.getMonth()) return;
      const c = getWorkoutTypeConfig(w.type_seance);
      if (!seen.has(c.text)) seen.set(c.text, c.abbr);
    });
    return [...seen.entries()].map(([color, label]) => ({ color, label }));
  })();

  const headerBarOpacity = scrollY.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.container}>
      {/* === Month header: large title + navigation (fixed, frosted on scroll) === */}
      <View style={[styles.header, topInset !== undefined && { paddingTop: topInset + 10 }]}>
        {topInset !== undefined && <FrostedBar opacity={headerBarOpacity} />}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
              {MONTH_NAMES[currentMonth.getMonth()]}
            </Text>
            <Text style={[styles.yearSubtitle, { color: theme.colors.textSecondary }]}>
              {currentMonth.getFullYear()}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={[styles.navPills, glassSurface]}>
              <Pressable onPress={() => navigateMonth('prev')} style={styles.navArrow} hitSlop={8}>
                <Feather name="chevron-left" size={18} color={theme.colors.text} />
              </Pressable>
              <View style={[styles.navDivider, { backgroundColor: theme.colors.hairline }]} />
              <Pressable onPress={() => navigateMonth('next')} style={styles.navArrow} hitSlop={8}>
                <Feather name="chevron-right" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Phase line (coach: tap to edit / create) */}
        {(activeSelectedPeriod || (isCoach && onPressCreatePeriod) || headerAccessory || !isViewingToday) && (
          <View style={styles.phaseRow}>
            {activeSelectedPeriod ? (
              <Pressable
                style={styles.phaseInfo}
                disabled={!(isCoach && onPressPeriodBadge)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressPeriodBadge?.(activeSelectedPeriod);
                }}
              >
                <View style={[styles.phaseDot, { backgroundColor: activeSelectedPeriod.color }]} />
                <Text style={[styles.phaseName, { color: activeSelectedPeriod.color }]} numberOfLines={1}>
                  {activeSelectedPeriod.name}
                </Text>
                {activeSelectedPeriod.start_date && activeSelectedPeriod.end_date && (
                  <Text style={[styles.phaseDates, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {formatShort(activeSelectedPeriod.start_date)} – {formatShort(activeSelectedPeriod.end_date)}
                  </Text>
                )}
                {isCoach && onPressPeriodBadge && (
                  <Feather name="edit-2" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                )}
              </Pressable>
            ) : isCoach && onPressCreatePeriod ? (
              <Pressable
                style={styles.phaseInfo}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressCreatePeriod(selectedDate);
                }}
              >
                <Feather name="plus" size={13} color={BLUE} />
                <Text style={[styles.phaseCreate, { color: BLUE }]}>Définir une phase</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {/* Coach: start another phase while one is shown */}
            {activeSelectedPeriod && isCoach && onPressCreatePeriod && (
              <PressableScale
                haptic="light"
                onPress={() => onPressCreatePeriod(selectedDate)}
                hitSlop={8}
                style={[styles.phaseAddBtn, glassSurface]}
              >
                <Feather name="plus" size={14} color={BLUE} />
                <Text style={styles.phaseAddText}>Phase</Text>
              </PressableScale>
            )}
            {headerAccessory}
            {!isViewingToday && (
              <PressableScale haptic="none" onPress={goToToday} hitSlop={8} style={[styles.todayPill, glassSurface]}>
                <Text style={styles.todayPillText}>Aujourd'hui</Text>
              </PressableScale>
            )}
          </View>
        )}
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
      >
        {/* === Month grid: one frosted card, iOS-style clean days === */}
        <View style={[glassCard, styles.gridCard]} {...panResponder.panHandlers}>
          <GlassSheen radius={22} />
          <View style={styles.dayLabelsRow}>
            {DAYS_OF_WEEK.map((day, index) => (
              <Text
                key={index}
                style={[styles.dayLabelText, { color: index === 6 ? SUNDAY_RED : theme.colors.textSecondary }]}
              >
                {day}
              </Text>
            ))}
          </View>

          <Animated.View style={{ opacity: opacityAnim }}>
            {weeks.map((week, weekIndex) => (
              <View
                key={weekIndex}
                style={[styles.weekRow, weekIndex > 0 && week.some((d) => d.isCurrentMonth) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline }]}
              >
                {week.map((item, dayIndex) => {
                  if (!item.isCurrentMonth) {
                    return <View key={dayIndex} style={styles.cell} />;
                  }
                  const selected = isSameDay(item.date, selectedDate);
                  const isTodayCell = isToday(item.date);
                  const dayWorkouts = getWorkoutsForDay(item.date);
                  const period = getPeriodForDate(item.date);

                  // Phase strip: continuous across the week, rounded where the phase starts / ends
                  let stripStyle = null;
                  if (period) {
                    const prev = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate() - 1);
                    const next = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate() + 1);
                    const startsHere = dayIndex === 0 || getPeriodForDate(prev)?.id !== period.id;
                    const endsHere = dayIndex === 6 || getPeriodForDate(next)?.id !== period.id;
                    stripStyle = {
                      backgroundColor: period.color,
                      left: startsHere ? 6 : 0,
                      right: endsHere ? 6 : 0,
                      borderTopLeftRadius: startsHere ? 2 : 0,
                      borderBottomLeftRadius: startsHere ? 2 : 0,
                      borderTopRightRadius: endsHere ? 2 : 0,
                      borderBottomRightRadius: endsHere ? 2 : 0,
                    };
                  }

                  const circleBg = selected ? (isTodayCell ? BLUE : theme.colors.text) : 'transparent';
                  const numberColor = selected
                    ? '#FFFFFF'
                    : isTodayCell
                      ? BLUE
                      : dayIndex === 6
                        ? SUNDAY_RED
                        : theme.colors.text;

                  return (
                    <Pressable key={dayIndex} style={styles.cell} onPress={() => handleDayPress(item.date)}>
                      <View style={[styles.dayCircle, { backgroundColor: circleBg }]}>
                        <Text
                          style={[
                            styles.dayNumberText,
                            { color: numberColor, fontWeight: selected || isTodayCell ? '800' : '600' },
                          ]}
                        >
                          {item.date.getDate()}
                        </Text>
                      </View>
                      <View style={styles.dotsRow}>
                        {dayWorkouts.slice(0, 3).map((w, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: getWorkoutTypeConfig(w.type_seance).text }]}
                          />
                        ))}
                      </View>
                      {stripStyle && <View style={[styles.phaseStrip, stripStyle, { opacity: 0.55 }]} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        </View>

        {legend.length > 0 && (
          <View style={styles.legendRow} accessibilityLabel={`Légende des couleurs : ${legend.map((l) => l.label).join(', ')}`}>
            {legend.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* === Agenda of the selected day === */}
        <View style={styles.agendaHeader}>
          <Text style={[styles.agendaTitle, { color: theme.colors.text }]}>{selectedLabel}</Text>
          {onOpenDate && (
            <Pressable onPress={() => onOpenDate(selectedDate)} hitSlop={8} style={styles.agendaLink}>
              <Text style={styles.agendaLinkText}>{isCoach ? 'Planifier' : 'Ouvrir'}</Text>
              <Feather name="chevron-right" size={15} color={BLUE} />
            </Pressable>
          )}
        </View>

        {selectedWorkouts.length > 0 ? (
          selectedWorkouts.map((w, i) => {
            const config = getWorkoutTypeConfig(w.type_seance);
            const isCompleted = w.status === 'completed';
            const isCompetition = (w.type_seance || '').toLowerCase().startsWith('comp');
            const isRest = (w.type_seance || '').toLowerCase().includes('repos');
            const isMissed = !isCompleted && !isCompetition && !isRest && selectedDate < todayStart;
            const status = isCompleted
              ? { label: 'Faite', color: theme.colors.success }
              : isMissed
                ? { label: 'Manquée', color: theme.colors.error }
                : { label: isRest ? 'Récupération' : 'Prévue', color: theme.colors.textSecondary };
            return (
              <PressableScale
                key={w.id || i}
                onPress={() => onOpenDate?.(selectedDate)}
                disabled={!onOpenDate}
                haptic={onOpenDate ? 'light' : 'none'}
                style={[glassCard, styles.agendaItem]}
              >
                <GlassSheen radius={22} />
                <View style={[styles.agendaIcon, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon} size={20} color={config.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.agendaItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {w.type_seance}
                  </Text>
                  <Text style={[styles.agendaItemStatus, { color: status.color }]}>{status.label}</Text>
                </View>
                {onOpenDate && <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />}
              </PressableScale>
            );
          })
        ) : (
          <View style={[glassCard, styles.agendaEmpty]}>
            <GlassSheen radius={22} />
            <Feather name="coffee" size={18} color={theme.colors.textSecondary} />
            <Text style={[styles.agendaEmptyText, { color: theme.colors.textSecondary }]}>
              {isCoach ? 'Aucune séance planifiée' : 'Aucune séance · récupération'}
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
  },
  monthTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  yearSubtitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  navPills: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  navArrow: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  navDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
  },

  // Phase line
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 40,
    gap: 8,
  },
  phaseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  phaseDates: {
    fontSize: 13,
    fontWeight: '500',
  },
  phaseCreate: {
    fontSize: 14,
    fontWeight: '700',
  },
  phaseAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  phaseAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Grid
  gridCard: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 6,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabelText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    paddingTop: 5,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, fontWeight: '600' },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseStrip: {
    position: 'absolute',
    bottom: 2,
    height: 3,
  },

  // Agenda
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  agendaTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  agendaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  agendaLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: BLUE,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  agendaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  agendaItemStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  agendaEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agendaEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
