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
  id: string; // our internal id
  db_exercise_id: string; // from exercise_library
  name_fr: string;
  name_en: string;
  image: string;
  sets: ExerciseSet[];
  notes: string;
}

export const StrengthWorkoutBuilder: React.FC<StrengthWorkoutBuilderProps> = ({ date, onClose, onSave }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState('');
  const [intensity, setIntensity] = useState<number>(3);
  
  const [targetType, setTargetType] = useState<TargetType>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Search Library Modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (showLibraryModal) {
      searchExercises(searchQuery);
    }
  }, [searchQuery, showLibraryModal]);

  const searchExercises = async (query: string) => {
    setIsSearching(true);
    try {
      let q = supabase.from('exercise_library').select('id, name_fr, name_en, images').limit(20);
      if (query.trim().length > 0) {
        q = q.or(`name_fr.ilike.%${query}%,name_en.ilike.%${query}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setLibraryResults(data || []);
    } catch (err) {
      console.warn("Erreur recherche exos:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddExerciseFromLibrary = (libEx: any) => {
    const newEx: StrengthExercise = {
      id: Math.random().toString(36).substring(2, 9),
      db_exercise_id: libEx.id,
      name_fr: libEx.name_fr || libEx.name_en,
      name_en: libEx.name_en,
      image: (libEx.images && libEx.images.length > 0) ? libEx.images[0] : '',
      notes: '',
      sets: [
        { id: Math.random().toString(36).substring(2, 9), reps: '8', targetWeight: '70%', rest: '2:00', tempo: '2010' }
      ]
    };
    setExercises([...exercises, newEx]);
    setShowLibraryModal(false);
    setSearchQuery('');
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
              {ex.image ? (
                <Image source={{ uri: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' + ex.image }} style={styles.exThumbnail} />
              ) : (
                <View style={styles.exThumbnailPlaceholder}>
                  <Feather name="image" size={20} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.exTitleContainer}>
                <Text style={styles.exNameFr}>{ex.name_fr}</Text>
                {ex.name_en !== ex.name_fr && <Text style={styles.exNameEn}>{ex.name_en}</Text>}
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

        <View style={{ height: 100 }} />
      </ScrollView>

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
              <Text style={styles.modalSubtitle}>Sous-groupes</Text>
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

      {/* MODAL RECHERCHE BIBLIOTHÈQUE */}
      <Modal visible={showLibraryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.libContainer}>
          <View style={styles.libHeader}>
            <TouchableOpacity onPress={() => setShowLibraryModal(false)} style={styles.iconButton}>
              <Feather name="chevron-down" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bibliothèque d'Exercices</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher (ex: Squat, Développé...)"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {isSearching ? (
              <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
            ) : libraryResults.length === 0 ? (
              <Text style={styles.emptyText}>Aucun exercice trouvé.</Text>
            ) : (
              libraryResults.map(res => (
                <TouchableOpacity key={res.id} style={styles.libResultCard} onPress={() => handleAddExerciseFromLibrary(res)}>
                  {res.images && res.images.length > 0 ? (
                    <Image source={{ uri: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' + res.images[0] }} style={styles.libResultImg} />
                  ) : (
                    <View style={styles.exThumbnailPlaceholder} />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.libResultNameFr}>{res.name_fr || res.name_en}</Text>
                    {res.name_en !== res.name_fr && <Text style={styles.libResultNameEn}>{res.name_en}</Text>}
                  </View>
                  <Feather name="plus-circle" size={24} color={theme.colors.accent} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
  exNameFr: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  exNameEn: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
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

  // Library Modal
  libContainer: { flex: 1, backgroundColor: theme.colors.background },
  libHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 24, paddingHorizontal: 16, borderRadius: 12, height: 50, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 16, marginLeft: 12 },
  libResultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  libResultImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#FFF' },
  libResultNameFr: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  libResultNameEn: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 16 },

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
