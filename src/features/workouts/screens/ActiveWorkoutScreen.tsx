import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useWorkoutStore } from '../../../store/useWorkoutStore';
import { SetLogger } from '../components/SetLogger';
import { RpeSelector } from '../components/RpeSelector';

export const ActiveWorkoutScreen = () => {
  const { 
    activeWorkout, 
    addSet, 
    updateSet, 
    completeSet, 
    finishWorkout 
  } = useWorkoutStore();
  
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutRpe, setWorkoutRpe] = useState<number>();

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No active workout</Text>
      </View>
    );
  }

  const handleFinish = () => {
    finishWorkout(workoutRpe);
    setShowFinishModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeWorkout.name}</Text>
        <Text style={styles.timer}>00:00</Text> {/* To be implemented: real timer */}
      </View>

      <ScrollView style={styles.content}>
        {activeWorkout.exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
            
            <View style={styles.setHeaders}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={[styles.setHeaderText, { width: 40, textAlign: 'center' }]}>✓</Text>
            </View>

            {ex.sets.map((set, index) => (
              <SetLogger
                key={set.id}
                set={set}
                index={index}
                onUpdate={(updates) => updateSet(ex.id, set.id, updates)}
                onComplete={() => completeSet(ex.id, set.id)}
              />
            ))}
            
            <TouchableOpacity 
              style={styles.addSetBtn}
              onPress={() => addSet(ex.id)}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.finishBtn}
        onPress={() => setShowFinishModal(true)}
      >
        <Text style={styles.finishBtnText}>Finish Workout</Text>
      </TouchableOpacity>

      <Modal visible={showFinishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish Workout</Text>
            <Text style={styles.modalSub}>How hard was this workout?</Text>
            
            <RpeSelector value={workoutRpe} onChange={setWorkoutRpe} />
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleFinish}>
              <Text style={styles.saveBtnText}>Save Workout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelModalBtn} 
              onPress={() => setShowFinishModal(false)}
            >
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timer: {
    color: '#ff4444',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  setHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  setHeaderText: {
    color: '#666',
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  addSetBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  addSetText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
  finishBtn: {
    backgroundColor: '#ff4444',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSub: {
    color: '#aaa',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelModalBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelModalText: {
    color: '#aaa',
  },
});
