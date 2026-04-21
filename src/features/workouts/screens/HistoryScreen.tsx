import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useWorkoutStore } from '../../../store/useWorkoutStore';
import { WorkoutHistoryCard } from '../components/WorkoutHistoryCard';

export const HistoryScreen = () => {
  const { workoutHistory } = useWorkoutStore();

  if (workoutHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workouts yet.</Text>
        <Text style={styles.emptySubText}>Complete a workout to see it here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      
      <FlatList
        data={workoutHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WorkoutHistoryCard 
            workout={item} 
            onPress={() => {
              // In a real app with navigation, navigate to WorkoutDetailScreen here
              console.log('Navigate to workout', item.id);
            }} 
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
});
