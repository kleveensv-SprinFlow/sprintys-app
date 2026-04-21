import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BuilderExercise, WorkoutCategory } from '../../../store/workoutBuilderStore';
import { useWorkoutBuilderStore } from '../../../store/workoutBuilderStore';
import { Card } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';

interface Props {
  exercise: BuilderExercise;
}

export const ExerciseBuilderCard: React.FC<Props> = ({ exercise }) => {
  const { addSet, removeSet, updateSet, removeExercise } = useWorkoutBuilderStore();

  const renderHeaderLabels = () => {
    switch (exercise.category) {
      case 'Musculation':
        return (
          <>
            <Text style={styles.label}>REPS</Text>
            <Text style={styles.label}>POIDS (KG)</Text>
          </>
        );
      case 'Lactique':
      case 'Aérobie':
        return (
          <>
            <Text style={styles.label}>DIST. (M)</Text>
            <Text style={styles.label}>TEMPS</Text>
          </>
        );
      case 'Escalier':
        return <Text style={styles.label}>MARCHES</Text>;
      default:
        return <Text style={styles.label}>VALEUR</Text>;
    }
  };

  const renderSetFields = (set: BuilderSet, setId: string) => {
    const baseInputStyle = { height: 40, textAlign: 'center' as const, fontSize: 16 };
    
    switch (exercise.category) {
      case 'Musculation':
        return (
          <>
            <Input
              value={set.reps?.toString() || ''}
              onChangeText={(val) => updateSet(exercise.id, setId, { reps: parseInt(val) || 0 })}
              keyboardType="numeric"
              containerStyle={styles.inputContainer}
              style={baseInputStyle}
            />
            <Input
              value={set.weight?.toString() || ''}
              onChangeText={(val) => updateSet(exercise.id, setId, { weight: parseFloat(val) || 0 })}
              keyboardType="numeric"
              containerStyle={styles.inputContainer}
              style={baseInputStyle}
            />
          </>
        );
      case 'Lactique':
      case 'Aérobie':
        return (
          <>
            <Input
              value={set.distance?.toString() || ''}
              onChangeText={(val) => updateSet(exercise.id, setId, { distance: parseInt(val) || 0 })}
              keyboardType="numeric"
              containerStyle={styles.inputContainer}
              style={baseInputStyle}
            />
            <Input
              value={set.duration || ''}
              onChangeText={(val) => updateSet(exercise.id, setId, { duration: val })}
              placeholder="00:00"
              containerStyle={styles.inputContainer}
              style={baseInputStyle}
            />
          </>
        );
      case 'Escalier':
        return (
          <Input
            value={set.steps?.toString() || ''}
            onChangeText={(val) => updateSet(exercise.id, setId, { steps: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={baseInputStyle}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{exercise.name.toUpperCase()}</Text>
          <Text style={styles.catText}>{exercise.category}</Text>
        </View>
        <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
          <Text style={styles.removeText}>SUPPRIMER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.setsHeader}>
        {renderHeaderLabels()}
        <Text style={styles.label}>REPOS (S)</Text>
        <View style={{ width: 30 }} />
      </View>

      {exercise.sets.map((set, index) => (
        <View key={set.id} style={styles.setRow}>
          {renderSetFields(set, set.id)}
          <Input
            value={set.restSeconds.toString()}
            onChangeText={(val) => updateSet(exercise.id, set.id, { restSeconds: parseInt(val) || 0 })}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
            style={{ height: 40, textAlign: 'center', fontSize: 14 }}
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  catText: {
    color: theme.colors.accent,
    fontSize: 9,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    marginTop: 2,
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
