import React, { useEffect, useState } from 'react';
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
      'Es-tu sûr de vouloir supprimer cet entraînement ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id);
              
              if (error) throw error;
              setWorkouts(workouts.filter(w => w.id !== id));
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de supprimer la séance.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderNotes = (notes: string) => {
    if (!notes) return null;

    const lines = notes.split('\n');
    return lines.map((line, i) => {
      const isHeader = line.includes('CŒUR DE SÉANCE :') || line.includes('MUSCULATION :');
      return (
        <Text 
          key={i} 
          style={[
            styles.noteLine, 
            isHeader && styles.noteHeader
          ]}
        >
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

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BlurView intensity={20} tint="default" style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏃‍♂️</Text>
              <Text style={styles.emptyText}>
                Aucune séance enregistrée.{"\n"}Il est temps de transpirer !
              </Text>
            </BlurView>
          </View>
        ) : (
          <View style={styles.workoutList}>
            {workouts.map((workout) => (
              <BlurView key={workout.id} intensity={40} tint="default" style={styles.workoutCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.workoutType}>{workout.type}</Text>
                    <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => deleteWorkout(workout.id)}
                    style={styles.deleteBtn}
                  >
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
  emptyContainer: { alignItems: 'center', marginTop: 40 },
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
