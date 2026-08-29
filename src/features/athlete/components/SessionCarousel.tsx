import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SNAP_INTERVAL = CARD_WIDTH + 12; // theme.spacing.md is 12

export const SessionCarousel = () => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  
  const { user } = useAuthStore();
  const { upcomingWorkouts, loadUpcomingWorkouts } = useWorkoutStore();
  
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadUpcomingWorkouts(user.id);
    }
  }, [user]);

  // Find the index of the workout closest to today to set as default active
  useEffect(() => {
    if (upcomingWorkouts.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      let closestIndex = 0;
      let smallestDiff = Infinity;

      upcomingWorkouts.forEach((w, index) => {
        const date = new Date(w.date_prevue);
        date.setHours(0,0,0,0);
        const diff = Math.abs(date.getTime() - today.getTime());
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
      // Wait for render before scrolling
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ x: closestIndex * SNAP_INTERVAL, animated: false });
        }
      }, 100);
    }
  }, [upcomingWorkouts]);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    if (index !== activeIndex && index >= 0 && index < upcomingWorkouts.length) {
      setActiveIndex(index);
    }
  };

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current || upcomingWorkouts.length === 0) return;
    const newIndex = direction === 'left' ? Math.max(0, activeIndex - 1) : Math.min(upcomingWorkouts.length - 1, activeIndex + 1);
    scrollRef.current.scrollTo({ x: newIndex * SNAP_INTERVAL, animated: true });
  };

  const formatDateLabel = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(d);
    target.setHours(0,0,0,0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays === 1) return "Demain";
    if (diffDays > 1) return `J+${diffDays}`;
    return `J${diffDays}`; // e.g. J-2
  };

  const startSession = (workoutId: string) => {
    // Navigates to the workout runner or calendar view depending on the app flow
    // For now, let's redirect to calendar to view it
    router.push('/(athlete)/calendar');
  };

  if (upcomingWorkouts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Feather name="calendar" size={32} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Aucune séance planifiée</Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textMuted }]}>Profite de ton repos ou contacte ton coach.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => scrollTo('left')} style={[styles.navButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: theme.colors.text }]}>
            {formatDateLabel(upcomingWorkouts[activeIndex]?.date_prevue)}
          </Text>
        </View>

        <TouchableOpacity onPress={() => scrollTo('right')} style={[styles.navButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="chevron-right" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={handleScroll}
      >
        {upcomingWorkouts.map((workout, index) => {
          const isActive = index === activeIndex;
          
          let durationStr = "N/A";
          let intensityStr = "N/A";

          // Calculate summary based on blocks or exercises
          let volume = 0;
          if (workout.blocks && workout.blocks.length > 0) {
             volume = workout.blocks.length;
             durationStr = `${volume * 15} min`; // Rough estimation
             intensityStr = "Variable";
          } else if (workout.exercises && workout.exercises.length > 0) {
             volume = workout.exercises.length;
             durationStr = `${volume * 10} min`;
             intensityStr = "Variable";
          }

          return (
            <TouchableOpacity 
              key={workout.id} 
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
                  size={20} 
                  color={workout.status === 'completed' ? theme.colors.success : isActive ? theme.colors.accent : theme.colors.textMuted} 
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{durationStr}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="layers" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{volume > 0 ? `${volume} Blocs/Exos` : 'Aucun détail'}</Text>
                </View>
              </View>
              {isActive && workout.status !== 'completed' && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 24 },
  emptyCard: {
    marginHorizontal: 16, padding: 32, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 12
  },
  emptyText: { fontSize: 18, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  navButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dateContainer: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: (width - CARD_WIDTH) / 2, paddingVertical: 8 },
  card: { width: CARD_WIDTH, borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1 },
  activeCard: { transform: [{ scale: 1.02 }] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14 },
  activeIndicator: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
});
