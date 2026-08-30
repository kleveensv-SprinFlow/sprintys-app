import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SNAP_INTERVAL = CARD_WIDTH + 16; 

export const SessionCarousel = () => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  
  const { user } = useAuthStore();
  const { upcomingWorkouts, loadUpcomingWorkouts } = useWorkoutStore();
  
  const [activeIndex, setActiveIndex] = useState(3); // Default to today (index 3 in a 7-day array)

  // Generate the 7 days timeline (J-3 to J+3)
  const [timelineDays, setTimelineDays] = useState<Date[]>([]);

  useEffect(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    setTimelineDays(days);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadUpcomingWorkouts(user.id);
    }
  }, [user]);

  // Initial scroll to today
  useEffect(() => {
    if (timelineDays.length > 0) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ x: 3 * SNAP_INTERVAL, animated: false });
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
          x: index * 60 - (width / 2) + 30, // Rough centering calculation
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
  };

  const startSession = (workoutId: string) => {
    router.push('/(athlete)/calendar');
  };

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
            return (
              <TouchableOpacity 
                key={index} 
                onPress={() => scrollToDate(index)}
                style={[
                  styles.timelineItem, 
                  active && [styles.timelineItemActive, { backgroundColor: theme.colors.accent }]
                ]}
              >
                <Text style={[
                  styles.timelineDayName, 
                  { color: active ? '#FFF' : theme.colors.textSecondary }
                ]}>
                  {getDayName(date)}
                </Text>
                <Text style={[
                  styles.timelineDateNum, 
                  { color: active ? '#FFF' : theme.colors.text },
                  isToday(date) && !active && { color: theme.colors.accent }
                ]}>
                  {date.getDate()}
                </Text>
                {isToday(date) && !active && (
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
          // Find workout for this specific date
          const dateStr = date.toISOString().split('T')[0];
          const workout = upcomingWorkouts.find(w => w.date_prevue === dateStr);
          const isActive = index === activeIndex;

          if (workout) {
            // Render Workout Card
            let volume = 0;
            let durationStr = "N/A";
            if (workout.blocks && workout.blocks.length > 0) {
               volume = workout.blocks.length;
               durationStr = `${volume * 15} min`;
            } else if (workout.exercises && workout.exercises.length > 0) {
               volume = workout.exercises.length;
               durationStr = `${volume * 10} min`;
            }

            return (
              <TouchableOpacity 
                key={`workout-${index}`} 
                activeOpacity={0.9}
                onPress={() => startSession(workout.id)}
                style={[
                  styles.card, 
                  { backgroundColor: theme.colors.surface, borderColor: isActive ? theme.colors.accent : theme.colors.border },
                  isActive && styles.activeCard
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{workout.type_seance}</Text>
                  <Feather 
                    name={workout.status === 'completed' ? 'check-circle' : 'activity'} 
                    size={24} 
                    color={workout.status === 'completed' ? theme.colors.success : isActive ? theme.colors.accent : theme.colors.textMuted} 
                  />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Feather name="clock" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{durationStr}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="layers" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{volume > 0 ? `${volume} Blocs/Exos` : 'Aucun détail'}</Text>
                  </View>
                </View>
                {isActive && workout.status !== 'completed' && (
                  <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          } else {
            // Render Rest Card
            return (
              <View 
                key={`rest-${index}`} 
                style={[
                  styles.card, 
                  styles.restCard,
                  { backgroundColor: theme.colors.surfaceLight, borderColor: isActive ? theme.colors.border : 'transparent' },
                  isActive && styles.activeCard
                ]}
              >
                <Feather name="coffee" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.restTitle, { color: theme.colors.text }]}>Jour de repos</Text>
                <Text style={[styles.restSub, { color: theme.colors.textSecondary }]}>Profite de ce temps pour la récupération.</Text>
              </View>
            );
          }
        })}
      </ScrollView>
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
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timelineItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    width: 4, height: 4, borderRadius: 2,
    position: 'absolute', bottom: 4,
  },

  carouselContent: { 
    paddingHorizontal: (width - CARD_WIDTH) / 2, 
    paddingBottom: 16,
    paddingTop: 8,
  },
  card: { 
    width: CARD_WIDTH, 
    height: 140,
    borderRadius: 20, 
    padding: 20, 
    marginRight: 16, 
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeCard: { 
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', flex: 1, marginRight: 8 },
  cardBody: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 15, fontWeight: '500' },
  activeIndicator: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  
  restCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  restTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  restSub: {
    fontSize: 13,
    textAlign: 'center',
  }
});
