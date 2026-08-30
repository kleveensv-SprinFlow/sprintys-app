import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
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

interface ExerciseSet {
  id: string;
  reps: string;
  targetWeight: string;
  rest: string;
  tempo: string;
}

interface StrengthExercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes: string;
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

  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Library Modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryResults, setLibraryResults] = useState<any[]>([]);

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
      .or(`name_fr.ilike.%${query}%,name_en.ilike.%${query}%`)
      .limit(20);
    setLibraryResults(data || []);
  };

  const handleAddExercise = (catalogExercise?: any) => {
    const newEx: StrengthExercise = {
      id: Math.random().toString(36).substring(2, 9),
      name: catalogExercise ? catalogExercise.name_fr : '',
      notes: catalogExercise ? catalogExercise.description : '',
      sets: [
        { id: Math.random().toString(36).substring(2, 9), reps: '8', targetWeight: '70%', rest: '2:00', tempo: '2010' }
      ]
    };
    setExercises([...exercises, newEx]);
    if (catalogExercise) setShowLibraryModal(false);
  };

  const updateExerciseName = (exId: string, text: string) => {
    setExercises(exercises.map(ex => ex.id === exId ? { ...ex, name: text } : ex));
  };

  const addSetToExercise = (exId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet = lastSet 
          ? { ...lastSet, id: Math.random().toString(36).substring(2, 9) }
          : { id: Math.random().toString(36).substring(2, 9), reps: '8', targetWeight: '', rest: '1:30', tempo: '' };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const removeSet = (exId: string, setId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
      }
      return ex;
    }));
  };

  const updateSet = (exId: string, setId: string, field: keyof ExerciseSet, value: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
        };
      }
      return ex;
    }));
  };

  const removeExercise = (exId: string) => {
    setExercises(exercises.filter(ex => ex.id !== exId));
  };

  const handleSave = async () => {
    if (!title.trim() || !user?.id) {
      Alert.alert('Erreur', 'Veuillez au moins renseigner le titre de la séance.');
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
        description: 'Séance de Musculation/Haltérophilie',
        intensity,
        exercises: exercises,
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

  const renderTargetLabel = () => {
    if (targetType === 'team') {
      const t = teams.find(t => t.id === selectedTeamId);
      return t ? `Équipe : ${t.name}` : 'Choisir une cible';
    } else if (targetType === 'subgroup') {
      const sg = subgroups.find(s => s.id === selectedSubgroupId);
      return sg ? `Sous-groupe : ${sg.name}` : 'Choisir une cible';
    } else {
      const athlete = teamMembers.find(m => m.user_id === selectedAthleteId);
      return athlete ? `Athlète : ${athlete.profile?.full_name}` : 'Choisir une cible';
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Séance Musculation</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.colors.accent, opacity: isSaving ? 0.7 : 1 }]}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <TextInput
            style={[styles.titleInput, { color: theme.colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre (ex: Jambes & Poussée)"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity style={styles.targetButton} onPress={() => setShowTargetModal(true)}>
            <Feather name="users" size={16} color={theme.colors.accent} />
            <Text style={styles.targetButtonText}>{renderTargetLabel()}</Text>
            <Feather name="chevron-down" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {exercises.map((ex, exIndex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exHeader}>
              <View style={styles.exThumbnailPlaceholder}>
                <Feather name="activity" size={20} color={theme.colors.textMuted} />
              </View>
              <View style={styles.exTitleContainer}>
                <TextInput
                  style={styles.exNameInput}
                  value={ex.name}
                  onChangeText={(t) => updateExerciseName(ex.id, t)}
                  placeholder="Nom de l'exercice (ex: Squat)"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <TouchableOpacity onPress={() => removeExercise(ex.id)} style={styles.exRemoveBtn}>
                <Feather name="trash-2" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.exNotes}
              value={ex.notes}
              onChangeText={(t) => {
                setExercises(exercises.map(e => e.id === ex.id ? { ...e, notes: t } : e));
              }}
              placeholder="Consigne (ex: Bien descendre sous la parallèle)"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Série</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Charge/RPE</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Repos</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Tempo</Text>
              <View style={{ width: 30 }} />
            </View>

            {ex.sets.map((set, sIndex) => (
              <View key={set.id} style={styles.tableRow}>
                <Text style={[styles.tableCellLabel, { flex: 0.5 }]}>{sIndex + 1}</Text>
                
                <TextInput style={[styles.tableCellInput, { flex: 1 }]} value={set.reps} onChangeText={(v) => updateSet(ex.id, set.id, 'reps', v)} placeholder="8" placeholderTextColor={theme.colors.textMuted} />
                <TextInput style={[styles.tableCellInput, { flex: 1.5 }]} value={set.targetWeight} onChangeText={(v) => updateSet(ex.id, set.id, 'targetWeight', v)} placeholder="80%" placeholderTextColor={theme.colors.textMuted} />
                <TextInput style={[styles.tableCellInput, { flex: 1 }]} value={set.rest} onChangeText={(v) => updateSet(ex.id, set.id, 'rest', v)} placeholder="2'00" placeholderTextColor={theme.colors.textMuted} />
                <TextInput style={[styles.tableCellInput, { flex: 1 }]} value={set.tempo} onChangeText={(v) => updateSet(ex.id, set.id, 'tempo', v)} placeholder="3010" placeholderTextColor={theme.colors.textMuted} />
                
                <TouchableOpacity onPress={() => removeSet(ex.id, set.id)} style={{ width: 30, alignItems: 'center' }}>
                  <Feather name="minus-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSetToExercise(ex.id)}>
              <Feather name="copy" size={14} color={theme.colors.text} />
              <Text style={styles.addSetText}>Dupliquer la dernière série</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowLibraryModal(true)}>
          <Feather name="search" size={20} color={theme.colors.accent} />
          <Text style={styles.addExerciseText}>Chercher un exercice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.addExerciseBtn, { marginTop: 12, backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]} onPress={() => handleAddExercise()}>
          <Feather name="plus-circle" size={20} color={theme.colors.textMuted} />
          <Text style={[styles.addExerciseText, { color: theme.colors.textMuted }]}>Saisie libre (sans base)</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL BIBLIOTHEQUE */}
      <Modal visible={showLibraryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Bibliothèque d'exercices</Text>
              <TouchableOpacity onPress={() => setShowLibraryModal(false)}>
                <Feather name="x" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ backgroundColor: theme.colors.surfaceLight, padding: 12, borderRadius: 12, fontSize: 16, color: theme.colors.text, marginBottom: 16 }}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={theme.colors.textMuted}
              value={librarySearch}
              onChangeText={setLibrarySearch}
            />
            <ScrollView>
              {libraryResults.map((ex, idx) => (
                <TouchableOpacity key={idx} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }} onPress={() => handleAddExercise(ex)}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>{ex.name_fr}</Text>
                  {ex.name_en && <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>{ex.name_en}</Text>}
                  {ex.zones && ex.zones.length > 0 && (
                    <Text style={{ fontSize: 12, color: theme.colors.accent, marginTop: 4 }}>
                      {ex.zones.join(' • ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              {libraryResults.length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 }}>Aucun résultat</Text>
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
              <Text style={styles.modalSubtitle}>Sous-groupe</Text>
              {subgroups.filter(sg => sg.team_id === selectedTeamId).map(sg => (
                <TouchableOpacity key={sg.id} style={styles.targetOption} onPress={() => { setSelectedSubgroupId(sg.id); setTargetType('subgroup'); setShowTargetModal(false); }}>
                  <Text style={styles.targetOptionText}>{sg.name}</Text>
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
  section: { marginBottom: 20 },
  titleInput: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, paddingVertical: 8 },
  targetButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '15',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', gap: 8
  },
  targetButtonText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },

  exerciseCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 16, padding: 16, marginBottom: 20
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF' },
  exThumbnailPlaceholder: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  exTitleContainer: { flex: 1, marginLeft: 12 },
  exNameInput: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, padding: 8, backgroundColor: theme.colors.surfaceLight, borderRadius: 8 },
  exRemoveBtn: { padding: 8 },
  exNotes: { backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 16 },
  
  tableHeaderRow: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  tableCellLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  tableCellInput: { backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, padding: 8, borderRadius: 8, fontSize: 14, textAlign: 'center' },
  
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8, paddingVertical: 12, backgroundColor: theme.colors.surfaceLight, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border },
  addSetText: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },

  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: theme.colors.accent + '15', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.accent },
  addExerciseText: { color: theme.colors.accent, fontSize: 16, fontWeight: 'bold' },

  // Target Modal (Duplicated for speed)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  modalSubtitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  targetOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  targetOptionText: { fontSize: 16, color: theme.colors.text },
  modalCancel: { marginTop: 20, paddingVertical: 16, alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 12 },
  modalCancelText: { color: theme.colors.text, fontWeight: 'bold' }
});
