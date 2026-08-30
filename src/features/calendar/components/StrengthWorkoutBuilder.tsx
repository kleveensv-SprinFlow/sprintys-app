import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';

interface StrengthWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

type TargetType = 'team' | 'subgroup' | 'athlete';
type WeightUnit = 'kg' | '%' | 'PDC' | 'txt';

interface ExerciseSet {
  id: string;
  reps: string;
  targetWeight: string;
  weightUnit: WeightUnit;
  rest: string;
}

interface StrengthExercise {
  id: string;
  catalog_id?: string;
  name: string;
  sets: ExerciseSet[];
  notes: string;
}

interface StrengthBlock {
  id: string;
  name: string;
  exercises: StrengthExercise[];
  rest_after_block: string;
}

export const StrengthWorkoutBuilder: React.FC<StrengthWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || 'Séance de Musculation');
  const [intensity, setIntensity] = useState<number>(3);
  
  const [targetType, setTargetType] = useState<TargetType>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<StrengthBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Library Modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [activeBlockIdForLibrary, setActiveBlockIdForLibrary] = useState<string | null>(null);

  useEffect(() => {
    if (showLibraryModal) {
      searchLibrary(librarySearch);
    }
  }, [showLibraryModal, librarySearch]);

  const searchLibrary = async (query: string) => {
    if (query.trim().length === 0) {
      const { data } = await supabase.from('exercises_catalog').select('*').limit(20);
      setLibraryResults(data || []);
      return;
    }
    const { data } = await supabase.from('exercises_catalog')
      .select('*')
      .or(`name_fr.ilike.%\$\{query\}%,name_en.ilike.%\$\{query\}%`)
      .limit(20);
    setLibraryResults(data || []);
  };

  const getNextBlockName = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextIndex = blocks.length % 26;
    return `Bloc ${alphabet[nextIndex]}`;
  };

  const handleAddBlock = () => {
    const newBlock: StrengthBlock = {
      id: Math.random().toString(36).substring(2, 9),
      name: getNextBlockName(),
      exercises: [],
      rest_after_block: '2:00'
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleOpenLibrary = (blockId: string) => {
    setActiveBlockIdForLibrary(blockId);
    setLibrarySearch('');
    setShowLibraryModal(true);
  };

  const handleAddExerciseToBlock = (catalogExercise?: any) => {
    if (!activeBlockIdForLibrary) return;

    const newEx: StrengthExercise = {
      id: Math.random().toString(36).substring(2, 9),
      catalog_id: catalogExercise ? catalogExercise.id : undefined,
      name: catalogExercise ? catalogExercise.name_fr : 'Nouvel exercice',
      notes: catalogExercise ? catalogExercise.description : '',
      sets: [
        { id: Math.random().toString(36).substring(2, 9), reps: '10', targetWeight: '', weightUnit: 'kg', rest: '1:30' }
      ]
    };

    setBlocks(blocks.map(b => {
      if (b.id === activeBlockIdForLibrary) {
        return { ...b, exercises: [...b.exercises, newEx] };
      }
      return b;
    }));
    
    if (catalogExercise) setShowLibraryModal(false);
  };

  const removeExercise = (blockId: string, exId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, exercises: b.exercises.filter(e => e.id !== exId) };
      }
      return b;
    }));
  };

  const cycleWeightUnit = (unit: WeightUnit): WeightUnit => {
    const units: WeightUnit[] = ['kg', '%', 'PDC', 'txt'];
    const idx = units.indexOf(unit);
    return units[(idx + 1) % units.length];
  };

  const updateSet = (blockId: string, exId: string, setId: string, field: keyof ExerciseSet, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exId) {
              return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
              };
            }
            return ex;
          })
        };
      }
      return b;
    }));
  };

  const addSetToExercise = (blockId: string, exId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exId) {
              const lastSet = ex.sets[ex.sets.length - 1];
              const newSet = lastSet 
                ? { ...lastSet, id: Math.random().toString(36).substring(2, 9) }
                : { id: Math.random().toString(36).substring(2, 9), reps: '8', targetWeight: '', weightUnit: 'kg' as WeightUnit, rest: '1:30' };
              return { ...ex, sets: [...ex.sets, newSet] };
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
              return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
            }
            return ex;
          })
        };
      }
      return b;
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour la séance.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('workouts').insert([{
        coach_id: user.id,
        team_id: targetType === 'team' ? selectedTeamId : null,
        subgroup_id: targetType === 'subgroup' ? selectedSubgroupId : null,
        athlete_id: targetType === 'athlete' ? selectedAthleteId : null,
        date_prevue: date.toISOString(),
        type_seance: title.trim(),
        intensity,
        blocks, // JSONB structure mapping perfectly to our blocks state
        status: 'planned'
      }]);

      if (error) throw error;
      onSave();
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la séance : ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Targeting variables
  const currentTeamSubgroups = subgroups.filter(sg => sg.team_id === selectedTeamId);
  const currentTeamAthletes = teamMembers.filter(tm => tm.team_id === selectedTeamId);
  let targetDisplay = 'Sélectionner...';
  if (targetType === 'team' && selectedTeamId) {
    targetDisplay = teams.find(t => t.id === selectedTeamId)?.name || targetDisplay;
  } else if (targetType === 'subgroup' && selectedSubgroupId) {
    targetDisplay = subgroups.find(sg => sg.id === selectedSubgroupId)?.name || targetDisplay;
  } else if (targetType === 'athlete' && selectedAthleteId) {
    targetDisplay = currentTeamAthletes.find(a => a.user_id === selectedAthleteId)?.profile?.full_name || targetDisplay;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une séance</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: isSaving ? theme.colors.surfaceLight : theme.colors.accent }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Text style={styles.saveButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* TITRE */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de la séance"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* CIBLAGE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cibler</Text>
          <TouchableOpacity style={styles.targetButton} onPress={() => setShowTargetModal(true)}>
            <Feather name="users" size={16} color={theme.colors.accent} />
            <Text style={styles.targetButtonText}>{targetDisplay}</Text>
          </TouchableOpacity>
        </View>

        {/* BLOCKS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Programme (Blocs & Supersets)</Text>
          
          {blocks.map((block) => (
            <View key={block.id} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <TextInput
                  style={styles.blockTitleInput}
                  value={block.name}
                  onChangeText={(t) => setBlocks(blocks.map(b => b.id === block.id ? { ...b, name: t } : b))}
                />
                <TouchableOpacity onPress={() => removeBlock(block.id)}>
                  <Feather name="trash-2" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              {block.exercises.map((ex, exIdx) => (
                <View key={ex.id} style={styles.exerciseContainer}>
                  {/* Exercise Header */}
                  <View style={styles.exHeader}>
                    <Text style={styles.exIndex}>{exIdx + 1}</Text>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <TouchableOpacity onPress={() => removeExercise(block.id, ex.id)} style={{ padding: 4 }}>
                      <Feather name="x" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Sets Table */}
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { width: 30 }]}>SET</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>REPS</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>CHARGE</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>REPOS</Text>
                      <View style={{ width: 30 }} />
                    </View>

                    {ex.sets.map((set, setIdx) => (
                      <View key={set.id} style={styles.tableRow}>
                        <View style={styles.setIndexBadge}>
                          <Text style={styles.setIndexText}>{setIdx + 1}</Text>
                        </View>
                        
                        <TextInput
                          style={styles.tableInput}
                          value={set.reps}
                          onChangeText={(t) => updateSet(block.id, ex.id, set.id, 'reps', t)}
                          keyboardType="default"
                          placeholder="Ex: 10"
                          placeholderTextColor={theme.colors.textMuted}
                        />

                        {/* SMART INPUT WEIGHT */}
                        <View style={styles.smartWeightContainer}>
                          <TextInput
                            style={[styles.tableInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                            value={set.targetWeight}
                            onChangeText={(t) => updateSet(block.id, ex.id, set.id, 'targetWeight', t)}
                            keyboardType="default"
                            placeholder="-"
                            placeholderTextColor={theme.colors.textMuted}
                          />
                          <TouchableOpacity 
                            style={styles.unitToggleBtn}
                            onPress={() => updateSet(block.id, ex.id, set.id, 'weightUnit', cycleWeightUnit(set.weightUnit))}
                          >
                            <Text style={styles.unitToggleText}>{set.weightUnit}</Text>
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={styles.tableInput}
                          value={set.rest}
                          onChangeText={(t) => updateSet(block.id, ex.id, set.id, 'rest', t)}
                          keyboardType="default"
                          placeholder="1:30"
                          placeholderTextColor={theme.colors.textMuted}
                        />

                        <TouchableOpacity onPress={() => removeSet(block.id, ex.id, set.id)} style={styles.deleteSetBtn}>
                          <Feather name="trash-2" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.addSetBtn} onPress={() => addSetToExercise(block.id, ex.id)}>
                    <Text style={styles.addSetText}>+ Ajouter une série</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addExerciseToBlockBtn} onPress={() => handleOpenLibrary(block.id)}>
                <Feather name="plus" size={16} color={theme.colors.accent} />
                <Text style={styles.addExerciseToBlockText}>Ajouter un exercice {block.exercises.length > 0 ? '(Superset)' : ''}</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addBlockBtn} onPress={handleAddBlock}>
            <Text style={styles.addBlockText}>+ Ajouter un Bloc</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL BIBLIOTHEQUE */}
      <Modal visible={showLibraryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Base d'exercices</Text>
              <TouchableOpacity onPress={() => setShowLibraryModal(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={theme.colors.textMuted}
              value={librarySearch}
              onChangeText={setLibrarySearch}
            />
            <TouchableOpacity 
              style={styles.freeTextExerciseBtn} 
              onPress={() => handleAddExerciseToBlock(null)}
            >
              <Feather name="edit-3" size={16} color={theme.colors.accent} />
              <Text style={styles.freeTextExerciseText}>Saisir un exercice manuellement</Text>
            </TouchableOpacity>

            <ScrollView keyboardShouldPersistTaps="handled">
              {libraryResults.map((ex, idx) => (
                <TouchableOpacity key={idx} style={styles.libraryItem} onPress={() => handleAddExerciseToBlock(ex)}>
                  <Text style={styles.libraryItemTitle}>{ex.name_fr}</Text>
                  {ex.name_en && <Text style={styles.libraryItemSub}>{ex.name_en}</Text>}
                  {ex.zones && ex.zones.length > 0 && (
                    <Text style={styles.libraryItemZones}>{ex.zones.join(' • ')}</Text>
                  )}
                </TouchableOpacity>
              ))}
              {libraryResults.length === 0 && (
                <Text style={styles.emptyResultsText}>Aucun résultat pour "{librarySearch}"</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CIBLAGE */}
      <Modal visible={showTargetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cibler la séance</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.modalSubtitle}>Équipe entière</Text>
              {teams.map(t => (
                <TouchableOpacity key={t.id} style={styles.targetOption} onPress={() => { setSelectedTeamId(t.id); setTargetType('team'); setShowTargetModal(false); }}>
                  <Text style={styles.targetOptionText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
              
              {currentTeamSubgroups.length > 0 && <Text style={styles.modalSubtitle}>Sous-groupes</Text>}
              {currentTeamSubgroups.map(sg => (
                <TouchableOpacity key={sg.id} style={styles.targetOption} onPress={() => { setSelectedSubgroupId(sg.id); setTargetType('subgroup'); setShowTargetModal(false); }}>
                  <Text style={styles.targetOptionText}>{sg.name}</Text>
                </TouchableOpacity>
              ))}

              {currentTeamAthletes.length > 0 && <Text style={styles.modalSubtitle}>Individuel</Text>}
              {currentTeamAthletes.map(a => (
                <TouchableOpacity key={a.user_id} style={styles.targetOption} onPress={() => { setSelectedAthleteId(a.user_id); setTargetType('athlete'); setShowTargetModal(false); }}>
                  <Text style={styles.targetOptionText}>{a.profile?.full_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTargetModal(false)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceLight },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  saveButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  scrollContent: { padding: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  titleInput: { fontSize: 24, fontWeight: '800', marginBottom: 24, paddingVertical: 8, color: theme.colors.text },
  
  targetButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '15',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', gap: 8
  },
  targetButtonText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },

  // Blocks
  blockCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  blockTitleInput: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  
  addBlockBtn: { 
    padding: 16, backgroundColor: theme.colors.surface, borderRadius: 16, 
    borderWidth: 2, borderColor: theme.colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center'
  },
  addBlockText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 15 },

  addExerciseToBlockBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    paddingVertical: 14, backgroundColor: theme.colors.accent + '15', borderRadius: 12, marginTop: 8 
  },
  addExerciseToBlockText: { color: theme.colors.accent, fontSize: 14, fontWeight: 'bold' },

  // Exercises inside Block
  exerciseContainer: {
    marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surfaceLight, color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  exName: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.text, marginLeft: 10 },
  
  // Table
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  setIndexBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  setIndexText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  
  tableInput: { 
    flex: 1, backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, 
    padding: 10, borderRadius: 8, fontSize: 14, textAlign: 'center', fontWeight: '500'
  },
  smartWeightContainer: { flex: 1.5, flexDirection: 'row' },
  unitToggleBtn: { 
    backgroundColor: theme.colors.text, paddingHorizontal: 6, 
    borderTopRightRadius: 8, borderBottomRightRadius: 8, justifyContent: 'center', alignItems: 'center',
    width: 36
  },
  unitToggleText: { color: theme.colors.surface, fontSize: 10, fontWeight: 'bold' },
  
  deleteSetBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 8 },
  addSetBtn: { alignSelf: 'center', marginTop: 4, paddingVertical: 8, paddingHorizontal: 16 },
  addSetText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  closeModalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  
  searchInput: { backgroundColor: theme.colors.surfaceLight, padding: 16, borderRadius: 16, fontSize: 16, color: theme.colors.text, marginBottom: 16 },
  freeTextExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: theme.colors.accent + '15', borderRadius: 16, marginBottom: 16 },
  freeTextExerciseText: { color: theme.colors.accent, fontWeight: 'bold' },
  
  libraryItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  libraryItemTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  libraryItemSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  libraryItemZones: { fontSize: 12, color: theme.colors.accent, fontWeight: '600' },
  emptyResultsText: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 },

  modalSubtitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  targetOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  targetOptionText: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  modalCancel: { marginTop: 24, paddingVertical: 16, alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 16 },
  modalCancelText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 }
});
