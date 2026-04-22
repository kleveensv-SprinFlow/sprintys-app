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

  const deleteWorkout = async (id: string) => {
    Alert.alert(
      'Supprimer la séance',
      'Es-tu sûr de vouloir supprimer cet entraînement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('workouts').delete().eq('id', id);
              if (error) throw error;
              setWorkouts(workouts.filter(w => w.id !== id));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la séance.');
            }
          }
        }
      ]
    );
  };

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDay = today.getDay();
    // On commence au Lundi
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
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getWorkoutsForDay = (date: Date) => {
    return workouts.filter(w => isSameDay(new Date(w.created_at), date));
  };

  const renderWorkoutSummary = (workout: any) => {
    // On essaie d'extraire le cœur de séance des notes
    const heartLine = workout.notes?.split('\n').find((l: string) => l.includes('CŒUR DE SÉANCE :') || l.includes('MUSCULATION :'));
    const summary = heartLine ? heartLine.split(':')[1]?.trim() : (workout.notes?.split('\n')[0] || 'Détails...');
    
    return (
      <View key={workout.id} style={styles.compactWorkout}>
        <Text style={styles.compactType}>{workout.type}</Text>
        <Text style={styles.compactNotes} numberOfLines={1}>{summary}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.lightBackground}>
        <View style={[styles.lightCircle, styles.cyanCircle]} />
        <View style={[styles.lightCircle, styles.purpleCircle]} />
      </View>
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mon Agenda</Text>
        </View>

        {/* Navigation Hebdomadaire */}
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} style={styles.navBtn}>
            <Text style={styles.navArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)} style={styles.navBtn}>
            <Text style={styles.navArrow}>→</Text>
          </TouchableOpacity>
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

              return (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.7}
                  style={[styles.dayCardWrapper, isToday && styles.todayCard]}
                  onPress={() => navigation.navigate('AddWorkout', { selectedDate: date.toISOString() })}
                >
                  <BlurView intensity={40} tint="default" style={styles.dayCard}>
                    <View style={styles.dayCardHeader}>
                      <Text style={[styles.dayName, isToday && styles.todayText]}>
                        {dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}
                      </Text>
                      {isToday && <View style={styles.todayIndicator} />}
                    </View>
                    
                    <View style={styles.dayCardContent}>
                      {dayWorkouts.length > 0 ? (
                        dayWorkouts.map(renderWorkoutSummary)
                      ) : (
                        <Text style={styles.emptyDayText}>+ Ajouter une séance ou Repos</Text>
                      )}
                    </View>
                  </BlurView>
                </TouchableOpacity>
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
  cyanCircle: { top: -50, right: -50, backgroundColor: '#32ADE6' },
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
  dayCardWrapper: { marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  todayCard: { borderWidth: 1.5, borderColor: '#32ADE6' },
  dayCard: { padding: 16, minHeight: 90 },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayName: { color: '#8E8E93', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  todayText: { color: '#FFFFFF' },
  todayIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#32ADE6' },
  
  dayCardContent: { flex: 1, justifyContent: 'center' },
  emptyDayText: { color: 'rgba(255, 255, 255, 0.2)', fontSize: 14, fontWeight: '500', fontStyle: 'italic' },
  
  compactWorkout: { marginBottom: 6, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#32ADE6' },
  compactType: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  compactNotes: { color: '#8E8E93', fontSize: 12 },
});

export default WorkoutScreen;
