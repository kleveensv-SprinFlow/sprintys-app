import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Workout } from '../types';

interface WorkoutDetailScreenProps {
  workout: Workout; // In a real app, this would probably be fetched via an ID from navigation params
}

export const WorkoutDetailScreen: React.FC<WorkoutDetailScreenProps> = ({ workout }) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.date}>
            {workout.date.toLocaleDateString()} at {workout.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{workout.durationMinutes} min</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Volume</Text>
            <Text style={styles.statValue}>{workout.volumeTotal} kg</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Avg RPE</Text>
            <Text style={styles.statValue}>{workout.overallRpe || 'N/A'}</Text>
          </View>
        </View>

        {workout.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Exercises</Text>
        
        {workout.exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
            
            <View style={styles.setRow}>
              <Text style={styles.setColHeader}>Set</Text>
              <Text style={styles.setColHeader}>kg</Text>
              <Text style={styles.setColHeader}>reps</Text>
            </View>

            {ex.sets.map((set, i) => (
              <View key={set.id} style={[styles.setRow, !set.isCompleted && styles.incompleteSet]}>
                <Text style={styles.setColText}>{i + 1}</Text>
                <Text style={styles.setColText}>{set.weight}</Text>
                <Text style={styles.setColText}>{set.reps}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  date: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  notesLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  notesText: {
    color: '#fff',
    fontSize: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ff4444',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  setColHeader: {
    flex: 1,
    color: '#666',
    textAlign: 'center',
    fontSize: 12,
  },
  setColText: {
    flex: 1,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  incompleteSet: {
    opacity: 0.3,
  },
});
