import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Exercise, Set } from '../types';
import { useWorkoutStore } from '../../../store/workoutStore';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';

interface Props {
  exercise: Exercise;
}

export const ExerciseRow: React.FC<Props> = ({ exercise }) => {
  const { addSet, updateSet, toggleSetCompletion } = useWorkoutStore();

  const renderHeader = () => {
    const firstSet = exercise.sets[0];
    if (!firstSet) return null;

    return (
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>SET</Text>
        {firstSet.weight !== undefined && <Text style={styles.headerText}>KG</Text>}
        {firstSet.reps !== undefined && <Text style={styles.headerText}>REPS</Text>}
        {firstSet.distance !== undefined && <Text style={styles.headerText}>DIST (M)</Text>}
        {firstSet.duration !== undefined && <Text style={styles.headerText}>TEMPS</Text>}
        {firstSet.steps !== undefined && <Text style={styles.headerText}>MARCHES</Text>}
        <Text style={[styles.headerText, { width: 40 }]}>OK</Text>
      </View>
    );
  };

  const renderInputs = (set: Set) => {
    const baseInputStyle = { height: 40, textAlign: 'center', fontSize: 16 };
    
    return (
      <>
        {set.weight !== undefined && (
          <Input
            value={set.weight.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { weight: parseFloat(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        )}
        {set.reps !== undefined && (
          <Input
            value={set.reps.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { reps: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        )}
        {set.distance !== undefined && (
          <Input
            value={set.distance.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { distance: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        )}
        {set.duration !== undefined && (
          <Input
            value={set.duration}
            onChangeText={(val) => updateSet(exercise.id, set.id, { duration: val })}
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        )}
        {set.steps !== undefined && (
          <Input
            value={set.steps.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { steps: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {renderHeader()}

      {exercise.sets.map((set, index) => (
        <View key={set.id} style={[styles.setRow, set.isCompleted && styles.completedRow]}>
          <Text style={styles.setNumber}>{index + 1}</Text>
          {renderInputs(set)}
          <TouchableOpacity 
            onPress={() => toggleSetCompletion(exercise.id, set.id)}
            style={[styles.checkCircle, set.isCompleted && styles.checkCircleActive]}
          >
            <Text style={styles.checkIcon}>{set.isCompleted ? '✓' : ''}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity 
        onPress={() => addSet(exercise.id)}
        style={styles.addSetButton}
      >
        <Text style={styles.addSetText}>+ AJOUTER UNE SÉRIE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  exerciseName: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  completedRow: {
    backgroundColor: 'rgba(50, 215, 75, 0.05)',
  },
  setNumber: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium as any,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
    marginHorizontal: theme.spacing.xs,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  checkCircleActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkIcon: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  addSetButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  addSetText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
});
