import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { workoutService } from '../../../services/workoutService';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { ExerciseSearch, ExerciseCatalogRow } from './ExerciseSearch';
import { WorkoutBlock, WorkoutExercise, WorkoutSet, BlockType } from '../../../types/workout';
import uuid from 'react-native-uuid';

interface RunWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

const WORKOUT_TYPES = ['Piste', 'Lactique', 'Aérobie', 'VMA', 'Sprint', 'Footing', 'Fartlek', 'Renforcement'];

const BLOCK_TYPES: { id: BlockType; label: string; color: string }[] = [
  { id: 'warmup', label: 'Échauffement', color: '#10B981' },
  { id: 'sprint', label: 'Sprint / Accélération', color: '#EF4444' },
  { id: 'max_speed', label: 'Vitesse Maximale', color: '#8B5CF6' },
  { id: 'endurance_sprint', label: 'Endurance Sprint', color: '#F59E0B' },
  { id: 'endurance', label: 'Endurance', color: '#3B82F6' },
  { id: 'technique', label: 'Technique', color: '#6366F1' },
  { id: 'plyo', label: 'Pliométrie', color: '#EC4899' },
  { id: 'cooldown', label: 'Récupération', color: '#6B7280' },
];

const PRESET_DISTANCES = [10, 20, 30, 40, 50, 60, 100, 150, 200, 400];
const PRESET_REPS = [1, 2, 3, 4, 5, 6, 8, 10];
const PRESET_RESTS = [
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '1m30', ms: 90000 },
  { label: '2m', ms: 120000 },
  { label: '3m', ms: 180000 },
  { label: '4m', ms: 240000 },
  { label: '5m', ms: 300000 }
];

export const RunWorkoutBuilder: React.FC<RunWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || '');
  const [workoutType, setWorkoutType] = useState('Piste');
  const [intensity, setIntensity] = useState('7');
  const [description, setDescription] = useState('');
  
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  
  // Targeting
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  // Modals
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isBlockTypeModalVisible, setIsBlockTypeModalVisible] = useState(false);

  // Generator State (per exercise)
  const [generatorState, setGeneratorState] = useState<Record<string, { reps: number, distance: number, rest_ms: number, time_s?: number, intensity?: number }>>({});

  const addBlock = (type: BlockType, name: string) => {
    setBlocks([...blocks, {
      id: uuid.v4() as string,
      type,
      name,
      exercises: []
    }]);
    setIsBlockTypeModalVisible(false);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const openSearch = (blockId: string) => {
    setActiveBlockId(blockId);
    setIsSearchVisible(true);
  };

  const handleExerciseSelect = (item: ExerciseCatalogRow) => {
    if (!activeBlockId) return;
    
    // Auto-detect category based on zones/equipment or just default to run for this builder
    const category = item.zones?.includes('Plyo') ? 'jump' : 'run';

    const newExId = uuid.v4() as string;
    
    setBlocks(blocks.map(b => {
      if (b.id === activeBlockId) {
        return {
          ...b,
          exercises: [...b.exercises, {
            id: newExId,
            catalog_id: item.id,
            name: item.name_fr,
            category: category,
            sets: []
          }]
        };
      }
      return b;
    }));

    // Initialize generator state
    setGeneratorState(prev => ({
      ...prev,
      [newExId]: { reps: 4, distance: 30, rest_ms: 120000 }
    }));

    setIsSearchVisible(false);
    setActiveBlockId(null);
  };

  const removeExercise = (blockId: string, exId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, exercises: b.exercises.filter(ex => ex.id !== exId) };
      }
      return b;
    }));
  };

  const generateSets = (blockId: string, exId: string) => {
    const config = generatorState[exId];
    if (!config) return;

    const newSets: WorkoutSet[] = Array.from({ length: config.reps }).map((_, i) => ({
      id: uuid.v4() as string,
      set_index: i + 1,
      planned_distance_m: config.distance,
      planned_rest_ms: config.rest_ms,
      planned_time_ms: config.time_s ? Math.round(config.time_s * 1000) : undefined,
      planned_intensity: config.intensity
    }));

    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exId) {
              return { ...ex, sets: [...ex.sets, ...newSets].map((s, idx) => ({ ...s, set_index: idx + 1 })) };
            }
            return ex;
          })
        };
      }
      return b;
    }));
  };

  const removeSet = (blockId: string, exId: string, setId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exId) {
              const updatedSets = ex.sets.filter(s => s.id !== setId).map((s, idx) => ({ ...s, set_index: idx + 1 }));
              return { ...ex, sets: updatedSets };
            }
            return ex;
          })
        };
      }
      return b;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un titre à la séance');
      return;
    }
    if (blocks.length === 0 || blocks.every(b => b.exercises.length === 0)) {
      Alert.alert('Erreur', 'Ajoutez au moins un exercice');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Non connecté");

      const baseWorkoutData = {
        coach_id: user.id,
        date_prevue: date.toISOString(),
        type_seance: title,
        description: description,
        intensity: parseInt(intensity) || 7,
        blocks: blocks, // STRICT JSON CONTRACT
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
        throw new Error('Cible invalide pour la séance');
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

  let targetDisplay = 'Sélectionner...';
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
          placeholder="Titre de la séance Piste"
          placeholderTextColor={theme.colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding} keyboardShouldPersistTaps="handled">
        {/* GLOBAL SETTINGS CARD (Same as Strength) */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingsHeader} onPress={() => setShowSettings(!showSettings)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="target" size={18} color={theme.colors.accent} />
              <Text style={styles.settingsTitle}>Paramètres ({targetDisplay})</Text>
            </View>
            <Feather name={showSettings ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          {showSettings && (
            <View style={styles.settingsBody}>
              <View style={styles.targetControl}>
                <TouchableOpacity style={[styles.targetTab, targetType === 'team' && styles.targetTabActive]} onPress={() => setTargetType('team')}>
                  <Text style={[styles.targetTabText, targetType === 'team' && styles.targetTabTextActive]}>Équipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.targetTab, targetType === 'subgroup' && styles.targetTabActive]} onPress={() => setTargetType('subgroup')}>
                  <Text style={[styles.targetTabText, targetType === 'subgroup' && styles.targetTabTextActive]}>Sous-grp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.targetTab, targetType === 'athlete' && styles.targetTabActive]} onPress={() => setTargetType('athlete')}>
                  <Text style={[styles.targetTabText, targetType === 'athlete' && styles.targetTabTextActive]}>Athlète</Text>
                </TouchableOpacity>
              </View>

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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {WORKOUT_TYPES.map(type => (
                  <TouchableOpacity key={type} style={[styles.typeChip, workoutType === type && styles.typeChipActive]} onPress={() => setWorkoutType(type)}>
                    <Text style={[styles.typeChipText, workoutType === type && styles.typeChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.notesInput}
                placeholder="Notes de la séance..."
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
          const blockTypeColor = BLOCK_TYPES.find(t => t.id === block.type)?.color || theme.colors.accent;
          
          return (
            <View key={block.id} style={[styles.blockCard, { borderLeftColor: blockTypeColor, borderLeftWidth: 4 }]}>
              <View style={styles.blockHeader}>
                <View style={styles.blockHeaderTitleRow}>
                  <Text style={styles.blockIndex}>{block.name}</Text>
                </View>
                <TouchableOpacity onPress={() => removeBlock(block.id)} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.exercisesContainer}>
                {block.exercises.map((ex) => {
                  const genState = generatorState[ex.id] || { reps: 4, distance: 30, rest_ms: 120000 };
                  
                  return (
                    <View key={ex.id} style={styles.exerciseRow}>
                      <View style={styles.exHeaderRow}>
                        <Text style={styles.exTitle}>{ex.name}</Text>
                        <TouchableOpacity onPress={() => removeExercise(block.id, ex.id)} style={{ padding: 4 }}>
                          <Feather name="x" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      
                      {/* QUICK GENERATOR UI */}
                      <View style={styles.generatorBox}>
                        <Text style={styles.generatorTitle}>Générateur Rapide</Text>
                        
                        <Text style={styles.genLabel}>Distance</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genScroll}>
                          {PRESET_DISTANCES.map(d => (
                            <TouchableOpacity 
                              key={d} 
                              style={[styles.genChip, genState.distance === d && styles.genChipActive]}
                              onPress={() => setGeneratorState({...generatorState, [ex.id]: {...genState, distance: d}})}
                            >
                              <Text style={[styles.genChipText, genState.distance === d && styles.genChipTextActive]}>{d}m</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        <Text style={styles.genLabel}>Répétitions</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genScroll}>
                          {PRESET_REPS.map(r => (
                            <TouchableOpacity 
                              key={r} 
                              style={[styles.genChip, genState.reps === r && styles.genChipActive]}
                              onPress={() => setGeneratorState({...generatorState, [ex.id]: {...genState, reps: r}})}
                            >
                              <Text style={[styles.genChipText, genState.reps === r && styles.genChipTextActive]}>{r}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        <Text style={styles.genLabel}>Récupération</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genScroll}>
                          {PRESET_RESTS.map(r => (
                            <TouchableOpacity 
                              key={r.ms} 
                              style={[styles.genChip, genState.rest_ms === r.ms && styles.genChipActive]}
                              onPress={() => setGeneratorState({...generatorState, [ex.id]: {...genState, rest_ms: r.ms}})}
                            >
                              <Text style={[styles.genChipText, genState.rest_ms === r.ms && styles.genChipTextActive]}>{r.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                                                <Text style={styles.genLabel}>Cible Chrono (s) - Optionnel</Text>
                        <TextInput 
                          style={[styles.notesInput, { minHeight: 40, marginBottom: 12 }]}
                          placeholder="Ex: 4.50"
                          keyboardType="decimal-pad"
                          value={genState.time_s ? genState.time_s.toString() : ''}
                          onChangeText={(v) => {
                            const sec = parseFloat(v.replace(',', '.'));
                            setGeneratorState({...generatorState, [ex.id]: {...genState, time_s: isNaN(sec) ? undefined : sec}});
                          }}
                        />

                                                <Text style={styles.genLabel}>Intensit� cibl�e (%)</Text>
                        <TextInput 
                          style={[styles.notesInput, { minHeight: 40, marginBottom: 12 }]}
                          placeholder="Ex: 95"
                          keyboardType="numeric"
                          value={genState.intensity ? genState.intensity.toString() : ''}
                          onChangeText={(v) => {
                            const i = parseInt(v);
                            setGeneratorState({...generatorState, [ex.id]: {...genState, intensity: isNaN(i) ? undefined : i}});
                          }}
                        />

                        <TouchableOpacity style={styles.genButton} onPress={() => generateSets(block.id, ex.id)}>
                          <Feather name="zap" size={16} color="#FFF" />
                          <Text style={styles.genButtonText}>Générer {genState.reps} Séries</Text>
                        </TouchableOpacity>
                      </View>

                      {/* ACTUAL SETS (JSON Data) */}
                      {ex.sets.length > 0 && (
                        <View style={styles.setsList}>
                          <Text style={styles.setsListTitle}>Séries générées (Prètes pour l'athlète) :</Text>
                          {ex.sets.map((set) => (
                            <View key={set.id} style={styles.setItemRow}>
                              <Text style={styles.setText}>Rép {set.set_index}</Text>
                              <Text style={styles.setTextBold}>{set.planned_distance_m} m</Text>
                              <Text style={styles.setTextRest}>Recup: {set.planned_rest_ms ? set.planned_rest_ms / 1000 : 0}s</Text>
                              <TouchableOpacity onPress={() => removeSet(block.id, ex.id, set.id)}>
                                <Feather name="trash" size={14} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity style={styles.addExerciseBtn} onPress={() => openSearch(block.id)}>
                  <Feather name="plus-circle" size={18} color={theme.colors.accent} />
                  <Text style={styles.addExerciseText}>Ajouter un effort piste</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBlockBtn} onPress={() => setIsBlockTypeModalVisible(true)}>
          <Feather name="layers" size={20} color={theme.colors.accent} />
          <Text style={styles.addBlockText}>Nouveau Bloc Piste</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Block Type Modal */}
      <Modal visible={isBlockTypeModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsBlockTypeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.blockTypeModalContent}>
            <Text style={styles.modalTitle}>Sélectionner le type de bloc</Text>
            {BLOCK_TYPES.map(type => (
              <TouchableOpacity 
                key={type.id} 
                style={[styles.blockTypeItem, { borderLeftColor: type.color, borderLeftWidth: 4 }]} 
                onPress={() => addBlock(type.id, type.label)}
              >
                <Text style={styles.blockTypeText}>{type.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsBlockTypeModalVisible(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Search Modal */}
      <Modal visible={isSearchVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsSearchVisible(false)}>
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

  exercisesContainer: { padding: 16 },
  exerciseRow: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  exHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1, marginRight: 8 },
  
  generatorBox: { backgroundColor: theme.colors.surfaceLight, padding: 12, borderRadius: 8, marginBottom: 12 },
  generatorTitle: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  genLabel: { fontSize: 12, color: theme.colors.text, marginBottom: 6, fontWeight: '600' },
  genScroll: { marginBottom: 12 },
  genChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.background, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  genChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  genChipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  genChipTextActive: { color: '#FFF' },
  genButton: { backgroundColor: theme.colors.text, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 8, gap: 8, marginTop: 8 },
  genButtonText: { color: theme.colors.background, fontWeight: 'bold', fontSize: 14 },

  setsList: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  setsListTitle: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: 8 },
  setItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  setText: { fontSize: 13, color: theme.colors.text, width: 50 },
  setTextBold: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  setTextRest: { fontSize: 12, color: theme.colors.textSecondary, marginRight: 12 },

  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.accent + '50', borderRadius: 12, backgroundColor: theme.colors.accent + '05' },
  addExerciseText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },

  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', gap: 10 },
  addBlockText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  blockTypeModalContent: { backgroundColor: theme.colors.background, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16, textAlign: 'center' },
  blockTypeItem: { padding: 16, backgroundColor: theme.colors.surface, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  blockTypeText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  modalCancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  modalCancelText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: 'bold' }
});
