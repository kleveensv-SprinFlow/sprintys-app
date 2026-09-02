import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { ExerciseSearch, ExerciseCatalogRow } from './ExerciseSearch';

interface StrengthWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

interface UIExercise {
  id: string;
  catalog_id: string;
  name: string;
  reps: string;
  weight: string;
  isPDC: boolean;
}

interface UIBlock {
  id: string;
  sets: string;
  rest: string;
  exercises: UIExercise[];
}

const REST_PRESETS = ['30s', '1 min', '1m30', '2 min', '3 min'];
const WORKOUT_TYPES = ['Hypertrophie', 'Force', 'Puissance', 'Circuit', 'Test Max', 'Renforcement'];

export const StrengthWorkoutBuilder: React.FC<StrengthWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || '');
  const [workoutType, setWorkoutType] = useState('Hypertrophie');
  const [intensity, setIntensity] = useState('7');
  const [description, setDescription] = useState('');
  
  const [blocks, setBlocks] = useState<UIBlock[]>([]);
  
  // Targeting
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  // Exercise Search Modal State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const addBlock = () => {
    setBlocks([...blocks, {
      id: Math.random().toString(),
      sets: '3',
      rest: '1 min',
      exercises: []
    }]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const moveExercise = (blockIndex: number, exIndex: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const exercises = newBlocks[blockIndex].exercises;
    if ((direction === 'up' && exIndex === 0) || (direction === 'down' && exIndex === exercises.length - 1)) return;
    const newIndex = direction === 'up' ? exIndex - 1 : exIndex + 1;
    [exercises[exIndex], exercises[newIndex]] = [exercises[newIndex], exercises[exIndex]];
    setBlocks(newBlocks);
  };

  const updateBlock = (blockId: string, field: string, value: string) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b));
  };

  const openSearch = (blockId: string) => {
    setActiveBlockId(blockId);
    setIsSearchVisible(true);
  };

  const handleExerciseSelect = (item: ExerciseCatalogRow) => {
    if (!activeBlockId) return;
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          exercises: [...b.exercises, {
            id: Math.random().toString(),
            catalog_id: item.id,
            name: item.name_fr,
            reps: '10',
            weight: '',
            isPDC: false
          }]
        };
      }
      return b;
    }));
    setIsSearchVisible(false);
    setActiveBlockId(null);
  };

  const updateExercise = (blockId: string, exId: string, field: keyof UIExercise, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => ex.id === exId ? { ...ex, [field]: value } : ex)
        };
      }
      return b;
    }));
  };

  const removeExercise = (blockId: string, exId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, exercises: b.exercises.filter(ex => ex.id !== exId) };
      }
      return b;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un titre ǩ la sǸance');
      return;
    }
    if (blocks.length === 0 || blocks.every(b => b.exercises.length === 0)) {
      Alert.alert('Erreur', 'Ajoutez au moins un exercice');
      return;
    }
    if (targetType === 'athlete' && !selectedAthleteId) {
      Alert.alert('Erreur', 'SǸlectionnez un athlǭte');
      return;
    }
    if (targetType === 'team' && !selectedTeamId) {
      Alert.alert('Erreur', 'SǸlectionnez une Ǹquipe');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Non connectǸ");

      const baseWorkoutData = {
        coach_id: user.id,
        date_prevue: date.toISOString(),
        type_seance: title,
        description: description,
        intensity: parseInt(intensity) || 7,
        blocks: blocks,
        status: 'pending'
      };

      if (targetType === 'athlete' && selectedAthleteId) {
        await workoutService.createPlannedWorkout({
          ...baseWorkoutData,
          athlete_id: selectedAthleteId,
        });
      } else if (targetType === 'team' && selectedTeamId) {
        await workoutService.assignWorkoutToGroup(baseWorkoutData, 'team', selectedTeamId);
      } else if (targetType === 'subgroup' && selectedSubgroupId) {
        await workoutService.assignWorkoutToGroup(baseWorkoutData, 'subgroup', selectedSubgroupId);
      } else {
        throw new Error('Cible invalide pour la sǸance');
      }

      onSave();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erreur', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Targeting Derived Data
  const currentTeamAthletes = teamMembers.filter(tm => tm.team_id === selectedTeamId);
  const currentTeamSubgroups = subgroups.filter(sg => sg.team_id === selectedTeamId);

  let targetDisplay = 'SǸlectionner...';
  if (targetType === 'team' && selectedTeamId) targetDisplay = teams.find(t => t.id === selectedTeamId)?.name || targetDisplay;
  else if (targetType === 'athlete' && selectedAthleteId) targetDisplay = currentTeamAthletes.find(a => a.user_id === selectedAthleteId)?.profile?.full_name || targetDisplay;
  else if (targetType === 'subgroup' && selectedSubgroupId) targetDisplay = currentTeamSubgroups.find(s => s.id === selectedSubgroupId)?.name || targetDisplay;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.headerTitleInput}
          placeholder="Titre de la sǸance"
          placeholderTextColor={theme.colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding} keyboardShouldPersistTaps="handled">
        {/* GLOBAL SETTINGS CARD */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingsHeader} onPress={() => setShowSettings(!showSettings)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="target" size={18} color={theme.colors.accent} />
              <Text style={styles.settingsTitle}>Paramǭtres ({targetDisplay})</Text>
            </View>
            <Feather name={showSettings ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          {showSettings && (
            <View style={styles.settingsBody}>
              {/* Target Selection */}
              <View style={styles.targetControl}>
                <TouchableOpacity style={[styles.targetTab, targetType === 'team' && styles.targetTabActive]} onPress={() => setTargetType('team')}>
                  <Text style={[styles.targetTabText, targetType === 'team' && styles.targetTabTextActive]}>ǲquipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.targetTab, targetType === 'subgroup' && styles.targetTabActive]} onPress={() => setTargetType('subgroup')}>
                  <Text style={[styles.targetTabText, targetType === 'subgroup' && styles.targetTabTextActive]}>Sous-grp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.targetTab, targetType === 'athlete' && styles.targetTabActive]} onPress={() => setTargetType('athlete')}>
                  <Text style={[styles.targetTabText, targetType === 'athlete' && styles.targetTabTextActive]}>Athlǭte</Text>
                </TouchableOpacity>
              </View>

              {/* Sub-Target Picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {targetType === 'team' && teams.map(t => (
                  <TouchableOpacity key={t.id} style={[styles.pickerChip, selectedTeamId === t.id && styles.pickerChipActive]} onPress={() => setSelectedTeamId(t.id)}>
                    <Text style={[styles.pickerChipText, selectedTeamId === t.id && styles.pickerChipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
                {targetType === 'subgroup' && currentTeamSubgroups.map(sg => (
                  <TouchableOpacity key={sg.id} style={[styles.pickerChip, selectedSubgroupId === sg.id && styles.pickerChipActive]} onPress={() => setSelectedSubgroupId(sg.id)}>
                    <Text style={[styles.pickerChipText, selectedSubgroupId === sg.id && styles.pickerChipTextActive]}>{sg.name}</Text>
                  </TouchableOpacity>
                ))}
                {targetType === 'athlete' && currentTeamAthletes.map(a => (
                  <TouchableOpacity key={a.user_id} style={[styles.pickerChip, selectedAthleteId === a.user_id && styles.pickerChipActive]} onPress={() => setSelectedAthleteId(a.user_id)}>
                    <Text style={[styles.pickerChipText, selectedAthleteId === a.user_id && styles.pickerChipTextActive]}>{a.profile?.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Workout Type */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {WORKOUT_TYPES.map(type => (
                  <TouchableOpacity key={type} style={[styles.typeChip, workoutType === type && styles.typeChipActive]} onPress={() => setWorkoutType(type)}>
                    <Text style={[styles.typeChipText, workoutType === type && styles.typeChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notes */}
              <TextInput
                style={styles.notesInput}
                placeholder="Notes ou consignes globales..."
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          )}
        </View>

        {/* BLOCKS SECTION */}
        {blocks.map((block, bIdx) => {
          const isSuperset = block.exercises.length > 1;
          
          return (
            <View key={block.id} style={styles.blockCard}>
              {/* Block Header */}
              <View style={styles.blockHeader}>
                <View style={styles.blockHeaderTitleRow}>
                  <Text style={styles.blockIndex}>Bloc {bIdx + 1}</Text>
                  {isSuperset && (
                    <View style={styles.supersetBadge}>
                      <Text style={styles.supersetText}>SUPERSET</Text>
                    </View>
                  )}
                </View>
                <View style={styles.blockActions}>
                  <TouchableOpacity onPress={() => moveBlock(bIdx, 'up')} disabled={bIdx === 0} style={{ opacity: bIdx === 0 ? 0.3 : 1, padding: 4 }}>
                    <Feather name="chevron-up" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveBlock(bIdx, 'down')} disabled={bIdx === blocks.length - 1} style={{ opacity: bIdx === blocks.length - 1 ? 0.3 : 1, padding: 4 }}>
                    <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeBlock(block.id)} style={{ padding: 4, marginLeft: 8 }}>
                    <Feather name="trash-2" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Block Settings (Sets & Rest) */}
              <View style={styles.blockSettingsGrid}>
                <View style={styles.blockSettingCell}>
                  <Text style={styles.cellLabel}>SǸries</Text>
                  <TextInput
                    style={styles.cellInput}
                    keyboardType="number-pad"
                    value={block.sets}
                    onChangeText={(val) => updateBlock(block.id, 'sets', val)}
                  />
                </View>
                <View style={styles.blockSettingCell}>
                  <Text style={styles.cellLabel}>Repos (Fin de sǸrie)</Text>
                  <View style={styles.restInputWrapper}>
                    <TextInput
                      style={[styles.cellInput, { flex: 1 }]}
                      value={block.rest}
                      onChangeText={(val) => updateBlock(block.id, 'rest', val)}
                    />
                    <View style={styles.restPresetsRow}>
                      {REST_PRESETS.slice(0, 3).map(p => (
                        <TouchableOpacity key={p} onPress={() => updateBlock(block.id, 'rest', p)}>
                          <Text style={styles.restPresetTiny}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Exercises List */}
              <View style={[styles.exercisesContainer, isSuperset && styles.supersetContainer]}>
                {block.exercises.map((ex, exIdx) => (
                  <View key={ex.id} style={styles.exerciseRow}>
                    {isSuperset && (
                      <View style={styles.supersetLine} />
                    )}
                    <View style={styles.exInfo}>
                      <View style={styles.exHeaderRow}>
                        <Text style={styles.exTitle} numberOfLines={1}>{ex.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => moveExercise(bIdx, exIdx, 'up')} disabled={exIdx === 0} style={{ padding: 4, opacity: exIdx === 0 ? 0.3 : 1 }}>
                            <Feather name="arrow-up" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => moveExercise(bIdx, exIdx, 'down')} disabled={exIdx === block.exercises.length - 1} style={{ padding: 4, opacity: exIdx === block.exercises.length - 1 ? 0.3 : 1 }}>
                            <Feather name="arrow-down" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeExercise(block.id, ex.id)} style={{ padding: 4, marginLeft: 8 }}>
                            <Feather name="x" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.exInputsRow}>
                        <View style={styles.exInputGroup}>
                          <Text style={styles.exInputLabel}>Reps</Text>
                          <TextInput
                            style={styles.exInput}
                            value={ex.reps}
                            onChangeText={(val) => updateExercise(block.id, ex.id, 'reps', val)}
                            placeholder="10"
                            placeholderTextColor={theme.colors.textMuted}
                          />
                        </View>
                        <View style={styles.exInputGroup}>
                          <Text style={styles.exInputLabel}>Charge</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TextInput
                              style={[styles.exInput, { flex: 1 }, ex.isPDC && { opacity: 0.5 }]}
                              value={ex.weight}
                              onChangeText={(val) => updateExercise(block.id, ex.id, 'weight', val)}
                              placeholder="kg"
                              placeholderTextColor={theme.colors.textMuted}
                              editable={!ex.isPDC}
                            />
                            <TouchableOpacity 
                              style={[styles.pdcToggle, ex.isPDC && styles.pdcToggleActive]} 
                              onPress={() => updateExercise(block.id, ex.id, 'isPDC', !ex.isPDC)}
                            >
                              <Text style={[styles.pdcText, ex.isPDC && styles.pdcTextActive]}>PDC</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addExerciseBtn} onPress={() => openSearch(block.id)}>
                  <Feather name="plus-circle" size={18} color={theme.colors.accent} />
                  <Text style={styles.addExerciseText}>{block.exercises.length > 0 ? "Associer en Superset" : "Ajouter un exercice"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBlockBtn} onPress={addBlock}>
          <Feather name="layers" size={20} color={theme.colors.accent} />
          <Text style={styles.addBlockText}>Nouveau Bloc</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Search Modal */}
      <Modal visible={isSearchVisible} animationType="slide" presentationStyle="pageSheet">
        <ExerciseSearch 
          onSelect={handleExerciseSelect}
          onCancel={() => setIsSearchVisible(false)}
        />
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  iconButton: { padding: 4 },
  headerTitleInput: { flex: 1, marginHorizontal: 16, fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  saveButton: { backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  content: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 40 },

  settingsCard: { backgroundColor: theme.colors.surface, borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.colors.surfaceLight },
  settingsTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, marginLeft: 8 },
  settingsBody: { padding: 16 },
  
  targetControl: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 8, padding: 4, marginBottom: 12 },
  targetTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  targetTabActive: { backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  targetTabText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  targetTabTextActive: { color: theme.colors.text, fontWeight: 'bold' },

  pickerScroll: { marginBottom: 12 },
  pickerChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  pickerChipActive: { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent },
  pickerChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pickerChipTextActive: { color: theme.colors.accent, fontWeight: 'bold' },

  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  typeChipActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  typeChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: theme.colors.background, fontWeight: 'bold' },

  notesInput: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.colors.border },

  blockCard: { backgroundColor: theme.colors.surface, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight },
  blockHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  blockIndex: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  supersetBadge: { backgroundColor: theme.colors.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.accent + '40' },
  supersetText: { fontSize: 10, fontWeight: '900', color: theme.colors.accent, letterSpacing: 0.5 },
  blockActions: { flexDirection: 'row', alignItems: 'center' },

  blockSettingsGrid: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 16 },
  blockSettingCell: { flex: 1 },
  cellLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  cellInput: { backgroundColor: theme.colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: theme.colors.text, fontSize: 15, fontWeight: 'bold', borderWidth: 1, borderColor: theme.colors.border, textAlign: 'center' },
  restInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restPresetsRow: { flexDirection: 'row', gap: 4 },
  restPresetTiny: { fontSize: 11, color: theme.colors.accent, backgroundColor: theme.colors.accent + '15', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', fontWeight: '600' },

  exercisesContainer: { padding: 16 },
  supersetContainer: { paddingLeft: 24, position: 'relative' },
  exerciseRow: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  supersetLine: { position: 'absolute', left: -16, top: 20, bottom: -20, width: 3, backgroundColor: theme.colors.accent, borderRadius: 2 },
  exInfo: { flex: 1 },
  exHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1, marginRight: 8 },
  
  exInputsRow: { flexDirection: 'row', gap: 12 },
  exInputGroup: { flex: 1 },
  exInputLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 4, fontWeight: '600' },
  exInput: { backgroundColor: theme.colors.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: theme.colors.text, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: theme.colors.border },
  
  pdcToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: theme.colors.surfaceLight, borderWidth: 1, borderColor: theme.colors.border },
  pdcToggleActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  pdcText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary },
  pdcTextActive: { color: '#FFF' },

  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.accent + '50', borderRadius: 12, backgroundColor: theme.colors.accent + '05' },
  addExerciseText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },

  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', gap: 10 },
  addBlockText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textSecondary }
});
