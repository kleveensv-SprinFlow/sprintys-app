import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { supabase } from '../services/supabaseClient';

const { width } = Dimensions.get('window');

const DayDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { date } = route.params;

  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchWorkouts();
    }
  }, [isFocused]);

  const fetchWorkouts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des séances du jour:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkout = async (id: string) => {
    Alert.alert(
      'Supprimer',
      'Confirmer la suppression de cette séance ?',
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

  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune séance enregistrée pour ce jour.</Text>
          </View>
        ) : (
          workouts.map((workout) => (
            <TouchableOpacity 
              key={workout.id} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AddWorkout', { workout: workout })}
              style={styles.workoutCardWrapper}
            >
              <BlurView intensity={40} tint="default" style={styles.workoutCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.workoutType}>{workout.type}</Text>
                  <TouchableOpacity onPress={() => deleteWorkout(workout.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteIconText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.intensityBadge}>
                  <Text style={styles.intensityText}>INTENSITÉ : {workout.rpe}/10</Text>
                </View>

                <View style={styles.notesContainer}>
                  {renderNotes(workout.notes)}
                </View>
              </BlurView>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddWorkout', { selectedDate: date })}
        >
          <Text style={styles.addButtonText}>AJOUTER UNE SÉANCE / COMPÉTITION</Text>
        </TouchableOpacity>
        
        <View style={{ height: 60 }} />
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
  scrollContent: { padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 24 },
  backBtnText: { color: '#32ADE6', fontSize: 16, fontWeight: '600' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#8E8E93', fontSize: 16 },
  workoutCardWrapper: { marginBottom: 20 },
  workoutCard: { padding: 24, borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  workoutType: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  deleteBtn: { padding: 6 },
  deleteIconText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  intensityBadge: { backgroundColor: 'rgba(50, 173, 230, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(50, 173, 230, 0.2)' },
  intensityText: { color: '#32ADE6', fontSize: 13, fontWeight: '700' },
  notesContainer: { marginTop: 8 },
  noteLine: { color: '#D1D1D6', fontSize: 15, lineHeight: 22, marginBottom: 4 },
  noteHeader: { color: '#00E5FF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  addButton: { backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  addButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
});

export default DayDetailScreen;
