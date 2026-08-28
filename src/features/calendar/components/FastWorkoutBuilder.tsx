import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useWorkoutBuilderStore } from '../../../store/workoutBuilderStore';
import { supabase } from '../../../services/supabase';

interface FastWorkoutBuilderProps {
  athleteId: string;
  date: Date;
  onClose: () => void;
  onSave: () => void;
}

export const FastWorkoutBuilder: React.FC<FastWorkoutBuilderProps> = ({ athleteId, date, onClose, onSave }) => {
  const theme = useTheme();
  const builder = useWorkoutBuilderStore();
  const [isSaving, setIsSaving] = useState(false);

  // Helper to add a block quickly
  const handleAddBlock = () => {
    builder.addBlock(`Bloc ${builder.blocks.length + 1}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(12, 0, 0, 0); // Default noon for now

      // Save to Supabase
      const { error } = await supabase.from('workouts').insert([{
        coach_id: (await supabase.auth.getUser()).data.user?.id,
        athlete_id: athleteId,
        type_seance: builder.currentSessionName,
        blocks: builder.blocks, // Store new blocks structure
        date_prevue: startOfDay.toISOString(),
        status: 'pending'
      }]);

      if (error) throw error;
      
      onSave();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde de la séance.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={[styles.iconButton, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Créer une Séance</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, opacity: isSaving ? 0.7 : 1 }]}
        >
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Titre de la séance</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            value={builder.currentSessionName}
            onChangeText={builder.setSessionName}
            placeholder="Ex: Vitesse maximale"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.blocksContainer}>
          {builder.blocks.map((block, bIndex) => (
            <View key={block.id} style={[styles.blockCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.blockHeader}>
                <Text style={[styles.blockTitle, { color: theme.colors.text }]}>{block.name}</Text>
                <TouchableOpacity onPress={() => builder.removeBlock(block.id)}>
                  <Feather name="trash-2" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              {block.exercises.map((ex, eIndex) => (
                <View key={ex.id} style={[styles.exerciseContainer, { borderColor: theme.colors.border }]}>
                  <View style={styles.exerciseHeader}>
                    <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{ex.name}</Text>
                    <TouchableOpacity onPress={() => builder.removeExerciseFromBlock(block.id, ex.id)}>
                      <Feather name="x" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.notesInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={ex.notes || ''}
                    onChangeText={(t) => builder.updateExerciseNotes(block.id, ex.id, t)}
                    placeholder="Consignes (optionnel)..."
                    placeholderTextColor={theme.colors.textMuted}
                  />

                  {ex.sets.map((set, sIndex) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text style={[styles.setNumber, { color: theme.colors.textMuted }]}>{sIndex + 1}</Text>
                      <TextInput
                        style={[styles.setField, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        placeholder="Reps/Dist"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        onChangeText={(v) => builder.updateSet(block.id, ex.id, set.id, { reps: parseInt(v) })}
                      />
                      <TextInput
                        style={[styles.setField, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        placeholder="Réc (s)"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        onChangeText={(v) => builder.updateSet(block.id, ex.id, set.id, { restSeconds: parseInt(v) })}
                      />
                      <TouchableOpacity onPress={() => builder.removeSetFromExercise(block.id, ex.id, set.id)}>
                        <Feather name="minus-circle" size={20} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={styles.addSetButton} 
                    onPress={() => builder.addSetToExercise(block.id, ex.id)}
                  >
                    <Feather name="plus" size={16} color={theme.colors.accent} />
                    <Text style={[styles.addSetText, { color: theme.colors.accent }]}>Ajouter une série</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity 
                style={[styles.addExerciseButton, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={() => builder.addExerciseToBlock(block.id, 'Nouvel Exercice')}
              >
                <Feather name="plus" size={18} color={theme.colors.text} />
                <Text style={[styles.addExerciseText, { color: theme.colors.text }]}>Ajouter un exercice</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity 
            style={[styles.addBlockButton, { borderColor: theme.colors.accent }]}
            onPress={handleAddBlock}
          >
            <Feather name="plus-circle" size={20} color={theme.colors.accent} />
            <Text style={[styles.addBlockText, { color: theme.colors.accent }]}>Ajouter un Bloc</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  blocksContainer: {
    gap: 24,
  },
  blockCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseContainer: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    width: 20,
    fontWeight: 'bold',
  },
  setField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  addExerciseText: {
    fontWeight: '600',
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addBlockText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
