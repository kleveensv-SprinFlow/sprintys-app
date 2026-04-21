import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BuilderExercise } from '../../../store/workoutBuilderStore';
import { useWorkoutBuilderStore } from '../../../store/workoutBuilderStore';
import { Card } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';

interface Props {
  exercise: BuilderExercise;
}

export const ExerciseBuilderCard: React.FC<Props> = ({ exercise }) => {
  const { addSet, removeSet, updateSet, removeExercise } = useWorkoutBuilderStore();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{exercise.name.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
          <Text style={styles.removeText}>SUPPRIMER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.setsHeader}>
        <Text style={styles.label}>REPS</Text>
        <Text style={styles.label}>CHARGE (KG)</Text>
        <Text style={styles.label}>REPOS (S)</Text>
        <View style={{ width: 30 }} />
      </View>

      {exercise.sets.map((set, index) => (
        <View key={set.id} style={styles.setRow}>
          <Input
            value={set.reps.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { reps: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={styles.input}
          />
          <Input
            value={set.weight.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { weight: parseFloat(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={styles.input}
          />
          <Input
            value={set.restSeconds.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { restSeconds: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={styles.input}
          />
          <TouchableOpacity 
            onPress={() => removeSet(exercise.id, set.id)}
            style={styles.removeSetBtn}
          >
            <Text style={styles.removeIcon}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity 
        onPress={() => addSet(exercise.id)}
        style={styles.addSetBtn}
      >
        <Text style={styles.addSetText}>+ AJOUTER SÉRIE</Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  removeText: {
    color: theme.colors.error,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  label: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
    marginHorizontal: 4,
  },
  input: {
    height: 40,
    textAlign: 'center',
    fontSize: 14,
  },
  removeSetBtn: {
    width: 30,
    alignItems: 'center',
  },
  removeIcon: {
    color: theme.colors.textMuted,
    fontSize: 20,
  },
  addSetBtn: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderStyle: 'dashed',
  },
  addSetText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
});
