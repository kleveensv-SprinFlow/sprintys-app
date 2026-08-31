import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';

interface HybridWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

type TargetType = 'team' | 'subgroup' | 'athlete';
type BlockMode = 'structured' | 'free';
type DistanceUnit = 'm' | 'sec' | 'min' | 'km';

interface CourseEffort {
  id: string;
  sets: string;
  reps: string;
  distance: string;
  unit: DistanceUnit;
  target: string;
  rest_rep: string;
  rest_set: string;
}

interface CourseBlock {
  id: string;
  name: string;
  mode: BlockMode;
  free_text: string;
  efforts: CourseEffort[];
}

export const HybridWorkoutBuilder: React.FC<HybridWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || 'Séance Course');
  const [intensity, setIntensity] = useState<number>(3);
  
  const [targetType, setTargetType] = useState<TargetType>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams.length > 0 ? teams[0].id : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const getNextBlockName = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextIndex = blocks.length % 26;
    return `Bloc ${alphabet[nextIndex]}`;
  };

  const handleAddBlock = () => {
    const newBlock: CourseBlock = {
      id: Math.random().toString(36).substring(2, 9),
      name: getNextBlockName(),
      mode: 'structured',
      free_text: '',
      efforts: [
        { id: Math.random().toString(36).substring(2, 9), sets: '1', reps: '1', distance: '', unit: 'm', target: '', rest_rep: '', rest_set: '' }
      ]
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleAddEffortToBlock = (blockId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        const lastEffort = b.efforts[b.efforts.length - 1];
        const newEffort: CourseEffort = lastEffort 
          ? { ...lastEffort, id: Math.random().toString(36).substring(2, 9) }
          : { id: Math.random().toString(36).substring(2, 9), sets: '1', reps: '1', distance: '', unit: 'm', target: '', rest_rep: '', rest_set: '' };
        return { ...b, efforts: [...b.efforts, newEffort] };
      }
      return b;
    }));
  };

  const removeEffort = (blockId: string, effortId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, efforts: b.efforts.filter(e => e.id !== effortId) };
      }
      return b;
    }));
  };

  const cycleDistanceUnit = (unit: DistanceUnit): DistanceUnit => {
    const units: DistanceUnit[] = ['m', 'sec', 'min', 'km'];
    const idx = units.indexOf(unit);
    return units[(idx + 1) % units.length];
  };

  const updateBlock = (blockId: string, field: keyof CourseBlock, value: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b));
  };

  const updateEffort = (blockId: string, effortId: string, field: keyof CourseEffort, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          efforts: b.efforts.map(e => e.id === effortId ? { ...e, [field]: value } : e)
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
        blocks, // JSONB mapping for the running blocks
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

  const handleSaveAsTemplate = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre avant de sauvegarder comme modèle.');
      return;
    }
    Alert.alert(
      'Nouveau modèle',
      `Voulez-vous sauvegarder "${title}" dans votre bibliothèque ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Sauvegarder', 
          onPress: async () => {
            try {
              const { error } = await supabase.from('workout_templates').insert([{
                coach_id: user.id,
                name: title.trim(),
                description: null,
                type_seance: 'course',
                blocks,
              }]);
              if (error) throw error;
              Alert.alert('Succès', 'Modèle enregistré dans votre bibliothèque !');
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            }
          }
        }
      ]
    );
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Séance Course</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: isSaving ? theme.colors.surfaceLight : theme.colors.accent }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Text style={styles.saveButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* TITRE ET SAUVEGARDE MODELE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <TextInput
            style={[styles.titleInput, { flex: 1, marginBottom: 0 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre de la séance"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity onPress={handleSaveAsTemplate} style={{ padding: 8, backgroundColor: theme.colors.surfaceLight, borderRadius: 8, marginLeft: 12 }}>
            <Feather name="bookmark" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

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
          <Text style={styles.sectionLabel}>Programme</Text>
          
          {blocks.map((block) => (
            <View key={block.id} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <TextInput
                  style={styles.blockTitleInput}
                  value={block.name}
                  onChangeText={(t) => updateBlock(block.id, 'name', t)}
                  placeholder="Nom du bloc"
                  placeholderTextColor={theme.colors.textMuted}
                />
                
                <View style={styles.blockActions}>
                  {/* Toggle Mode */}
                  <TouchableOpacity 
                    style={styles.modeToggleBtn}
                    onPress={() => updateBlock(block.id, 'mode', block.mode === 'structured' ? 'free' : 'structured')}
                  >
                    <Feather name={block.mode === 'structured' ? 'list' : 'align-left'} size={16} color={theme.colors.accent} />
                    <Text style={styles.modeToggleText}>{block.mode === 'structured' ? 'Piste' : 'Terrain'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => removeBlock(block.id)} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {block.mode === 'free' ? (
                <View style={styles.freeModeContainer}>
                  <TextInput
                    style={styles.freeModeInput}
                    multiline
                    value={block.free_text}
                    onChangeText={(t) => updateBlock(block.id, 'free_text', t)}
                    placeholder="Ex: 30 minutes de footing sur pelouse au feeling, puis gammes athlétiques..."
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.freeModeHelper}>
                    Aucune case de chrono ne sera générée pour les athlètes sur ce bloc.
                  </Text>
                </View>
              ) : (
                <View style={styles.structuredModeContainer}>
                  {block.efforts.map((effort, eIdx) => (
                    <View key={effort.id} style={styles.effortCard}>
                      <View style={styles.effortHeader}>
                        <Text style={styles.effortTitle}>Groupe d'effort {eIdx + 1}</Text>
                        <TouchableOpacity onPress={() => removeEffort(block.id, effort.id)}>
                          <Feather name="x" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      {/* Multiplier Row: Séries x Reps */}
                      <View style={styles.multiplierContainer}>
                        <View style={styles.multiplierBox}>
                          <Text style={styles.multiplierLabel}>SÉRIES</Text>
                          <TextInput 
                            style={styles.multiplierInput} 
                            value={effort.sets} 
                            onChangeText={t => updateEffort(block.id, effort.id, 'sets', t)}
                            keyboardType="numeric"
                          />
                        </View>
                        <Text style={styles.multiplierX}>×</Text>
                        <View style={styles.multiplierBox}>
                          <Text style={styles.multiplierLabel}>RÉPÉTITIONS</Text>
                          <TextInput 
                            style={styles.multiplierInput} 
                            value={effort.reps} 
                            onChangeText={t => updateEffort(block.id, effort.id, 'reps', t)}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      {/* Distance & Cible */}
                      <View style={styles.twoColRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputGroupLabel}>Distance / Temps</Text>
                          <View style={styles.smartInputContainer}>
                            <TextInput 
                              style={styles.smartInput} 
                              value={effort.distance}
                              onChangeText={t => updateEffort(block.id, effort.id, 'distance', t)}
                              placeholder="Ex: 60"
                              placeholderTextColor={theme.colors.textMuted}
                              keyboardType="numeric"
                            />
                            <TouchableOpacity 
                              style={styles.smartUnitBtn} 
                              onPress={() => updateEffort(block.id, effort.id, 'unit', cycleDistanceUnit(effort.unit))}
                            >
                              <Text style={styles.smartUnitText}>{effort.unit}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputGroupLabel}>Cible / Intensité</Text>
                          <TextInput 
                            style={styles.standardInput} 
                            value={effort.target}
                            onChangeText={t => updateEffort(block.id, effort.id, 'target', t)}
                            placeholder="Ex: 95% ou 7.2s"
                            placeholderTextColor={theme.colors.textMuted}
                          />
                        </View>
                      </View>

                      {/* Repos */}
                      <View style={styles.twoColRow}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputGroupLabel}>Repos (Entre reps)</Text>
                          <TextInput 
                            style={styles.standardInput} 
                            value={effort.rest_rep}
                            onChangeText={t => updateEffort(block.id, effort.id, 'rest_rep', t)}
                            placeholder="Ex: 2:00"
                            placeholderTextColor={theme.colors.textMuted}
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputGroupLabel}>Repos (Entre séries)</Text>
                          <TextInput 
                            style={styles.standardInput} 
                            value={effort.rest_set}
                            onChangeText={t => updateEffort(block.id, effort.id, 'rest_set', t)}
                            placeholder="Ex: 5:00"
                            placeholderTextColor={theme.colors.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addEffortBtn} onPress={() => handleAddEffortToBlock(block.id)}>
                    <Text style={styles.addEffortText}>+ Ajouter un effort</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          
          <TouchableOpacity style={styles.addBlockBtn} onPress={handleAddBlock}>
            <Text style={styles.addBlockText}>+ Ajouter un Bloc</Text>
          </TouchableOpacity>
        </View>

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
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modeToggleText: { color: theme.colors.accent, fontSize: 13, fontWeight: 'bold' },

  addBlockBtn: { 
    padding: 16, backgroundColor: theme.colors.surface, borderRadius: 16, 
    borderWidth: 2, borderColor: theme.colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center'
  },
  addBlockText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 15 },

  // Free Mode
  freeModeContainer: { marginTop: 8 },
  freeModeInput: {
    backgroundColor: theme.colors.surfaceLight, color: theme.colors.text,
    padding: 16, borderRadius: 16, minHeight: 120, fontSize: 15, lineHeight: 22, textAlignVertical: 'top'
  },
  freeModeHelper: { color: theme.colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic', paddingHorizontal: 4 },

  // Structured Mode (Efforts)
  structuredModeContainer: { marginTop: 8 },
  effortCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 16, padding: 16, marginBottom: 12
  },
  effortHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  effortTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  
  multiplierContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 16 },
  multiplierBox: { alignItems: 'center', flex: 1 },
  multiplierLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 6 },
  multiplierInput: { 
    backgroundColor: theme.colors.surfaceLight, color: theme.colors.text,
    fontSize: 24, fontWeight: '800', textAlign: 'center',
    width: '100%', paddingVertical: 12, borderRadius: 12
  },
  multiplierX: { fontSize: 24, fontWeight: '800', color: theme.colors.textSecondary, marginTop: 16 },

  twoColRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputGroupLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, paddingLeft: 4 },
  standardInput: { backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, padding: 12, borderRadius: 12, fontSize: 15, fontWeight: '500' },
  
  smartInputContainer: { flexDirection: 'row', flex: 1 },
  smartInput: { 
    flex: 1, backgroundColor: theme.colors.surfaceLight, color: theme.colors.text, 
    padding: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, fontSize: 15, fontWeight: '500'
  },
  smartUnitBtn: { 
    backgroundColor: theme.colors.text, paddingHorizontal: 12, 
    borderTopRightRadius: 12, borderBottomRightRadius: 12, justifyContent: 'center', alignItems: 'center'
  },
  smartUnitText: { color: theme.colors.surface, fontSize: 12, fontWeight: 'bold' },

  addEffortBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 20 },
  addEffortText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Target Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  modalSubtitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  targetOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  targetOptionText: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  modalCancel: { marginTop: 24, paddingVertical: 16, alignItems: 'center', backgroundColor: theme.colors.surfaceLight, borderRadius: 16 },
  modalCancelText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 }
});
