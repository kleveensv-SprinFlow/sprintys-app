import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRecordsStore } from '../../../store/useRecordsStore';
import { PrBadge } from '../components/PrBadge';

// We would normally fetch the exercise list from the store or DB to join the names
const MOCK_EXERCISE_NAMES: Record<string, string> = {
  '1': 'Bench Press',
  '2': 'Squat',
  '3': 'Deadlift',
  '4': 'Pull-up',
  '5': 'Overhead Press',
  '6': 'Bicep Curl',
};

export const RecordsScreen = () => {
  const { records } = useRecordsStore();

  if (records.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.title}>Personal Records</Text>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No records yet.</Text>
          <Text style={styles.emptySubText}>Keep training to set your first PR!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personal Records</Text>
      
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.recordCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.exerciseName}>
                {MOCK_EXERCISE_NAMES[item.exerciseId] || 'Unknown Exercise'}
              </Text>
              <PrBadge />
            </View>
            
            <View style={styles.recordDetails}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{item.weight} kg</Text>
                <Text style={styles.statLabel}>for {item.reps} reps</Text>
              </View>
              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
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
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  recordCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
});
