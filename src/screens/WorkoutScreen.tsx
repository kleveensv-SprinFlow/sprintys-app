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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
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
            {workouts.map((workout) => {
              const load = workout.duration_minutes * workout.rpe;
              return (
                <BlurView key={workout.id} intensity={40} tint="default" style={styles.workoutCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.workoutType}>{workout.type}</Text>
                    <Text style={styles.workoutDate}>{formatDate(workout.created_at)}</Text>
                  </View>
                  
                  <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Durée</Text>
                      <Text style={styles.statValue}>{workout.duration_minutes} min</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>RPE</Text>
                      <Text style={styles.statValue}>{workout.rpe}/10</Text>
                    </View>
                    <View style={[styles.statItem, styles.loadItem]}>
                      <Text style={styles.statLabel}>Charge</Text>
                      <Text style={styles.loadValue}>{load}</Text>
                    </View>
                  </View>
                </BlurView>
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  lightCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  cyanCircle: {
    top: -50,
    right: -50,
    backgroundColor: '#32ADE6',
  },
  purpleCircle: {
    bottom: 100,
    left: -50,
    backgroundColor: '#BF5AF2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  workoutList: {
    width: '100%',
  },
  workoutCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutType: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  workoutDate: {
    color: '#8E8E93',
    fontSize: 13,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadItem: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadValue: {
    color: '#32ADE6',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default WorkoutScreen;
