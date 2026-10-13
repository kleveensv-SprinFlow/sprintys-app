import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getWorkoutTypeConfig } from '../../../shared/components/MonthlyCalendar';
import { WorkoutDetailModal } from '../../calendar/components/WorkoutDetailModal';
import { WorkoutSession } from '../../workout/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SNAP_INTERVAL = CARD_WIDTH + 16;

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

export const SessionCarousel = () => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const { user } = useAuthStore();
  const { upcomingWorkouts, loadUpcomingWorkouts } = useWorkoutStore();

  const [activeIndex, setActiveIndex] = useState(7); // Default to today (index 7 in 15-day array)
  const [timelineDays, setTimelineDays] = useState<Date[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);

  // Generate 15 days timeline (J-7 to J+7)
  useEffect(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -7; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    setTimelineDays(days);
  }, []);

  // Fetch upcoming workouts whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadUpcomingWorkouts(user.id);
      }
    }, [user?.id, loadUpcomingWorkouts])
  );

  // Initial scroll centered on today
  useEffect(() => {
    if (timelineDays.length > 0) {
      const today = new Date();
      const todayIdx = timelineDays.findIndex(d => isSameDay(d, today));
      const initialIdx = todayIdx >= 0 ? todayIdx : 0;
      setActiveIndex(initialIdx);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ x: initialIdx * SNAP_INTERVAL, animated: false });
        }
        if (timelineScrollRef.current) {
          timelineScrollRef.current.scrollTo({
            x: initialIdx * 58 - (width / 2) + 29,
            animated: false,
          });
        }
      }, 100);
    }
  }, [timelineDays]);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    if (index !== activeIndex && index >= 0 && index < timelineDays.length) {
      setActiveIndex(index);

      // Center the timeline header
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollTo({
          x: index * 58 - (width / 2) + 29,
          animated: true,
        });
      }
    }
  };

  const scrollToDate = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ x: index * SNAP_INTERVAL, animated: true });
    setActiveIndex(index);
  };

  const getDayName = (date: Date) => {
    const days = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
    return days[date.getDay()];
  };

  const openDayView = (date: Date) => {
    const dateString = toLocalDateString(date);
    router.push(`/(athlete)/day/${dateString}`);
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      {/* Timeline Header */}
      <View style={styles.timelineContainer}>
        <ScrollView
          ref={timelineScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelineScrollContent}
        >
          {timelineDays.map((date, index) => {
            const active = index === activeIndex;
            const isTodayDate = isSameDay(date, new Date());

            const dayWorkouts = upcomingWorkouts.filter(w => {
              if (!w?.date_prevue) return false;
              return isSameDay(new Date(w.date_prevue), date);
            });

            const hasRealWorkout = dayWorkouts.some(
              w => !(w.type_seance || '').toLowerCase().includes('repos')
            );

            return (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToDate(index)}
                style={[
                  styles.timelineItem,
                  active && [styles.timelineItemActive, { backgroundColor: theme.colors.accent }]
                ]}
              >
                <Text
                  style={[
                    styles.timelineDayName,
                    { color: active ? '#FFF' : theme.colors.textSecondary }
                  ]}
                >
                  {getDayName(date)}
                </Text>
                <Text
                  style={[
                    styles.timelineDateNum,
                    { color: active ? '#FFF' : theme.colors.text },
                    isTodayDate && !active && { color: theme.colors.accent }
                  ]}
                >
                  {date.getDate()}
                </Text>

                {/* Workout indicator dot */}
                {hasRealWorkout && !active && (
                  <View style={[styles.workoutDot, { backgroundColor: theme.colors.accent }]} />
                )}

                {/* Today indicator dot (when no workout) */}
                {isTodayDate && !hasRealWorkout && !active && (
                  <View style={[styles.todayDot, { backgroundColor: theme.colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cards Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onMomentumScrollEnd={handleScroll}
      >
        {timelineDays.map((date, index) => {
          // Find all workouts for this specific local date
          const dayWorkouts = upcomingWorkouts.filter(w => {
            if (!w?.date_prevue) return false;
            return isSameDay(new Date(w.date_prevue), date);
          });

          // Prioritize non-rest workouts if available
          const realWorkouts = dayWorkouts.filter(
            w => !(w.type_seance || '').toLowerCase().includes('repos')
          );
          const activeWorkout = realWorkouts.length > 0 ? realWorkouts[0] : dayWorkouts[0];
          const isRest = !activeWorkout || (activeWorkout.type_seance || '').toLowerCase().includes('repos');
          const isActive = index === activeIndex;

          if (!isRest && activeWorkout) {
            // Render Workout Card
            const typeConfig = getWorkoutTypeConfig(activeWorkout.type_seance);
            const isCompleted = activeWorkout.status === 'completed';

            const isCompetition = (activeWorkout.type_seance || '').toLowerCase().startsWith('comp');
            const isMissed = !isCompleted && !isCompetition && date < todayStart;

            let volumeStr = '';
            let volumeIcon: any = 'layers';
            if (activeWorkout.blocks && activeWorkout.blocks.length > 0) {
              const vol = activeWorkout.blocks.length;
              volumeStr = `${vol} bloc${vol > 1 ? 's' : ''}`;
            } else if (activeWorkout.exercises && activeWorkout.exercises.length > 0) {
              const vol = activeWorkout.exercises.length;
              volumeStr = `${vol} exercice${vol > 1 ? 's' : ''}`;
            } else if (activeWorkout.description) {
              // First line only (competitions store "<title>\n📍 <location>")
              volumeStr = activeWorkout.description.split('\n')[0].trim();
              volumeIcon = isCompetition ? 'map-pin' : 'file-text';
            } else {
              volumeStr = 'Séance planifiée';
            }

            const status = isCompleted
              ? { label: 'Fait', icon: 'check-circle', color: theme.colors.success, bg: 'rgba(16, 185, 129, 0.12)' }
              : isMissed
                ? { label: 'Manquée', icon: 'x-circle', color: theme.colors.error, bg: 'rgba(239, 68, 68, 0.12)' }
                : { label: 'Planifié', icon: 'calendar', color: theme.colors.accent, bg: theme.colors.accentMuted };

            const extraCount = realWorkouts.length - 1;

            return (
              <TouchableOpacity
                key={`workout-${index}`}
                activeOpacity={0.88}
                onPress={() => (extraCount === 0 ? openWorkoutDetail(activeWorkout) : openDayView(date))}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isActive ? theme.colors.accent : theme.colors.border,
                  },
                  isActive && styles.activeCard
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleWithIcon}>
                    <View style={[styles.typeIconCircle, { backgroundColor: typeConfig.bg }]}>
                      <Ionicons name={typeConfig.icon} size={20} color={typeConfig.text} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {activeWorkout.type_seance}
                      </Text>
                      {extraCount > 0 && (
                        <Text style={[styles.extraSessionsText, { color: theme.colors.accent }]}>
                          +{extraCount} autre{extraCount > 1 ? 's' : ''} séance{extraCount > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Feather name={status.icon as any} size={13} color={status.color} />
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={[styles.infoRow, { flexShrink: 1 }]}>
                    <Feather name={volumeIcon} size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.colors.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                      {volumeStr}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={styles.actionPrompt}>
                    <Text style={[styles.actionPromptText, { color: theme.colors.accent }]}>
                      {extraCount > 0 ? 'Voir la journée' : isCompleted ? 'Voir le bilan' : 'Voir la séance'}
                    </Text>
                    <Feather name="chevron-right" size={14} color={theme.colors.accent} />
                  </View>
                </View>

                {isActive && !isCompleted && !isMissed && (
                  <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          } else {
            // Render Rest Card: coach rest notes live in the day view, otherwise lead to the calendar
            const hasRestNote = !!activeWorkout;
            return (
              <TouchableOpacity
                key={`rest-${index}`}
                activeOpacity={0.88}
                onPress={() => (hasRestNote ? openDayView(date) : router.push('/(athlete)/calendar'))}
                style={[
                  styles.card,
                  styles.restCard,
                  {
                    backgroundColor: theme.colors.surfaceLight,
                    borderColor: isActive ? theme.colors.accent : 'transparent',
                  },
                  isActive && styles.activeCard
                ]}
              >
                <Feather name="coffee" size={22} color={theme.colors.textMuted} style={{ marginBottom: 4 }} />
                <Text style={[styles.restTitle, { color: theme.colors.text }]}>Jour de repos</Text>
                <Text style={[styles.restSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {activeWorkout?.description || 'Profite de ce temps pour la récupération.'}
                </Text>
                <View style={[styles.actionPrompt, { marginTop: 10 }]}>
                  <Text style={[styles.actionPromptText, { color: theme.colors.accent }]}>
                    {hasRestNote ? 'Voir les consignes' : 'Voir mon calendrier'}
                  </Text>
                  <Feather name="chevron-right" size={14} color={theme.colors.accent} />
                </View>
              </TouchableOpacity>
            );
          }
        })}
      </ScrollView>

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
  container: { marginVertical: 16 },

  timelineContainer: {
    marginBottom: 16,
  },
  timelineScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  timelineItem: {
    width: 50,
    height: 62,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  timelineItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineDayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDateNum: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 4,
  },

  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingBottom: 16,
    paddingTop: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: 145,
    borderRadius: 20,
    padding: 18,
    marginRight: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  activeCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  extraSessionsText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '25%',
    right: '25%',
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  restCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    borderWidth: 0,
  },
  restTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  restSub: {
    fontSize: 13,
    textAlign: 'center',
  },
});


