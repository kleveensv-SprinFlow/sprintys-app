import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getWorkoutTypeConfig } from '../../../shared/components/MonthlyCalendar';
import { WorkoutDetailModal } from '../../calendar/components/WorkoutDetailModal';
import { WorkoutSession } from '../../workout/types';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard, glassFill } from '../../../shared/components/DashboardCard';
import { Grain } from '../../../shared/components/Grain';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = width - 56;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const DAY_ITEM_WIDTH = 46;
const DAY_ITEM_STRIDE = DAY_ITEM_WIDTH + 6;

const DAY_SHORT = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
const DAY_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isRestType = (w: any) => (w?.type_seance || '').toLowerCase().includes('repos');

const getRelativeDayLabel = (date: Date, today: Date) => {
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  return `${DAY_LONG[date.getDay()]} ${date.getDate()}`;
};

const selectionHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    Haptics.selectionAsync();
  } catch (e) {
    // ignore
  }
};

export const SessionCarousel = () => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const { user } = useAuthStore();
  const { upcomingWorkouts, loadUpcomingWorkouts } = useWorkoutStore();

  const [activeIndex, setActiveIndex] = useState(7); // Default to today (index 7 in 15-day array)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);

  const scrollX = useRef(new Animated.Value(7 * SNAP_INTERVAL)).current;
  const activeIndexRef = useRef(7);
  // While a tap on the week strip animates the carousel, don't tick through every day passed
  const ignoreScrollUntil = useRef(0);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 15 days timeline (J-7 to J+7)
  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date(todayStart);
      d.setDate(todayStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [todayStart]);

  const workoutsByDay = useMemo(
    () =>
      timelineDays.map((date) =>
        upcomingWorkouts.filter((w) => w?.date_prevue && isSameDay(new Date(w.date_prevue), date))
      ),
    [timelineDays, upcomingWorkouts]
  );

  // Fetch upcoming workouts whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadUpcomingWorkouts(user.id);
      }
    }, [user?.id, loadUpcomingWorkouts])
  );

  const centerTimeline = (index: number, animated: boolean) => {
    timelineScrollRef.current?.scrollTo({
      x: Math.max(0, index * DAY_ITEM_STRIDE - width / 2 + 16 + DAY_ITEM_WIDTH / 2),
      animated,
    });
  };

  // Initial position: today
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 7 * SNAP_INTERVAL, animated: false });
      centerTimeline(7, false);
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const setActive = (index: number, withHaptic: boolean) => {
    if (index === activeIndexRef.current || index < 0 || index >= timelineDays.length) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    centerTimeline(index, true);
    if (withHaptic) selectionHaptic();
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (event: any) => {
      if (Date.now() < ignoreScrollUntil.current) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
      setActive(index, true);
    },
  });

  const scrollToDate = (index: number) => {
    ignoreScrollUntil.current = Date.now() + 450;
    setActive(index, true);
    scrollRef.current?.scrollTo({ x: index * SNAP_INTERVAL, animated: true });
  };

  const openDayView = (date: Date) => {
    router.push(`/(athlete)/day/${toLocalDateString(date)}`);
  };

  const openWorkoutDetail = (workoutData: any) => {
    setSelectedWorkout({
      ...workoutData,
      id: workoutData.id,
      name: workoutData.type_seance,
      type_seance: workoutData.type_seance,
      description: workoutData.description,
      measures: workoutData.measures,
      startTime: new Date(workoutData.date_prevue).getTime(),
      status: workoutData.status,
      exercises: workoutData.exercises || [],
      blocks: workoutData.blocks || undefined,
    });
    setIsWorkoutModalVisible(true);
  };

  const renderCardContent = (date: Date, dayWorkouts: any[]) => {
    const realWorkouts = dayWorkouts.filter((w) => !isRestType(w));
    const activeWorkout = realWorkouts[0] || dayWorkouts[0];
    const dayLabel = getRelativeDayLabel(date, todayStart);

    // Rest day (no workout, or a coach "repos" entry with notes)
    if (!activeWorkout || isRestType(activeWorkout)) {
      const hasRestNote = !!activeWorkout;
      return {
        onPress: () => (hasRestNote ? openDayView(date) : router.push('/(athlete)/calendar')),
        content: (
          <>
            <View style={styles.cardTopRow}>
              <Text style={[styles.kicker, { color: theme.colors.textSecondary }]}>{dayLabel}</Text>
            </View>
            <View style={styles.cardMainRow}>
              <View style={[styles.typeTile, { backgroundColor: glassFill }]}>
                <Feather name="coffee" size={20} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.cardTitles}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>Repos</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {activeWorkout?.description?.split('\n')[0] || 'Récupération, hydratation, sommeil'}
                </Text>
              </View>
            </View>
            <View style={[styles.cardButton, { backgroundColor: glassFill }]}>
              <Text style={[styles.cardButtonText, { color: theme.colors.textSecondary }]}>
                {hasRestNote ? 'Voir les consignes' : 'Voir mon calendrier'}
              </Text>
              <Feather name="chevron-right" size={15} color={theme.colors.textSecondary} />
            </View>
          </>
        ),
      };
    }

    const typeConfig = getWorkoutTypeConfig(activeWorkout.type_seance);
    const isCompleted = activeWorkout.status === 'completed';
    const isCompetition = (activeWorkout.type_seance || '').toLowerCase().startsWith('comp');
    const isMissed = !isCompleted && !isCompetition && date < todayStart;
    const extraCount = realWorkouts.length - 1;

    let summary = 'Séance planifiée';
    if (activeWorkout.blocks?.length > 0) {
      const n = activeWorkout.blocks.length;
      summary = `${n} bloc${n > 1 ? 's' : ''}`;
    } else if (activeWorkout.exercises?.length > 0) {
      const n = activeWorkout.exercises.length;
      summary = `${n} exercice${n > 1 ? 's' : ''}`;
    } else if (activeWorkout.description) {
      // First line only (competitions store "<title>\n📍 <location>")
      summary = activeWorkout.description.split('\n')[0].trim() || summary;
    }
    if (extraCount > 0) summary += ` · +${extraCount} séance${extraCount > 1 ? 's' : ''}`;

    const status = isCompleted
      ? { label: 'Fait', icon: 'check', color: theme.colors.success, bg: 'rgba(16, 185, 129, 0.12)' }
      : isMissed
        ? { label: 'Manquée', icon: 'x', color: theme.colors.error, bg: 'rgba(239, 68, 68, 0.1)' }
        : null;

    return {
      onPress: () => (extraCount === 0 ? openWorkoutDetail(activeWorkout) : openDayView(date)),
      content: (
        <>
          <View style={styles.cardTopRow}>
            <Text style={[styles.kicker, { color: typeConfig.text }]}>{dayLabel}</Text>
            {status && (
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <Feather name={status.icon as any} size={12} color={status.color} />
                <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMainRow}>
            <View style={[styles.typeTile, { backgroundColor: typeConfig.bg }]}>
              <Ionicons name={typeConfig.icon} size={22} color={typeConfig.text} />
            </View>
            <View style={styles.cardTitles}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {activeWorkout.type_seance}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {summary}
              </Text>
            </View>
          </View>
          <View style={[styles.cardButton, { backgroundColor: typeConfig.bg }]}>
            <Text style={[styles.cardButtonText, { color: typeConfig.text }]}>
              {extraCount > 0 ? 'Voir la journée' : isCompleted ? 'Voir le bilan' : 'Voir la séance'}
            </Text>
            <Feather name="chevron-right" size={15} color={typeConfig.text} />
          </View>
        </>
      ),
    };
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ma semaine</Text>
        <PressableScale haptic="selection" onPress={() => router.push('/(athlete)/calendar')} hitSlop={10}>
          <Text style={[styles.sectionLink, { color: theme.colors.sprintyBlue }]}>Calendrier</Text>
        </PressableScale>
      </View>

      {/* Week strip */}
      <ScrollView
        ref={timelineScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScrollContent}
      >
        {timelineDays.map((date, index) => {
          const active = index === activeIndex;
          const isTodayDate = isSameDay(date, todayStart);
          const firstReal = workoutsByDay[index].find((w) => !isRestType(w));
          const dotColor = firstReal ? getWorkoutTypeConfig(firstReal.type_seance).text : 'transparent';

          return (
            <PressableScale
              key={index}
              haptic="none"
              activeScale={0.9}
              onPress={() => scrollToDate(index)}
              style={styles.timelineItem}
            >
              <Text
                style={[
                  styles.timelineDayName,
                  { color: isTodayDate ? theme.colors.sprintyBlue : theme.colors.textSecondary },
                ]}
              >
                {DAY_SHORT[date.getDay()]}
              </Text>
              <View
                style={[
                  styles.timelineCircle,
                  active && { backgroundColor: isTodayDate ? theme.colors.sprintyBlue : theme.colors.text },
                ]}
              >
                <Text
                  style={[
                    styles.timelineDateNum,
                    { color: active ? '#FFF' : isTodayDate ? theme.colors.sprintyBlue : theme.colors.text },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View style={[styles.workoutDot, { backgroundColor: dotColor }]} />
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Cards carousel */}
      <Animated.ScrollView
        ref={scrollRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {timelineDays.map((date, index) => {
          const { onPress, content } = renderCardContent(date, workoutsByDay[index]);
          const inputRange = [(index - 1) * SNAP_INTERVAL, index * SNAP_INTERVAL, (index + 1) * SNAP_INTERVAL];
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });

          return (
            <Animated.View
              key={index}
              style={[styles.cardSlot, { opacity, transform: [{ scale }] }]}
            >
              <PressableScale onPress={onPress} unstable_pressDelay={70} style={[glassCard, styles.card]}>
                <Grain radius={22} />
                {content}
              </PressableScale>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <WorkoutDetailModal
        visible={isWorkoutModalVisible}
        onClose={() => setIsWorkoutModalVisible(false)}
        workout={selectedWorkout}
        onUpdated={() => user?.id && loadUpcomingWorkouts(user.id)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 0 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionLink: {
    fontSize: 15,
    fontWeight: '600',
  },

  timelineScrollContent: {
    paddingHorizontal: 16,
    gap: DAY_ITEM_STRIDE - DAY_ITEM_WIDTH,
  },
  timelineItem: {
    width: DAY_ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
  },
  timelineDayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  timelineCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDateNum: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
  },

  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardSlot: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  card: {
    height: 168,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  cardButton: {
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
