import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { fetchOpenAIResponse } from '../../../services/aiService';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';

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
  
  // UI Blocks State
  const [blocks, setBlocks] = useState<UIBlock[]>([]);
  
  // Search & Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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

  // Real-time search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('exercises_catalog')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);
      setSearchResults(data || []);
      setIsSearching(false);
    };
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addExercise = (catalogItem: any) => {
    const newEx: UIExercise = {
      id: Math.random().toString(36).substring(2, 9),
      catalog_id: catalogItem.id,
      name: catalogItem.name,
      reps: '10',
      weight: '',
      isPDC: false
    };

    const newBlock: UIBlock = {
      id: Math.random().toString(36).substring(2, 9),
      sets: '4',
      rest: '1m30',
      exercises: [newEx]
    };

    setBlocks([...blocks, newBlock]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const linkToPrevious = (blockIndex: number) => {
    if (blockIndex === 0) return;
    const newBlocks = [...blocks];
    const currentBlock = newBlocks[blockIndex];
    const prevBlock = newBlocks[blockIndex - 1];
    
    // Merge exercises into previous block
    prevBlock.exercises = [...prevBlock.exercises, ...currentBlock.exercises];
    
    // Remove the current block
    newBlocks.splice(blockIndex, 1);
    setBlocks(newBlocks);
  };

  const unlinkExercise = (blockIndex: number, exerciseIndex: number) => {
    if (exerciseIndex === 0) return;
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    
    // Extract the exercise
    const exToUnlink = block.exercises[exerciseIndex];
    block.exercises.splice(exerciseIndex, 1);
    
    // Create new block right after
    const newBlock: UIBlock = {
      id: Math.random().toString(36).substring(2, 9),
      sets: block.sets,
      rest: block.rest,
      exercises: [exToUnlink]
    };
    
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const removeExercise = (blockIndex: number, exerciseIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercises.splice(exerciseIndex, 1);
    if (newBlocks[blockIndex].exercises.length === 0) {
      newBlocks.splice(blockIndex, 1); // Remove block if empty
    }
    setBlocks(newBlocks);
  };

  const updateExercise = (blockIndex: number, exerciseIndex: number, field: keyof UIExercise, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].exercises[exerciseIndex] = { ...newBlocks[blockIndex].exercises[exerciseIndex], [field]: value };
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

  const handleSave = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour la séance.');
      return;
    }

    setIsSaving(true);
    try {
      // Map UIBlocks to DB format
      const dbBlocks = blocks.map((b, index) => {
        return {
          id: b.id,
          name: `Bloc ${index + 1}`,
          rest_after_block: b.rest,
          exercises: b.exercises.map(ex => {
            const setsCount = parseInt(b.sets) || 1;
            const setsArray = Array.from({length: setsCount}).map((_, i) => ({
              id: Math.random().toString(36).substring(2, 9),
              reps: ex.reps,
              targetWeight: ex.isPDC ? '0' : ex.weight,
              weightUnit: ex.isPDC ? 'PDC' : 'kg',
              rest: i === setsCount - 1 ? (b.rest.replace('min', 'm').replace('sec', 's')) : '0'
            }));
            
            return {
              id: Math.random().toString(36).substring(2, 9),
              name: ex.name,
              catalog_id: ex.catalog_id,
              sets: setsArray,
              notes: ''
            };
          })
        };
      });

      const { error } = await supabase.from('workouts').insert([{
        coach_id: user.id,
        team_id: targetType === 'team' ? selectedTeamId : null,
        subgroup_id: targetType === 'subgroup' ? selectedSubgroupId : null,
        athlete_id: targetType === 'athlete' ? selectedAthleteId : null,
        date_prevue: date.toISOString(),
        type_seance: `${workoutType} - ${title.trim()}`,
        intensity: 5,
        blocks: dbBlocks,
        status: 'planned'
      }]);

      if (error) throw error;
      onSave();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  
  const handleAI = () => {
    setShowAIModal(true);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAILoading(true);
    
    const systemPrompt = `Tu es un générateur de séances de musculation.
Tu dois transformer la description en un tableau JSON STRICT de blocs.
IMPORTANT: Ne renvoie AUCUN texte autour, JUSTE le tableau JSON brut (pas de balises markdown).

Format attendu:
[
  {
    "sets": "4",
    "rest": "1m30",
    "exercises": [
      {
        "name": "Squat",
        "reps": "10",
        "weight": "80",
        "isPDC": false
      }
    ]
  }
]

Règles:
- Si l'utilisateur mentionne un superset (ex: "Squat puis Fentes"), mets les deux exercices dans le tableau "exercises" du MEME bloc.
- Si poids du corps, mets "isPDC": true et "weight": "".
- "rest" doit être court (ex: "30s", "1 min", "2 min").`;

    try {
      const result = await fetchOpenAIResponse(
        [{ role: 'user', content: aiPrompt }],
        systemPrompt,
        'gpt-4o-mini'
      );
      
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/```/g, '').trim();
      }

      const generatedBlocks = JSON.parse(cleanResult);
      
      // Inject IDs and map properly
      const newBlocks = generatedBlocks.map((b: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        sets: b.sets || '1',
        rest: b.rest || '1m30',
        exercises: (b.exercises || []).map((ex: any) => ({
          id: Math.random().toString(36).substring(2, 9),
          catalog_id: 'ai-generated',
          name: ex.name || 'Exercice',
          reps: ex.reps || '10',
          weight: ex.weight || '',
          isPDC: !!ex.isPDC
        }))
      }));

      setBlocks(prev => [...prev, ...newBlocks]);
      setShowAIModal(false);
      setAiPrompt('');
    } catch (error) {
      Alert.alert("Erreur IA", "L'IA n'a pas pu générer la séance. Essayez de reformuler.");
      console.error(error);
    } finally {
      setIsAILoading(false);
    }
  };


  // Target Display
  const currentTeamAthletes = teamMembers.filter(tm => tm.team_id === selectedTeamId);
  let targetDisplay = 'Sélectionner...';
  if (targetType === 'team' && selectedTeamId) targetDisplay = teams.find(t => t.id === selectedTeamId)?.name || targetDisplay;
  else if (targetType === 'athlete' && selectedAthleteId) targetDisplay = currentTeamAthletes.find(a => a.user_id === selectedAthleteId)?.profile?.full_name || targetDisplay;

  return (
    <View style={styles.container}>
      {/* HEADER */}
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

      {/* TOP CONTROLS */}
      <View style={styles.topControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ajouter un exercice..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.aiButton} onPress={handleAI}>
            <Feather name="message-square" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.libButton} onPress={() => Alert.alert('Bibliothèque', 'Arrive bientôt dans cette vue !')}>
            <Feather name="book-open" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* SEARCH RESULTS DROPDOWN */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map(res => (
              <TouchableOpacity key={res.id} style={styles.searchResultItem} onPress={() => addExercise(res)}>
                <Text style={styles.searchResultText}>{res.name}</Text>
                <Feather name="plus" size={20} color={theme.colors.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* WORKOUT TYPES */}
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
        
        {/* TIMELINE VIEW */}
        <View style={styles.timelineContainer}>
          {blocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="list" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>Recherchez un exercice ou utilisez l'IA pour commencer votre séquence.</Text>
            </View>
          ) : (
            blocks.map((block, blockIdx) => (
              <View key={block.id} style={styles.timelineBlock}>
                
                {/* Timeline vertical line */}
                <View style={styles.timelineLine} />

                {/* Link to previous button (if not first block) */}
                {blockIdx > 0 && (
                  <TouchableOpacity style={styles.linkToPrevBtn} onPress={() => linkToPrevious(blockIdx)}>
                    <Feather name="link" size={12} color={theme.colors.accent} />
                    <Text style={styles.linkToPrevText}>Lier au précédent (Superset)</Text>
                  </TouchableOpacity>
                )}

                {/* Exercises inside Block (Superset handling) */}
                {block.exercises.map((ex, exIdx) => (
                  <View key={ex.id} style={styles.exerciseCardWrapper}>
                    {/* The Node */}
                    <View style={styles.timelineNode}>
                      <Text style={styles.nodeText}>{exIdx === 0 ? blockIdx + 1 : `${blockIdx + 1}${String.fromCharCode(65 + exIdx)}`}</Text>
                    </View>

                    {/* The Card */}
                    <View style={styles.exerciseCard}>
                      <View style={styles.exCardHeader}>
                        <Text style={styles.exCardTitle}>{ex.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {exIdx > 0 && (
                            <TouchableOpacity onPress={() => unlinkExercise(blockIdx, exIdx)} style={{ padding: 4 }}>
                              <Feather name="link-2" size={16} color={theme.colors.accent} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => removeExercise(blockIdx, exIdx)} style={{ padding: 4 }}>
                            <Feather name="x" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Inputs Grid */}
                      <View style={styles.inputsGrid}>
                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Reps</Text>
                          <TextInput 
                            style={styles.gridInput} 
                            value={ex.reps} 
                            onChangeText={(t) => updateExercise(blockIdx, exIdx, 'reps', t)}
                          />
                        </View>
                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Charge (kg)</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TextInput 
                              style={[styles.gridInput, ex.isPDC && { backgroundColor: theme.colors.surfaceLight, color: theme.colors.textMuted }]} 
                              value={ex.isPDC ? 'PDC' : ex.weight} 
                              onChangeText={(t) => updateExercise(blockIdx, exIdx, 'weight', t)}
                              editable={!ex.isPDC}
                              keyboardType="numeric"
                            />
                            <TouchableOpacity 
                              style={[styles.pdcToggle, ex.isPDC && styles.pdcToggleActive]} 
                              onPress={() => updateExercise(blockIdx, exIdx, 'isPDC', !ex.isPDC)}
                            >
                              <Text style={[styles.pdcText, ex.isPDC && styles.pdcTextActive]}>PDC</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Block Settings (Sets & Rest) at the bottom of the group */}
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
                    <Text style={styles.blockSettingLabel}>Repos (Fin de bloc)</Text>
                    <TextInput 
                      style={styles.restInput} 
                      value={block.rest} 
                      onChangeText={(t) => updateBlock(blockIdx, 'rest', t)}
                    />
                  </View>

                  {/* Preset Rest Buttons */}
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
              Décrivez votre séance en langage naturel. Sprinty va la construire pour vous.
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: 16
              }}
              multiline
              placeholder="Ex: 4 séries de squat 80kg avec 2min repos puis 3 séries de fentes..."
              placeholderTextColor={theme.colors.textMuted}
              value={aiPrompt}
              onChangeText={setAiPrompt}
            />
            <TouchableOpacity 
              style={{
                backgroundColor: '#8B5CF6',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8
              }}
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
                  <Text style={styles.reorderItemText}>{idx + 1}. {b.exercises.map(ex => ex.name).join(' + ')}</Text>
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
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, color: theme.colors.text },
  aiButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  libButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  
  searchResults: { position: 'absolute', top: 65, left: 16, right: 16, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, zIndex: 20 },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  searchResultText: { color: theme.colors.text, fontSize: 16 },
  
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
  exCardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  
  inputsGrid: { flexDirection: 'row', gap: 16 },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 6, textTransform: 'uppercase', fontWeight: 'bold' },
  gridInput: { backgroundColor: theme.colors.background, borderRadius: 8, padding: 10, color: theme.colors.text, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: theme.colors.border, flex: 1 },
  pdcToggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.surfaceLight },
  pdcToggleActive: { backgroundColor: theme.colors.accent },
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
