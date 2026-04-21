import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { useWorkoutStore } from '../../../store/useWorkoutStore';
import { ExerciseSelector } from '../components/ExerciseSelector';

export const WorkoutBuilderScreen = () => {
  const { activeWorkout, startWorkout, addExercise, removeExercise, cancelWorkout } = useWorkoutStore();
  const [showSelector, setShowSelector] = useState(false);
  const [workoutName, setWorkoutName] = useState('New Workout');

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ready to train?</Text>
        <TextInput
          style={styles.nameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Workout Name"
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.startBtn} onPress={() => startWorkout(workoutName)}>
          <Text style={styles.startBtnText}>Start Empty Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeWorkout.name}</Text>
        <TouchableOpacity onPress={cancelWorkout}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.exerciseList}>
        {activeWorkout.exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            {ex.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setText}>Set {index + 1}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowSelector(true)}>
        <Text style={styles.addBtnText}>+ Add Exercise</Text>
      </TouchableOpacity>

      <Modal visible={showSelector} animationType="slide">
        <ExerciseSelector 
          onSelect={(ex) => {
            addExercise(ex);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  startBtn: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    color: '#ff4444',
    fontSize: 16,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseHeader: {
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
  removeText: {
    color: '#ff4444',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  setText: {
    color: '#aaa',
  },
  addBtn: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
