import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Set } from '../types';

interface SetLoggerProps {
  set: Set;
  index: number;
  onUpdate: (updates: Partial<Set>) => void;
  onComplete: () => void;
}

export const SetLogger: React.FC<SetLoggerProps> = ({ set, index, onUpdate, onComplete }) => {
  return (
    <View style={[styles.container, set.isCompleted && styles.completedContainer]}>
      <Text style={styles.setNumber}>{index + 1}</Text>
      
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="lbs/kg"
        placeholderTextColor="#666"
        value={set.weight ? set.weight.toString() : ''}
        onChangeText={(val) => onUpdate({ weight: Number(val) })}
      />
      
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="reps"
        placeholderTextColor="#666"
        value={set.reps ? set.reps.toString() : ''}
        onChangeText={(val) => onUpdate({ reps: Number(val) })}
      />
      
      <TouchableOpacity 
        style={[styles.checkBtn, set.isCompleted && styles.checkedBtn]}
        onPress={onComplete}
      >
        <Text style={styles.checkText}>✓</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  completedContainer: {
    opacity: 0.6,
  },
  setNumber: {
    color: '#aaa',
    width: 24,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    textAlign: 'center',
  },
  checkBtn: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBtn: {
    backgroundColor: '#4CAF50',
  },
  checkText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
