import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';

const { width } = Dimensions.get('window');

const WorkoutScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (isFocused) {
      fetchWorkouts();
    }
  }, [isFocused]);

  const fetchWorkouts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des séances:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + (weekOffset * 7);
    const startOfWeek = new Date(today.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekOffset]);

  const monthName = useMemo(() => {
    return weekDays[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [weekDays]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const getDayStatus = (date: Date) => {
    const hasCompetition = workouts.some(w => w.is_competition && isSameDay(new Date(w.created_at), date));
    if (hasCompetition) return 'COMPETITION';

    // Vérification préparation (J+1 ou J+2)
    const tomorrow = new Date(date); tomorrow.setDate(date.getDate() + 1);
    const inTwoDays = new Date(date); inTwoDays.setDate(date.getDate() + 2);

    const hasCompSoon = workouts.some(w => 
      w.is_competition && (isSameDay(new Date(w.created_at), tomorrow) || isSameDay(new Date(w.created_at), inTwoDays))
    );
    if (hasCompSoon) return 'PREPARATION';

    return 'NORMAL';
  };

  const getWorkoutsForDay = (date: Date) => {
    return workouts.filter(w => isSameDay(new Date(w.created_at), date));
  };

  const renderWorkoutMiniCard = (workout: any) => {
    if (workout.is_competition) {
      const city = workout.city || 'STADE INCONNU';
      const firstEvent = workout.competition_schedule?.[0];
      const summary = firstEvent ? `${firstEvent.time} - ${firstEvent.event}` : 'DÉTAILS...';

      return (
        <TouchableOpacity 
          key={workout.id} 
          style={[styles.miniCardWrapper, styles.compMiniCardBorder]}
          onPress={() => navigation.navigate('AddWorkout', { workout: workout })}
        >
          <BlurView intensity={20} tint="light" style={styles.miniCard}>
            <View style={styles.miniCardHeader}>
              <Text style={[styles.miniType, { color: '#FFD700' }]}>COMPÉTITION</Text>
              <Text style={styles.miniRpe}>STADE : {city.toUpperCase()}</Text>
            </View>
            <Text style={styles.miniSummary} numberOfLines={1}>{summary.toUpperCase()}</Text>
          </BlurView>
        </TouchableOpacity>
      );
    }

    const heartLine = workout.notes?.split('\n').find((l: string) => l.includes('CŒUR DE SÉANCE :') || l.includes('MUSCULATION :'));
    const summary = heartLine ? heartLine.split(':')[1]?.trim()?.split('|')[0]?.trim() : (workout.notes?.split('\n')[0] || 'Détails...');
    
    return (
      <TouchableOpacity 
        key={workout.id} 
        style={styles.miniCardWrapper}
        onPress={() => navigation.navigate('AddWorkout', { workout: workout })}
      >
        <BlurView intensity={20} tint="light" style={styles.miniCard}>
          <View style={styles.miniCardHeader}>
            <Text style={styles.miniType}>{workout.type}</Text>
            <Text style={styles.miniRpe}>SCORE : {workout.rpe}</Text>
          </View>
          <Text style={styles.miniSummary} numberOfLines={1}>{summary}</Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Agenda</Text>
        </View>

        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} style={styles.navBtn}><Text style={styles.navArrow}>←</Text></TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)} style={styles.navBtn}><Text style={styles.navArrow}>→</Text></TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.agendaContainer}>
            {weekDays.map((date, index) => {
              const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
              const dayNum = date.getDate();
              const dayWorkouts = getWorkoutsForDay(date);
              const isToday = isSameDay(date, new Date());
              const status = getDayStatus(date);

              return (
                <View key={index} style={[
                  styles.dayCardWrapper, 
                  isToday && styles.todayCard,
                  status === 'COMPETITION' && styles.compCard,
                  status === 'PREPARATION' && styles.prepCard
                ]}>
                  <BlurView intensity={40} tint="default" style={styles.dayCard}>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('DayDetail', { date: date.toISOString() })}
                    >
                      <View style={styles.dayCardHeader}>
                        <Text style={[
                          styles.dayName, 
                          isToday && styles.todayText,
                          status === 'COMPETITION' && styles.compText
                        ]}>
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('AddWorkout', { selectedDate: date.toISOString() })}
                          style={styles.addDayBtn}
                        >
                          <Text style={styles.addDayBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.dayCardContent}>
                      {dayWorkouts.length > 0 ? (
                        dayWorkouts.map(renderWorkoutMiniCard)
                      ) : (
                        <TouchableOpacity 
                          style={styles.emptyDayAction}
                          onPress={() => navigation.navigate('DayDetail', { date: date.toISOString() })}
                        >
                          <Text style={styles.emptyDayText}>+ Ajouter une séance ou Repos</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </BlurView>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  lightBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  lightCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  cyanCircle: { top: -50, right: -50, backgroundColor: '#00E5FF' },
  purpleCircle: { bottom: -50, left: -50, backgroundColor: '#BF5AF2' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  navBtn: { padding: 10 },
  navArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  monthLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
  agendaContainer: { width: '100%' },
  dayCardWrapper: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)' },
  todayCard: { borderWidth: 2, borderColor: '#00E5FF' },
  compCard: { 
    borderWidth: 2, 
    borderColor: '#FFD700',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 0px 15px rgba(255, 215, 0, 0.5)',
      }
    }),
  },
  prepCard: { borderWidth: 2, borderColor: '#BB86FC' },
  dayCard: { padding: 16, minHeight: 90 },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayName: { color: '#8E8E93', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  todayText: { color: '#FFFFFF' },
  compText: { color: '#FFD700' },
  addDayBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  addDayBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  dayCardContent: { flex: 1 },
  emptyDayAction: { paddingVertical: 8 },
  emptyDayText: { color: 'rgba(255, 255, 255, 0.2)', fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  miniCardWrapper: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  compMiniCardBorder: { borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)' },
  miniCard: { padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  miniCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  miniType: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  miniRpe: { color: '#8E8E93', fontSize: 11, fontWeight: '600' },
  miniSummary: { color: '#D1D1D6', fontSize: 12 },
});

export default WorkoutScreen;
