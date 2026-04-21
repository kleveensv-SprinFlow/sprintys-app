import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Exercise } from '../types';

const MOCK_EXERCISES: Exercise[] = [
  { id: '1', name: 'Bench Press', targetMuscleGroup: 'chest', equipment: 'Barbell' },
  { id: '2', name: 'Squat', targetMuscleGroup: 'legs', equipment: 'Barbell' },
  { id: '3', name: 'Deadlift', targetMuscleGroup: 'back', equipment: 'Barbell' },
  { id: '4', name: 'Pull-up', targetMuscleGroup: 'back', equipment: 'Bodyweight' },
  { id: '5', name: 'Overhead Press', targetMuscleGroup: 'shoulders', equipment: 'Barbell' },
  { id: '6', name: 'Bicep Curl', targetMuscleGroup: 'arms', equipment: 'Dumbbell' },
];

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExercises = MOCK_EXERCISES.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Exercise</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.exerciseItem} 
            onPress={() => onSelect(item)}
          >
            <View>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMuscle}>{item.targetMuscleGroup} • {item.equipment}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#ff4444',
  },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  exerciseItem: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseMuscle: {
    color: '#aaa',
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
