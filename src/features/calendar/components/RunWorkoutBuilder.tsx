import { workoutService } from '../../../services/workoutService';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { fetchOpenAIResponse } from '../../../services/aiService';

interface RunWorkoutBuilderProps {
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
}

interface UIEffort {
  id: string;
  name: string; 
  volume: string; 
  isDistance: boolean;
  intensity: string;
  rest_rep: string;
}

interface UIBlock {
  id: string;
  sets: string;
  rest: string;
  efforts: UIEffort[];
}

const REST_PRESETS = ['30s', '1 min', '1m30', '2 min', '3 min'];
const WORKOUT_TYPES = ['Piste', 'Lactique', 'Aérobie', 'VMA', 'Sprint', 'Footing', 'Fartlek', 'Renforcement'];

export const RunWorkoutBuilder: React.FC<RunWorkoutBuilderProps> = ({ date, onClose, onSave, defaultTitle }) => {
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  const [title, setTitle] = useState(defaultTitle || '');
  const [workoutType, setWorkoutType] = useState('Piste');
  
  // UI Blocks State
  const [blocks, setBlocks] = useState<UIBlock[]>([]);
  
  // Modals
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  
  // Targeting
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const screenHeight = Dimensions.get('window').height;

  const addEffort = (isNote: boolean = false) => {
    const newEffort: UIEffort = {
      id: Math.random().toString(36).substring(2, 9),
      name: isNote ? 'Échauffement / Note' : 'Effort',
      volume: '400',
      isDistance: true,
      intensity: '',
      rest_rep: '1min'
    };

    const newBlock: UIBlock = {
      id: Math.random().toString(36).substring(2, 9),
      sets: '1',
      rest: '2min',
      efforts: [newEffort]
    };

    setBlocks([...blocks, newBlock]);
  };

  const linkToPrevious = (blockIndex: number) => {
    if (blockIndex === 0) return;
    const newBlocks = [...blocks];
    const currentBlock = newBlocks[blockIndex];
    const prevBlock = newBlocks[blockIndex - 1];
    
    prevBlock.efforts = [...prevBlock.efforts, ...currentBlock.efforts];
    
    newBlocks.splice(blockIndex, 1);
    setBlocks(newBlocks);
  };

  const unlinkEffort = (blockIndex: number, effortIndex: number) => {
    if (effortIndex === 0) return;
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    
    const efToUnlink = block.efforts[effortIndex];
    block.efforts.splice(effortIndex, 1);
    
    const newBlock: UIBlock = {
      id: Math.random().toString(36).substring(2, 9),
      sets: block.sets,
      rest: block.rest,
      efforts: [efToUnlink]
    };
    
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const removeEffort = (blockIndex: number, effortIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].efforts.splice(effortIndex, 1);
    if (newBlocks[blockIndex].efforts.length === 0) {
      newBlocks.splice(blockIndex, 1);
    }
    setBlocks(newBlocks);
  };

  const updateEffort = (blockIndex: number, effortIndex: number, field: keyof UIEffort, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].efforts[effortIndex] = { ...newBlocks[blockIndex].efforts[effortIndex], [field]: value };
    setBlocks(newBlocks);
  };

  const updateBlock = (blockIndex: number, field: keyof UIBlock, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: value };
    setBlocks(newBlocks);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
    }
    setBlocks(newBlocks);
  };

  const handleAI = () => {
    setShowAIModal(true);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAILoading(true);
    
    const systemPrompt = `Tu es un générateur de séances de course à pied.
Tu dois transformer la description en un tableau JSON STRICT de blocs.
IMPORTANT: Ne renvoie AUCUN texte autour, JUSTE le tableau JSON brut (pas de balises markdown).

Format attendu:
[
  {
    "sets": "3",
    "rest": "3m",
    "efforts": [
      {
        "name": "Sprint court",
        "volume": "100",
        "isDistance": true,
        "intensity": "100% VMA",
        "rest_rep": "1m"
      }
    ]
  }
]`;

    try {
      const result = await fetchOpenAIResponse(
        [{ role: 'user', content: aiPrompt }],
        systemPrompt,
        'gpt-4o-mini'
      );
      
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) cleanResult = cleanResult.replace(/```json/g, '').replace(/```/g, '').trim();
      else if (cleanResult.startsWith('```')) cleanResult = cleanResult.replace(/```/g, '').trim();

      const generatedBlocks = JSON.parse(cleanResult);
      
      const newBlocks = generatedBlocks.map((b: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        sets: b.sets || '1',
        rest: b.rest || '1m30',
        efforts: (b.efforts || []).map((ex: any) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: ex.name || 'Effort',
          volume: ex.volume || '400',
          isDistance: !!ex.isDistance,
          intensity: ex.intensity || '',
          rest_rep: ex.rest_rep || '1m'
        }))
      }));

      setBlocks(prev => [...prev, ...newBlocks]);
      setShowAIModal(false);
      setAiPrompt('');
    } catch (error) {
      Alert.alert("Erreur IA", "L'IA n'a pas pu générer la séance.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour la séance.');
      return;
    }

    setIsSaving(true);
    try {
      const dbBlocks = blocks.map((b, index) => {
        return {
          id: b.id,
          name: `Bloc ${index + 1}`,
          rest_after_block: b.rest,
          exercises: b.efforts.map(ef => {
            const setsCount = parseInt(b.sets) || 1;
            const setsArray = Array.from({length: setsCount}).map((_, i) => ({
              id: Math.random().toString(36).substring(2, 9),
              distance: ef.isDistance ? parseFloat(ef.volume) || undefined : undefined,
              duration: !ef.isDistance ? ef.volume : undefined,
              rest: i === setsCount - 1 ? (b.rest.replace('min', 'm').replace('sec', 's')) : ef.rest_rep
            }));
            
            return {
              id: Math.random().toString(36).substring(2, 9),
              name: ef.name,
              catalog_id: 'run_effort',
              sets: setsArray,
              notes: ef.intensity
            };
          })
        };
      });

      const baseWorkoutData = {
        coach_id: user.id,
        date_prevue: date.toISOString(),
        type_seance: `${workoutType} - ${title.trim()}`,
        intensity: 5,
        blocks: dbBlocks,
        status: 'planned'
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
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={onClose}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.headerTitleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de la séance"
          placeholderTextColor={theme.colors.textMuted}
        />
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Valider</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.topControls}>
        <View style={styles.searchRow}>
          <TouchableOpacity style={[styles.targetButton, {flex: 1, justifyContent: 'center'}]} onPress={() => addEffort(false)}>
            <Feather name="plus" size={16} color={theme.colors.accent} />
            <Text style={styles.targetButtonText}>Ajouter Bloc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.targetButton, {flex: 1, justifyContent: 'center', backgroundColor: theme.colors.surfaceLight}]} onPress={() => addEffort(true)}>
            <Feather name="align-left" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.targetButtonText, {color: theme.colors.textSecondary}]}>Note Libre</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiButton} onPress={handleAI}>
            <Feather name="message-square" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroll}>
          {WORKOUT_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.typePill, workoutType === type && styles.typePillActive]}
              onPress={() => setWorkoutType(type)}
            >
              <Text style={[styles.typePillText, workoutType === type && styles.typePillTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.timelineContainer}>
          {blocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="list" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>Ajoutez un effort, une note d'échauffement ou utilisez l'IA.</Text>
            </View>
          ) : (
            blocks.map((block, blockIdx) => (
              <View key={block.id} style={styles.timelineBlock}>
                <View style={styles.timelineLine} />

                {blockIdx > 0 && (
                  <TouchableOpacity style={styles.linkToPrevBtn} onPress={() => linkToPrevious(blockIdx)}>
                    <Feather name="link" size={12} color={theme.colors.accent} />
                    <Text style={styles.linkToPrevText}>Lier au précédent (Série Combinée)</Text>
                  </TouchableOpacity>
                )}

                {block.efforts.map((ef, efIdx) => (
                  <View key={ef.id} style={styles.exerciseCardWrapper}>
                    <View style={styles.timelineNode}>
                      <Text style={styles.nodeText}>{efIdx === 0 ? blockIdx + 1 : `${blockIdx + 1}${String.fromCharCode(65 + efIdx)}`}</Text>
                    </View>

                    <View style={styles.exerciseCard}>
                      <View style={styles.exCardHeader}>
                        <TextInput 
                          style={styles.exCardTitleInput} 
                          value={ef.name} 
                          onChangeText={(t) => updateEffort(blockIdx, efIdx, 'name', t)} 
                          placeholder="Nom de l'effort (ex: 400m, Gammes...)" 
                          placeholderTextColor={theme.colors.textMuted}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {efIdx > 0 && (
                            <TouchableOpacity onPress={() => unlinkEffort(blockIdx, efIdx)} style={{ padding: 4 }}>
                              <Feather name="link-2" size={16} color={theme.colors.accent} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => removeEffort(blockIdx, efIdx)} style={{ padding: 4 }}>
                            <Feather name="x" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.inputsGrid}>
                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Volume</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TextInput 
                              style={styles.gridInput} 
                              value={ef.volume} 
                              onChangeText={(t) => updateEffort(blockIdx, efIdx, 'volume', t)}
                              keyboardType={ef.isDistance ? 'numeric' : 'default'}
                              placeholder={ef.isDistance ? "400" : "1:30"}
                            />
                            <TouchableOpacity 
                              style={[styles.pdcToggle, {backgroundColor: ef.isDistance ? theme.colors.accent : theme.colors.surfaceLight}]} 
                              onPress={() => updateEffort(blockIdx, efIdx, 'isDistance', true)}
                            >
                              <Text style={[styles.pdcText, ef.isDistance && {color: '#fff'}]}>m</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.pdcToggle, {backgroundColor: !ef.isDistance ? theme.colors.accent : theme.colors.surfaceLight}]} 
                              onPress={() => updateEffort(blockIdx, efIdx, 'isDistance', false)}
                            >
                              <Text style={[styles.pdcText, !ef.isDistance && {color: '#fff'}]}>⏱️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Intensité</Text>
                          <TextInput 
                            style={styles.gridInput} 
                            value={ef.intensity} 
                            onChangeText={(t) => updateEffort(blockIdx, efIdx, 'intensity', t)}
                            placeholder="ex: 90% VMA"
                          />
                        </View>

                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Repos (Rép)</Text>
                          <TextInput 
                            style={styles.gridInput} 
                            value={ef.rest_rep} 
                            onChangeText={(t) => updateEffort(blockIdx, efIdx, 'rest_rep', t)}
                            placeholder="1min"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.blockSettings}>
                  <View style={styles.blockSettingItem}>
                    <Text style={styles.blockSettingLabel}>Séries</Text>
                    <View style={styles.counter}>
                      <TouchableOpacity onPress={() => updateBlock(blockIdx, 'sets', Math.max(1, parseInt(block.sets || '1') - 1).toString())}>
                        <Feather name="minus-circle" size={24} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{block.sets}</Text>
                      <TouchableOpacity onPress={() => updateBlock(blockIdx, 'sets', (parseInt(block.sets || '1') + 1).toString())}>
                        <Feather name="plus-circle" size={24} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.blockSettingItem}>
                    <Text style={styles.blockSettingLabel}>Repos (Fin de bloc/série)</Text>
                    <TextInput 
                      style={styles.restInput} 
                      value={block.rest} 
                      onChangeText={(t) => updateBlock(blockIdx, 'rest', t)}
                    />
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {REST_PRESETS.map(preset => (
                      <TouchableOpacity 
                        key={preset} 
                        style={styles.restPreset} 
                        onPress={() => updateBlock(blockIdx, 'rest', preset)}
                      >
                        <Text style={styles.restPresetText}>{preset}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ))
          )}

          {blocks.length > 1 && (
            <TouchableOpacity style={styles.reorderBtn} onPress={() => setShowReorderModal(true)}>
              <Feather name="list" size={18} color={theme.colors.text} />
              <Text style={styles.reorderBtnText}>Réorganiser l'ordre</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* MODAL: AI GENERATOR */}
      <Modal visible={showAIModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Générateur IA</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <Feather name="x" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.textMuted, marginBottom: 16 }}>
              Décrivez votre séance de course. Sprinty va la construire pour vous.
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 16,
                borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border,
                minHeight: 100, textAlignVertical: 'top', marginBottom: 16
              }}
              multiline
              placeholder="Ex: Échauffement puis 3 blocs de (4x400m à 100% VMA)..."
              placeholderTextColor={theme.colors.textMuted}
              value={aiPrompt}
              onChangeText={setAiPrompt}
            />
            <TouchableOpacity 
              style={{ backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={handleGenerateAI}
              disabled={isAILoading}
            >
              {isAILoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="zap" size={20} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Générer les blocs</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: REORDER */}
      <Modal visible={showReorderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Réorganiser</Text>
              <TouchableOpacity onPress={() => setShowReorderModal(false)}>
                <Feather name="check" size={28} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {blocks.map((b, idx) => (
                <View key={b.id} style={styles.reorderItem}>
                  <Text style={styles.reorderItemText}>{idx + 1}. {b.efforts.map(ef => ef.name).join(' + ')}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => moveBlock(idx, 'up')} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }}>
                      <Feather name="arrow-up-circle" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveBlock(idx, 'down')} disabled={idx === blocks.length - 1} style={{ opacity: idx === blocks.length - 1 ? 0.3 : 1 }}>
                      <Feather name="arrow-down-circle" size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconButton: { padding: 4 },
  headerTitleInput: { flex: 1, marginHorizontal: 16, fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  saveButton: { backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
  
  topControls: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface, zIndex: 10 },
  searchRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  targetButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '15', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8 },
  targetButtonText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },
  aiButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  
  typeScroll: { paddingBottom: 4 },
  typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  typePillActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  typePillText: { color: theme.colors.textSecondary, fontWeight: '600' },
  typePillTextActive: { color: theme.colors.background, fontWeight: '600' },
  
  timelineContainer: { padding: 16, paddingLeft: 32 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 16, fontSize: 16, paddingHorizontal: 32 },
  
  timelineBlock: { marginBottom: 32, position: 'relative' },
  timelineLine: { position: 'absolute', left: -16, top: 20, bottom: -40, width: 2, backgroundColor: theme.colors.border },
  
  exerciseCardWrapper: { position: 'relative', marginBottom: 12 },
  timelineNode: { position: 'absolute', left: -26, top: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', zIndex: 2, borderWidth: 3, borderColor: theme.colors.background },
  nodeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  exerciseCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  exCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  exCardTitleInput: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1, padding: 0, backgroundColor: 'transparent' },
  
  inputsGrid: { flexDirection: 'row', gap: 16 },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 6, textTransform: 'uppercase', fontWeight: 'bold' },
  gridInput: { backgroundColor: theme.colors.background, borderRadius: 8, padding: 10, color: theme.colors.text, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: theme.colors.border, flex: 1 },
  pdcToggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  pdcText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary },
  pdcTextActive: { color: '#FFF' },
  
  blockSettings: { backgroundColor: theme.colors.surfaceLight, borderRadius: 12, padding: 16, marginTop: 4 },
  blockSettingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  blockSettingLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, width: 24, textAlign: 'center' },
  restInput: { backgroundColor: theme.colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, color: theme.colors.text, fontSize: 14, fontWeight: 'bold', minWidth: 80, textAlign: 'center' },
  restPreset: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  restPresetText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  
  linkToPrevBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'absolute', top: -24, left: 16, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.accent, zIndex: 3 },
  linkToPrevText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.accent },
  
  reorderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  reorderBtnText: { color: theme.colors.text, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  reorderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  reorderItemText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1 }
});
