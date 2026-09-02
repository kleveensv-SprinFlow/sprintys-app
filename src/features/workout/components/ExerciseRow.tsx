import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useWorkoutStore } from '../../../store/workoutStore';
import { theme } from '../../../core/theme';
import { WorkoutExercise } from '../../../types/workout';
import { ActiveSet } from '../../../store/workoutStore';

interface Props {
  blockId: string;
  exercise: Omit<WorkoutExercise, 'sets'> & { sets: ActiveSet[] };
}

// Composant interne pour gǸrer l'Ǹtat local des inputs textuels
const SetRow = ({ blockId, exerciseId, set, isStrength, isRun, isJump }: { blockId: string, exerciseId: string, set: ActiveSet, isStrength: boolean, isRun: boolean, isJump: boolean }) => {
  const { updateSet, toggleSetCompletion } = useWorkoutStore();
  
  // Local state for time input to avoid NaN/decimal issues during typing
  const [timeText, setTimeText] = useState(set.actual_time_ms ? (set.actual_time_ms / 1000).toString() : '');
  const [intensityText, setintensityText] = useState(set.actual_intensity ? set.actual_intensity.toString() : '');

  // Sync from store if it changes externally
  useEffect(() => {
    if (set.actual_time_ms !== undefined) {
      setTimeText((set.actual_time_ms / 1000).toString());
    }
  }, [set.actual_time_ms]);

  const handleTimeChange = (val: string) => {
    setTimeText(val);
    if (val.trim() === '') {
      updateSet(blockId, exerciseId, set.id, { actual_time_ms: undefined });
      return;
    }
    const sec = parseFloat(val.replace(',', '.'));
    if (!isNaN(sec)) {
      updateSet(blockId, exerciseId, set.id, { actual_time_ms: Math.round(sec * 1000) });
    }
  };

  const handleIntensityChange = (val: string) => {
    setintensityText(val);
    if (val.trim() === '') {
      updateSet(blockId, exerciseId, set.id, { actual_intensity: undefined });
      return;
    }
    const intensity = parseInt(val, 10);
    if (!isNaN(intensity) && intensity >= 1 && intensity <= 100) {
      updateSet(blockId, exerciseId, set.id, { actual_intensity: intensity });
    }
  };

  const formatRest = (ms?: number) => {
    if (!ms) return '';
    const secs = ms / 1000;
    if (secs >= 60) return `${Math.floor(secs / 60)}m${secs % 60 ? (secs % 60) : ''}`;
    return `${secs}s`;
  };

  const renderTarget = () => {
    if (isStrength) {
      if (set.planned_weight_kg || set.planned_reps) {
        return `${set.planned_reps || '-'} reps @ ${set.planned_weight_kg || '-'} kg`;
      }
      return 'Libre';
    }
    if (isRun) {
      if (set.planned_distance_m) {
        return `${set.planned_distance_m}m` + (set.planned_time_ms ? ` Cible: ${(set.planned_time_ms/1000).toFixed(2)}s` : '') + (set.planned_rest_ms ? ` (R: ${formatRest(set.planned_rest_ms)})` : '');
      }
      return 'Libre';
    }
    return 'Libre';
  };

  const inputStyle = [styles.baseInput, { height: 40 }];

  return (
    <View style={[styles.setRow, set.isCompleted && styles.completedRow]}>
      <Text style={[styles.setNumber, { flex: 0.5 }]}>{set.set_index}</Text>
      <Text style={[styles.targetText, { flex: 2 }]} numberOfLines={2}>{renderTarget()}</Text>
      
      <View style={{ flex: 1.5, flexDirection: 'row', gap: 4 }}>
        {isStrength && (
          <>
            <TextInput
              style={inputStyle}
              value={set.actual_weight_kg ? set.actual_weight_kg.toString() : ''}
              onChangeText={(val) => updateSet(blockId, exerciseId, set.id, { actual_weight_kg: parseFloat(val) || undefined })}
              keyboardType="numeric"
              placeholder="KG"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={inputStyle}
              value={set.actual_reps ? set.actual_reps.toString() : ''}
              onChangeText={(val) => updateSet(blockId, exerciseId, set.id, { actual_reps: parseInt(val) || undefined })}
              keyboardType="numeric"
              placeholder="REPS"
              placeholderTextColor={theme.colors.textMuted}
            />
          </>
        )}
        {isRun && (
          <TextInput
            style={inputStyle}
            value={timeText}
            onChangeText={handleTimeChange}
            keyboardType="decimal-pad"
            placeholder="Chrono"
            placeholderTextColor={theme.colors.textMuted}
          />
        )}
      </View>
      
      {/* NOUVEAU CHAMP % */}
      <View style={{ flex: 0.8, paddingHorizontal: 2 }}>
        <TextInput
          style={[styles.baseInput, { height: 40, backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
          value={intensityText}
          onChangeText={handleIntensityChange}
          keyboardType="numeric"
          placeholder="%"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      <TouchableOpacity 
        onPress={() => toggleSetCompletion(blockId, exerciseId, set.id)}
        style={[styles.checkCircle, set.isCompleted && styles.checkCircleActive]}
      >
        <Text style={styles.checkIcon}>{set.isCompleted ? 'o"' : ''}</Text>
      </TouchableOpacity>
    </View>
  );
};

export const ExerciseRow: React.FC<Props> = ({ blockId, exercise }) => {
  const { addSet } = useWorkoutStore();

  const isRun = exercise.category === 'run';
  const isStrength = exercise.category === 'strength';
  const isJump = exercise.category === 'jump';

  const renderHeader = () => {
    return (
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { flex: 0.5 }]}>SET</Text>
        <Text style={[styles.headerText, { flex: 2, textAlign: 'left' }]}>OBJECTIF CIBLE</Text>
        {isStrength && <Text style={[styles.headerText, { flex: 1.5 }]}>RǲALISǲ</Text>}
        {isRun && <Text style={[styles.headerText, { flex: 1.5 }]}>CHRONO (s)</Text>}
        {isJump && <Text style={[styles.headerText, { flex: 1.5 }]}>HAUTEUR (cm)</Text>}
        <Text style={[styles.headerText, { flex: 0.8 }]}>%</Text>
        <Text style={[styles.headerText, { width: 40 }]}>OK</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {renderHeader()}

      {exercise.sets.map((set) => (
        <SetRow 
          key={set.id} 
          blockId={blockId} 
          exerciseId={exercise.id} 
          set={set} 
          isStrength={isStrength} 
          isRun={isRun} 
          isJump={isJump} 
        />
      ))}

      <TouchableOpacity 
        onPress={() => addSet(blockId, exercise.id)}
        style={styles.addSetButton}
      >
        <Text style={styles.addSetText}>+ AJOUTER UNE SǲRIE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.xl },
  exerciseName: { color: theme.colors.accent, fontSize: 16, fontWeight: 'bold', marginBottom: theme.spacing.md },
  headerRow: { flexDirection: 'row', marginBottom: theme.spacing.sm, alignItems: 'center' },
  headerText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.sm },
  completedRow: { backgroundColor: 'rgba(50, 215, 75, 0.05)' },
  
  setNumber: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: 'bold' },
  targetText: { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', paddingRight: 4 },
  
  baseInput: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, textAlign: 'center', fontSize: 14, color: theme.colors.text },
  
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  checkCircleActive: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  checkIcon: { color: theme.colors.background, fontWeight: 'bold' },
  
  addSetButton: { paddingVertical: theme.spacing.sm, alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 8, marginTop: 8 },
  addSetText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: 'bold' },
});
