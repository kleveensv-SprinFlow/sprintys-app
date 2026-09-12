import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform, StatusBar, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { WorkoutBlock, Exercise } from '../../workout/types';
import { useAuthStore } from '../../../store/authStore';
import { workoutService } from '../../../services/workoutService';
import { supabase } from '../../../services/supabase';
import { AthleteValueKeypadModal } from './AthleteValueKeypadModal';

interface WorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onDelete?: (workout: any) => void;
  onEdit?: (workout: any) => void;
}

// Determine the "category" of the session for athlete data entry
const getSessionCategory = (typeSeance: string): 'muscu' | 'course' | 'other' => {
  const t = (typeSeance || '').toLowerCase();
  if (t.includes('musculation')) return 'muscu';
  if (t.includes('course') || t.includes('sprint') || t.includes('piste') || t.includes('côte') || t.includes('cote')) return 'course';
  return 'other';
};

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  onClose,
  workout,
  onDelete,
  onEdit,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isCoach = user?.role === 'coach';

  // Athlete data entry state
  // For muscu: { "exerciseId_setIndex": { weight: "80", repsOk: true } }
  // For course: { "exerciseId_setIndex": { chrono: "12.34" } }
  const [setData, setSetData] = React.useState<Record<string, any>>({});
  const [athleteNotes, setAthleteNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isValidated, setIsValidated] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  // Active Keypad State for intelligent athlete data entry
  const [activeKeypad, setActiveKeypad] = React.useState<{
    exerciseId: string;
    setIndex: number;
    mode: 'sprint' | 'endurance' | 'weight';
    distance?: number;
    title: string;
    subtitle?: string;
    initialValue: string;
    initialRepsOk: boolean;
    flattenedIndex: number;
  } | null>(null);

  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  // Load existing athlete data when workout changes
  React.useEffect(() => {
    if (visible && workout && !isCoach && user) {
      loadExistingData();
    }
  }, [visible, workout?.id]);

  const loadExistingData = async () => {
    if (!workout?.id || !user?.id) return;
    setIsLoadingData(true);
    try {
      // Load athlete_efforts for this workout
      const { data: efforts } = await supabase
        .from('athlete_efforts')
        .select('*')
        .eq('workout_id', workout.id)
        .eq('athlete_id', user.id)
        .order('set_order', { ascending: true });

      if (efforts && efforts.length > 0) {
        const loaded: Record<string, any> = {};
        // Map efforts back to exercise/set keys
        const blocks = workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }];
        let globalIdx = 0;
        for (const block of blocks) {
          for (const exercise of (block.exercises || [])) {
            for (let si = 0; si < (exercise.sets || []).length; si++) {
              const effort = efforts.find((e: any) => e.set_order === globalIdx);
              if (effort) {
                const key = `${exercise.id}_${si}`;
                const extra = effort.actual_extra || {};
                loaded[key] = {
                  weight: extra.weight || (effort.actual_weight_kg != null ? String(effort.actual_weight_kg) : ''),
                  repsOk: extra.repsOk !== undefined ? extra.repsOk : true,
                  chrono: extra.chrono || '',
                };
              }
              globalIdx++;
            }
          }
        }
        setSetData(loaded);
      }

      // Load notes from measures
      if (workout.measures?.athlete_notes) {
        setAthleteNotes(workout.measures.athlete_notes);
      }

      // Check if already completed
      setIsValidated(workout.status === 'completed');
    } catch (e) {
      console.error('Error loading athlete data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!workout) return null;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Supprimer la séance',
      'Voulez-vous vraiment supprimer cette séance ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete?.(workout);
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.(workout);
  };

  const submitAthleteWorkout = async () => {
    if (!user || !workout.id) return;
    setIsSubmitting(true);
    try {
      const sessionCategory = getSessionCategory(workout.type_seance);
      const efforts: any[] = [];
      const blocks = workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }];
      
      let setOrderGlobal = 0;
      for (const block of blocks) {
        for (const exercise of (block.exercises || [])) {
          for (let i = 0; i < (exercise.sets || []).length; i++) {
            const key = `${exercise.id}_${i}`;
            const data = setData[key];
            
            const effort: any = {
              workout_id: workout.id,
              exercise_catalog_id: exercise.catalog_id || null,
              exercise_category: workout.type_seance,
              set_order: setOrderGlobal,
              actual_extra: {},
            };

            if (sessionCategory === 'muscu' && data) {
              effort.actual_weight_kg = data.weight ? parseFloat(data.weight) : null;
              effort.actual_extra = {
                weight: data.weight || '',
                repsOk: data.repsOk !== false,
              };
            } else if (sessionCategory === 'course' && data) {
              effort.actual_extra = {
                chrono: data.chrono || '',
              };
            }

            efforts.push(effort);
            setOrderGlobal++;
          }
        }
      }

      // Save efforts
      if (efforts.length > 0) {
        await workoutService.submitWorkoutResults(workout.id, efforts);
      }
      
      // Save notes
      const updatedMeasures = { ...(workout.measures || {}), athlete_notes: athleteNotes.trim() || null };
      await supabase.from('workouts').update({ measures: updatedMeasures }).eq('id', workout.id);
      
      // Mark as completed
      await workoutService.completeWorkout(workout.id);
      
      setIsValidated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isValidated ? 'Mis à jour ✓' : 'Bravo ! 🎉',
        isValidated ? 'Tes données ont été mises à jour.' : 'Ta séance a été validée avec succès.'
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de valider la séance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derive blocks if not provided natively
  const blocks: WorkoutBlock[] = workout.blocks || [
    {
      id: 'main',
      name: 'Entraînement Principal',
      exercises: workout.exercises || [],
    }
  ];

  const sessionTitle = workout.type_seance || workout.name || 'Séance';
  const isRestDay = sessionTitle.toLowerCase().includes('repos');
  const isTechnical = sessionTitle.toLowerCase().includes('technique');
  const technicalNotes = workout.measures?.technical_notes;
  const sessionCategory = getSessionCategory(sessionTitle);
  const needsDataEntry = !isCoach && (sessionCategory === 'muscu' || sessionCategory === 'course');

  const surfaceMeta = workout.measures?.surface || 
    (workout.description?.includes('Côte') ? 'cote' : workout.description?.includes('Piste') ? 'piste' : null);
  const equipmentMeta = workout.measures?.equipment ||
    (workout.description?.includes('Pointes') ? 'pointes' : workout.description?.includes('Baskets') ? 'baskets' : null);

  const cleanDescription = workout.description
    ? (isTechnical ? workout.description.trim() : workout.description.replace(/^\[.*?\]\s*/, '').trim())
    : '';

  // Helper: update a specific set's data
  const updateSetField = (key: string, field: string, value: any) => {
    setSetData(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value }
    }));
  };

  // Flattened sets array for seamless sequential keypad navigation
  const allSets = React.useMemo(() => {
    const list: Array<{
      exercise: Exercise;
      set: any;
      setIndex: number;
      blockIndex: number;
      distance?: number;
      mode: 'sprint' | 'endurance' | 'weight';
    }> = [];

    const bList = workout?.blocks || [{ id: 'main', exercises: workout?.exercises || [] }];
    bList.forEach((b: any, bIdx: number) => {
      (b.exercises || []).forEach((ex: any) => {
        (ex.sets || []).forEach((st: any, sIdx: number) => {
          let setMode: 'sprint' | 'endurance' | 'weight' = 'sprint';
          if (sessionCategory === 'muscu') {
            setMode = 'weight';
          } else {
            const dist = st.distance;
            if (dist && dist >= 800) {
              setMode = 'endurance';
            } else if (dist && dist < 800) {
              setMode = 'sprint';
            } else {
              const str = `${ex.name || ''} ${workout?.type_seance || ''}`.toLowerCase();
              setMode = (str.includes('800') || str.includes('1000') || str.includes('1500') || str.includes('3000') || str.includes('5000') || str.includes('fond')) ? 'endurance' : 'sprint';
            }
          }

          list.push({
            exercise: ex,
            set: st,
            setIndex: sIdx,
            blockIndex: bIdx,
            distance: st.distance,
            mode: setMode,
          });
        });
      });
    });

    return list;
  }, [workout, sessionCategory]);

  const openKeypadAtIndex = (flatIndex: number) => {
    if (flatIndex < 0 || flatIndex >= allSets.length) {
      setActiveKeypad(null);
      return;
    }
    const item = allSets[flatIndex];
    const key = `${item.exercise.id}_${item.setIndex}`;
    const curData = setData[key] || {};
    const currentVal = item.mode === 'weight' ? (curData.weight || '') : (curData.chrono || '');
    const currentRepsOk = curData.repsOk !== undefined ? curData.repsOk : true;

    const distText = item.distance ? `${item.distance}m` : '';
    const setLabel = `Série ${item.setIndex + 1}/${(item.exercise.sets || []).length}`;
    const title = `${setLabel}${distText ? ` · ${distText}` : ''}`;
    const subtitle = item.exercise.name;

    setActiveKeypad({
      exerciseId: item.exercise.id,
      setIndex: item.setIndex,
      mode: item.mode,
      distance: item.distance,
      title,
      subtitle,
      initialValue: currentVal,
      initialRepsOk: currentRepsOk,
      flattenedIndex: flatIndex,
    });
  };

  const handleKeypadSave = (value: string, repsOk?: boolean) => {
    if (!activeKeypad) return;
    const key = `${activeKeypad.exerciseId}_${activeKeypad.setIndex}`;
    setSetData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        ...(activeKeypad.mode === 'weight'
          ? { weight: value, repsOk: repsOk !== undefined ? repsOk : true }
          : { chrono: value }
        ),
      },
    }));
  };

  const handleKeypadNext = () => {
    if (!activeKeypad) return;
    const nextIdx = activeKeypad.flattenedIndex + 1;
    if (nextIdx < allSets.length) {
      openKeypadAtIndex(nextIdx);
    } else {
      setActiveKeypad(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Détails de la Séance</Text>
          {isCoach ? (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.closeButton, { backgroundColor: '#FEE2E2' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={18} color="#DC2626" />
            </TouchableOpacity>
          ) : <View style={styles.closeButtonPlaceholder} />}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card with Title and Status */}
          <View style={[styles.titleContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.workoutName, { color: theme.colors.text, flex: 1 }]}>{sessionTitle}</Text>
              {!isCoach && (
                <View style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: isValidated ? '#D1FAE5' : '#FEF3C7',
                  marginLeft: 8,
                }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: isValidated ? '#047857' : '#B45309',
                  }}>
                    {isValidated ? '✓ Validée' : '○ À compléter'}
                  </Text>
                </View>
              )}
            </View>
            
            {!isRestDay && (!!surfaceMeta || !!equipmentMeta) && (
              <View style={styles.metaRow}>
                {!!surfaceMeta && (
                  <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                    <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                      {surfaceMeta === 'cote' ? '⛰️ Côte' : '🏟️ Piste'}
                    </Text>
                  </View>
                )}
                {!!equipmentMeta && (
                  <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                    <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                      {equipmentMeta === 'pointes' ? '👟 Pointes' : '👟 Baskets'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isCoach && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={15} color={theme.colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Consignes / Notes if provided (for non-technical sessions) */}
          {!isTechnical && cleanDescription ? (
            <View style={[styles.consignesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.consignesHeader}>
                <Feather name="file-text" size={14} color={theme.colors.accent} />
                <Text style={[styles.consignesCaption, { color: theme.colors.accent }]}>
                  {isRestDay ? 'NOTE DE RÉCUPÉRATION' : 'CONSIGNES DE SÉANCE'}
                </Text>
              </View>
              <Text style={[styles.consignesBody, { color: theme.colors.text }]}>{cleanDescription}</Text>
            </View>
          ) : null}

          {isRestDay ? (
            <View style={[styles.restDayCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.restDayIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="cafe-outline" size={30} color="#475569" />
              </View>
              <Text style={[styles.restDayTitle, { color: theme.colors.text }]}>Jour de repos</Text>
              <Text style={[styles.restDaySubtitle, { color: theme.colors.textSecondary }]}>
                Aucun entraînement programmé. Priorité à la récupération et au repos.
              </Text>
            </View>
          ) : isTechnical ? (
            <View style={styles.technicalContainer}>
              <View style={styles.technicalSectionHeader}>
                <View style={[styles.technicalIconBox, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="git-merge-outline" size={16} color="#047857" />
                </View>
                <Text style={[styles.technicalSectionTitle, { color: theme.colors.text }]}>
                  CONSIGNES & ATELIERS TECHNIQUES
                </Text>
              </View>

              {Array.isArray(technicalNotes) && technicalNotes.length > 0 ? (
                technicalNotes.map((note: any, idx: number) => {
                  const isTeam = note.targetType === 'team';
                  const isSubgroup = note.targetType === 'subgroup';
                  const badgeBg = isTeam ? '#E0E7FF' : isSubgroup ? '#D1FAE5' : '#FEF3C7';
                  const badgeText = isTeam ? '#4338CA' : isSubgroup ? '#047857' : '#B45309';
                  const badgeIcon = isTeam ? 'people' : isSubgroup ? 'git-branch' : 'person';
                  const targetLabel = note.targetName || (isTeam ? 'Tout le groupe' : isSubgroup ? 'Sous-groupe' : 'Athlète');

                  return (
                    <View
                      key={note.id || idx}
                      style={[styles.technicalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.technicalCardTop}>
                        <View style={[styles.technicalBadge, { backgroundColor: badgeBg }]}>
                          <Ionicons name={badgeIcon as any} size={12} color={badgeText} />
                          <Text style={[styles.technicalBadgeText, { color: badgeText }]}>
                            {targetLabel}
                          </Text>
                        </View>
                        <Text style={[styles.technicalIndex, { color: theme.colors.textSecondary }]}>
                          Atelier #{idx + 1}
                        </Text>
                      </View>

                      {note.title ? (
                        <Text style={[styles.technicalNoteTitle, { color: theme.colors.text }]}>
                          {note.title}
                        </Text>
                      ) : null}

                      <Text style={[styles.technicalNoteContent, { color: theme.colors.text }]}>
                        {note.content}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.technicalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.technicalNoteContent, { color: theme.colors.text }]}>
                    {cleanDescription || 'Aucune consigne technique renseignée.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* ========== EXERCISE BLOCKS ========== */
            <View style={styles.blocksContainer}>
              {isLoadingData && !isCoach && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                </View>
              )}
              {blocks.map((block, index) => (
              <View key={block.id} style={styles.block}>
                <View style={styles.blockHeader}>
                  <View style={[styles.blockNumber, { backgroundColor: theme.colors.accent }]}>
                    <Text style={styles.blockNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.blockName, { color: theme.colors.text }]}>{block.name}</Text>
                </View>

                {(block.exercises || []).map((exercise: Exercise) => (
                  <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
                    
                    {!!(exercise as any).target && (exercise as any).target.type !== 'all' && (
                      <View style={styles.targetBadge}>
                        <Feather name="user" size={11} color={theme.colors.accent} />
                        <Text style={[styles.targetBadgeText, { color: theme.colors.accent }]}>
                          {(exercise as any).target.name || 'Cible spécifique'}
                        </Text>
                      </View>
                    )}

                    {!!exercise.notes && (
                      <Text style={[styles.exerciseNotes, { color: theme.colors.textSecondary }]}>
                        {exercise.notes}
                      </Text>
                    )}

                    <View style={[styles.setsContainer, needsDataEntry && { gap: 0 }]}>
                      {/* Column headers for athlete mode */}
                      {needsDataEntry && (exercise.sets || []).length > 0 && (
                        <View style={[styles.athleteSetHeader, { borderBottomColor: theme.colors.border }]}>
                          <Text style={[styles.athleteHeaderText, { color: theme.colors.textMuted, width: 32 }]}>Série</Text>
                          <Text style={[styles.athleteHeaderText, { color: theme.colors.textMuted, flex: 1 }]}>Objectif</Text>
                          {sessionCategory === 'muscu' && (
                            <>
                              <Text style={[styles.athleteHeaderText, { color: theme.colors.textMuted, width: 70 }]}>Charge</Text>
                              <Text style={[styles.athleteHeaderText, { color: theme.colors.textMuted, width: 40, textAlign: 'center' }]}>Reps</Text>
                            </>
                          )}
                          {sessionCategory === 'course' && (
                            <Text style={[styles.athleteHeaderText, { color: theme.colors.textMuted, width: 90 }]}>Chrono</Text>
                          )}
                        </View>
                      )}

                      {(exercise.sets || []).map((set, setIndex) => {
                        // Build set objective string
                        const setDetails = [];
                        if (set.steps) {
                          setDetails.push(`${set.steps} marches`);
                        } else if (set.reps) {
                          setDetails.push(`${set.reps} reps`);
                        }
                        if (set.distance) setDetails.push(`${set.distance}m`);
                        if ((set as any).intensity) setDetails.push(`${(set as any).intensity}%`);
                        if (set.duration) setDetails.push(set.duration);
                        if (set.weight !== undefined && set.weight !== null) {
                          const wType = (set as any).weight_type || (set as any).weightType;
                          if (wType === 'percent_1rm' || String(set.weight).includes('%')) {
                            setDetails.push(`${set.weight}% 1RM`);
                          } else {
                            setDetails.push(`${set.weight}kg`);
                          }
                        }
                        if (setDetails.length === 0) {
                          setDetails.push('Libre');
                        }
                        if (set.restSeconds) {
                          const r = set.restSeconds >= 60 ? `${Math.floor(set.restSeconds / 60)}m${set.restSeconds % 60 ? (set.restSeconds % 60) : ''}` : `${set.restSeconds}s`;
                          setDetails.push(`Réc: ${r}`);
                        }

                        const resultKey = `${exercise.id}_${setIndex}`;
                        const data = setData[resultKey] || {};

                        if (needsDataEntry) {
                          // ===== ATHLETE: Inline data entry =====
                          return (
                            <View key={set.id || setIndex} style={[styles.athleteSetRow, { borderBottomColor: theme.colors.border }]}>
                              {/* Set number */}
                              <View style={[styles.athleteSetNum, { backgroundColor: theme.colors.surfaceLight }]}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{setIndex + 1}</Text>
                              </View>
                              
                              {/* Objective */}
                              <Text style={{ flex: 1, fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' }} numberOfLines={1}>
                                {setDetails.join(' · ')}
                              </Text>

                              {sessionCategory === 'muscu' && (
                                <>
                                  {/* Weight Keypad Button */}
                                  <TouchableOpacity
                                    style={[
                                      styles.athleteValueButton,
                                      { width: 88 },
                                      data.weight ? styles.athleteValueButtonFilled : null,
                                    ]}
                                    onPress={() => {
                                      const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                      if (idx >= 0) openKeypadAtIndex(idx);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={[
                                      styles.athleteValueButtonText,
                                      { color: data.weight ? theme.colors.accent : theme.colors.textMuted },
                                      !data.weight && styles.athleteValuePlaceholder,
                                    ]}>
                                      {data.weight ? `${data.weight} kg` : '+ Poids'}
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Reps completed toggle */}
                                  <TouchableOpacity
                                    style={[styles.repsToggle, {
                                      backgroundColor: data.repsOk === false ? '#FEE2E2' : data.repsOk ? '#D1FAE5' : theme.colors.surfaceLight,
                                      borderColor: data.repsOk === false ? '#FCA5A5' : data.repsOk ? '#6EE7B7' : theme.colors.border,
                                    }]}
                                    onPress={() => {
                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                      const current = data.repsOk;
                                      // Toggle: undefined → true → false → true
                                      updateSetField(resultKey, 'repsOk', current === false ? true : current === true ? false : true);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Feather 
                                      name={data.repsOk === false ? 'x' : 'check'} 
                                      size={16} 
                                      color={data.repsOk === false ? '#DC2626' : data.repsOk ? '#047857' : theme.colors.textMuted} 
                                    />
                                  </TouchableOpacity>
                                </>
                              )}

                              {sessionCategory === 'course' && (
                                <TouchableOpacity
                                  style={[
                                    styles.athleteValueButton,
                                    { minWidth: 105 },
                                    data.chrono ? styles.athleteValueButtonFilled : null,
                                  ]}
                                  onPress={() => {
                                    const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                    if (idx >= 0) openKeypadAtIndex(idx);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Feather
                                    name="clock"
                                    size={13}
                                    color={data.chrono ? theme.colors.accent : theme.colors.textMuted}
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text style={[
                                    styles.athleteValueButtonText,
                                    { color: data.chrono ? theme.colors.accent : theme.colors.textMuted },
                                    !data.chrono && styles.athleteValuePlaceholder,
                                  ]}>
                                    {data.chrono ? `${data.chrono} ${(set.distance || 0) >= 800 ? 'min' : 'sec'}` : '+ Chrono'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        } else {
                          // ===== COACH or non-data session: read-only =====
                          return (
                            <View key={set.id || setIndex} style={styles.setRow}>
                              <Text style={[styles.setNumber, { color: theme.colors.textMuted }]}>{setIndex + 1}</Text>
                              <Text style={[styles.setDetails, { color: theme.colors.text }]}>
                                {setDetails.join('  •  ')}
                              </Text>
                            </View>
                          );
                        }
                      })}
                    </View>

                    {exercise.restBetweenExercises ? (
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>
                          Repos fin d'exercice : {exercise.restBetweenExercises >= 60 ? `${Math.floor(exercise.restBetweenExercises / 60)} min` : `${exercise.restBetweenExercises}s`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ========== ATHLETE BOTTOM SECTION ========== */}
        {!isCoach && (
          <View style={{ marginTop: 24, gap: 16 }}>
            {/* Comment / Notes */}
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 8, color: theme.colors.text }}>
                Commentaires {sessionCategory === 'other' ? '' : '(Optionnel)'}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontSize: 15,
                }}
                placeholder={
                  sessionCategory === 'other'
                    ? "Comment s'est passée la séance ? Notes, ressentis..."
                    : "Comment s'est passée la séance ?"
                }
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={athleteNotes}
                onChangeText={setAthleteNotes}
              />
            </View>

            {/* Submit / Update button */}
            <TouchableOpacity
              style={[styles.submitBtn, {
                backgroundColor: isValidated ? theme.colors.accent : theme.colors.success,
                opacity: isSubmitting ? 0.6 : 1,
              }]}
              onPress={submitAthleteWorkout}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Feather name={isValidated ? 'refresh-cw' : 'check-circle'} size={20} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Enregistrement...' : isValidated ? 'Mettre à jour' : 'Valider la séance'}
              </Text>
            </TouchableOpacity>

            {isValidated && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 8 }}>
                <Feather name="check" size={14} color={theme.colors.success} />
                <Text style={{ fontSize: 13, color: theme.colors.success, fontWeight: '600' }}>
                  Séance validée — tu peux modifier tes données à tout moment
                </Text>
              </View>
            )}
          </View>
        )}
        </ScrollView>

        {activeKeypad && (
          <AthleteValueKeypadModal
            visible={!!activeKeypad}
            onClose={() => setActiveKeypad(null)}
            onSave={handleKeypadSave}
            onNext={handleKeypadNext}
            hasNextSet={activeKeypad.flattenedIndex < allSets.length - 1}
            initialValue={activeKeypad.initialValue}
            initialRepsOk={activeKeypad.initialRepsOk}
            mode={activeKeypad.mode}
            distance={activeKeypad.distance}
            title={activeKeypad.title}
            subtitle={activeKeypad.subtitle}
          />
        )}
      </View>
    </Modal>
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
  closeButton: {
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
  closeButtonPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  titleContainer: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  workoutName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  consignesCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  consignesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  consignesCaption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  consignesBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  restDayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  restDayIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  restDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  restDaySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  blocksContainer: {
    gap: 32,
  },
  block: {
    gap: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  blockNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockName: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exerciseNotes: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumber: {
    width: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  setDetails: {
    fontSize: 15,
  },
  // Athlete data entry styles
  athleteSetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  athleteHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  athleteSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  athleteSetNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  athleteValueButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  athleteValueButtonFilled: {
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  athleteValueButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  athleteValuePlaceholder: {
    fontWeight: '500',
    opacity: 0.6,
  },
  repsToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  technicalContainer: {
    gap: 14,
  },
  technicalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  technicalIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  technicalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  technicalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  technicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  technicalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  technicalIndex: {
    fontSize: 12,
    fontWeight: '600',
  },
  technicalNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  technicalNoteContent: {
    fontSize: 14,
    lineHeight: 21,
  },
});
