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
  
  // États du calendrier
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  // Logique du calendrier
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // On commence à partir du lundi de la semaine en cours + offset
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
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const filteredWorkouts = useMemo(() => {
    return workouts.filter(w => isSameDay(new Date(w.created_at), selectedDate));
  }, [workouts, selectedDate]);

  const hasWorkoutOnDay = (date: Date) => {
    return workouts.some(w => isSameDay(new Date(w.created_at), date));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderNotes = (notes: string) => {
    if (!notes) return null;
    return notes.split('\n').map((line, i) => {
      const isHeader = line.includes('CŒUR DE SÉANCE :') || line.includes('MUSCULATION :');
      return (
        <Text key={i} style={[styles.noteLine, isHeader && styles.noteHeader]}>
          {line}
        </Text>
      );
    });
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
          <Text style={styles.title}>Mes Séances</Text>
        </View>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddWorkout')}
        >
          <Text style={styles.addButtonText}>Ajouter une séance +</Text>
        </TouchableOpacity>

        {/* Calendrier Horizontal */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)}>
              <Text style={styles.navArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthName}</Text>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)}>
              <Text style={styles.navArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              const dayInitial = date.toLocaleDateString('fr-FR', { weekday: 'narrow' });
              const dayNum = date.getDate();
              const hasWorkout = hasWorkoutOnDay(date);

              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dayInitial, isSelected && styles.dayInitialSelected]}>{dayInitial}</Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{dayNum}</Text>
                  {hasWorkout && <View style={[styles.workoutDot, isSelected && styles.workoutDotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
        ) : filteredWorkouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BlurView intensity={20} tint="default" style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🛌</Text>
              <Text style={styles.emptyText}>
                Repos aujourd'hui ?{"\n"}Récupère bien pour demain !
              </Text>
            </BlurView>
          </View>
        ) : (
          <View style={styles.workoutList}>
            {filteredWorkouts.map((workout) => (
              <BlurView key={workout.id} intensity={40} tint="default" style={styles.workoutCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.workoutType}>{workout.type}</Text>
                    <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteWorkout(workout.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.intensityRow}>
                  <Text style={styles.intensityText}>🔥 Intensité : {workout.rpe}/10</Text>
                </View>
                <View style={styles.notesContainer}>
                  {renderNotes(workout.notes)}
                </View>
              </BlurView>
            ))}
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
  header: { marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  addButton: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 32 },
  addButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
  
  calendarContainer: { marginBottom: 32 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  navArrow: { color: '#FFFFFF', fontSize: 24, fontWeight: '600' },
  monthLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { width: (width - 48 - 42) / 7, height: 75, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  dayPillSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  dayInitial: { color: '#8E8E93', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  dayInitialSelected: { color: '#8E8E93' },
  dayNum: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  dayNumSelected: { color: '#000000' },
  workoutDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#32ADE6', marginTop: 6 },
  workoutDotSelected: { backgroundColor: '#32ADE6' },

  emptyContainer: { alignItems: 'center', marginTop: 20 },
  emptyCard: { padding: 40, borderRadius: 32, alignItems: 'center', width: width - 48, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  workoutList: { width: '100%' },
  workoutCard: { padding: 20, borderRadius: 24, marginBottom: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  workoutType: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  workoutDate: { color: '#8E8E93', fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18, opacity: 0.6 },
  intensityRow: { marginBottom: 12, backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  intensityText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  notesContainer: { marginTop: 4 },
  noteLine: { color: '#D1D1D6', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  noteHeader: { color: '#32ADE6', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
});

export default WorkoutScreen;
