import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Workout } from '../types';

interface WorkoutHistoryCardProps {
  workout: Workout;
  onPress: () => void;
}

export const WorkoutHistoryCard: React.FC<WorkoutHistoryCardProps> = ({ workout, onPress }) => {
  const dateStr = workout.date.toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{workout.name}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{workout.durationMinutes || 0}m</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{workout.volumeTotal || 0}</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{workout.exercises.length}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>
      </View>

      <Text style={styles.exercisePreview} numberOfLines={1}>
        {workout.exercises.map(e => e.exercise.name).join(', ')}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    color: '#888',
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  exercisePreview: {
    color: '#aaa',
    fontSize: 14,
  },
});
