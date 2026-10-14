import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Platform, StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { timeLabelOf } from './TimeField';
import { SprintyBadge, isSprintyWorkout } from '../../sprinty/SprintyBadge';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { WorkoutBlock, Exercise } from '../../workout/types';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { supabase } from '../../../services/supabase';
import { AthleteValueKeypadModal } from './AthleteValueKeypadModal';
import { CopyWorkoutModal } from './CopyWorkoutModal';
import { RepeatWorkoutModal } from './RepeatWorkoutModal';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';

interface WorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onDelete?: (workout: any) => void;
  onEdit?: (workout: any) => void;
  onUpdated?: () => void;
  readOnlyAthleteId?: string;
}

function chronoToMs(value: string, distance?: number | string | null): number | null {
  const v = String(value || '').trim().replace(',', '.');
  if (!v) return null;
  if (v.includes(':')) {
    const [minutes, seconds] = v.split(':');
    const ms = (parseFloat(minutes) || 0) * 60000 + (parseFloat(seconds) || 0) * 1000;
    return Number.isFinite(ms) ? Math.round(ms) : null;
  }
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  const meters = typeof distance === 'number' ? distance : parseFloat(String(distance || '0'));
  if (meters >= 800) return Math.round(n * 60000);
  return Math.round(n * 1000);
}

// Determine the "category" of the session for athlete data entry
const getSessionCategory = (typeSeance: string): 'muscu' | 'course' | 'other' => {
  const t = (typeSeance || '').toLowerCase();
  if (t.includes('musculation')) return 'muscu';
  if (t.includes('course') || t.includes('sprint') || t.includes('piste') || t.includes('côte') || t.includes('cote')) return 'course';
  return 'other';
};

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({ visible, onClose, workout, onDelete, onEdit, onUpdated, readOnlyAthleteId }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subgroups, teamMembers } = useCoachStore();
  const isCoach = user?.role === 'coach' && !readOnlyAthleteId;
  const isReadOnly = !!readOnlyAthleteId;

  const getTargetsLabel = (targets?: { subgroups?: string[]; athletes?: string[] } | any) => {
    if (!targets) return null;
    const names: string[] = [];
    
    // Subgroups
    targets.subgroups?.forEach((id: string) => {
      const sg = subgroups.find((s) => s.id === id);
      if (sg?.name) names.push(sg.name);
    });

    // Athletes
    targets.athletes?.forEach((id: string) => {
      const mem = teamMembers.find((m) => m.user_id === id);
      if (mem?.profile?.first_name) {
        names.push(mem.profile.first_name);
      } else if (mem?.profile?.full_name) {
        names.push(mem.profile.full_name.split(' ')[0]);
      }
    });

    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names[0]} +${names.length - 1}`;
  };

  // Athlete data entry state
  // For muscu: { "exerciseId_setIndex": { weight: "80", repsOk: true } }
  // For course: { "exerciseId_setIndex": { chrono: "12.34" } }
  const [setData, setSetData] = React.useState<Record<string, any>>({});
  const [athleteNotes, setAthleteNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isValidated, setIsValidated] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  // Copy/Repeat modal state (coach only)
  const [showCopyModal, setShowCopyModal] = React.useState(false);
  const [showRepeatModal, setShowRepeatModal] = React.useState(false);

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

  // Computed before hooks that depend on it
  const sessionCategory = getSessionCategory(workout?.type_seance || '');
  const needsDataEntry = (!isCoach || isReadOnly) && (sessionCategory === 'muscu' || sessionCategory === 'course');

  // Load existing athlete data when workout changes
  React.useEffect(() => {
    if (visible && workout && (!isCoach || isReadOnly) && user) {
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

  // *** ALL HOOKS ARE ABOVE THIS LINE ***
  // Guard: return null if no workout data (safe because all hooks have been called)
  if (!workout) return null;

  const handleDelete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const confirmed = await confirmAsync({
      title: 'Supprimer la séance ?',
      message: 'Cette séance sera supprimée du calendrier.',
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (confirmed) onDelete?.(workout);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.(workout);
  };

  const submitAthleteWorkout = async () => {
    if (!user || !workout?.id) return;
    setIsSubmitting(true);
    try {
      const sc = getSessionCategory(workout.type_seance);
      const efforts: any[] = [];
      const blks = workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }];
      
      let setOrderGlobal = 0;
      for (let bIdx = 0; bIdx < blks.length; bIdx++) {
        const block = blks[bIdx];
        for (const exercise of (block.exercises || [])) {
          for (let i = 0; i < (exercise.sets || []).length; i++) {
            const set = exercise.sets[i];
            const key = `${exercise.id}_${i}`;
            const data = setData[key];
            
            const effort: any = {
              workout_id: workout.id,
              exercise_catalog_id: exercise.catalog_id ? String(exercise.catalog_id).trim() : null,
              exercise_category: workout.type_seance || 'Général',
              block_order: bIdx,
              set_order: setOrderGlobal,
              planned_reps: set?.reps ? parseInt(String(set.reps), 10) : null,
              planned_weight_kg: set?.weight !== undefined && set?.weight !== null ? parseFloat(String(set.weight)) : null,
              planned_distance_m: set?.distance ? parseFloat(String(set.distance)) : null,
              actual_extra: {},
            };

            if (sc === 'muscu') {
              if (data) {
                effort.actual_weight_kg = data.weight ? parseFloat(String(data.weight)) : null;
                effort.actual_reps = data.repsOk === false ? 0 : (set?.reps ? parseInt(String(set.reps), 10) : null);
                effort.actual_extra = {
                  weight: data.weight || '',
                  repsOk: data.repsOk !== false,
                };
              }
            } else if (sc === 'course') {
              effort.actual_distance_m = set?.distance ? parseFloat(String(set.distance)) : null;
              if (data) {
                effort.actual_extra = {
                  chrono: data.chrono || '',
                };
                effort.actual_time_ms = chronoToMs(data.chrono || '', set?.distance);
              }
            }

            efforts.push(effort);
            setOrderGlobal++;
          }
        }
      }

      // Updated measures with athlete notes
      const updatedMeasures = { ...(workout.measures || {}), athlete_notes: athleteNotes.trim() || null };

      // Atomic RPC call: saves efforts, updates measures and marks status = 'completed'
      await workoutService.submitWorkoutResults(workout.id, efforts, updatedMeasures);
      
      // Update local workout properties so UI updates immediately
      workout.status = 'completed';
      workout.measures = updatedMeasures;

      setIsValidated(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdated?.();

      toast(
        'success',
        isValidated
          ? 'Tes modifications ont été enregistrées.'
          : 'Ta séance a été validée.',
        'Données enregistrées'
      );
    } catch (e: any) {
      console.error('Error submitting athlete workout:', e);
      appAlert('Erreur', e?.message || 'Impossible de valider la séance.');
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
  const isCompetition = sessionTitle.toLowerCase().includes('compétition') || sessionTitle.toLowerCase().includes('competition');
  const technicalNotes = workout.measures?.technical_notes;

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
      <FeedbackHost />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
          <Text style={styles.headerTitle} numberOfLines={1}>Détails de la séance</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header Card with Title and Status */}
          <View style={styles.titleContainer}>
            {isSprintyWorkout(workout) && (
              <View style={{ marginBottom: 8 }}>
                <SprintyBadge />
              </View>
            )}
            <View style={styles.titleRow}>
              <Text style={styles.workoutName}>{sessionTitle}</Text>
              {!!timeLabelOf(workout) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Feather name="clock" size={13} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary }}>{timeLabelOf(workout)}</Text>
                </View>
              )}
              {!isCoach && (
                <View style={[styles.statusPill, isValidated ? styles.statusPillDone : styles.statusPillTodo]}>
                  <Feather
                    name={isValidated ? 'check-circle' : 'circle'}
                    size={12}
                    color={isValidated ? theme.colors.success : theme.colors.warning}
                  />
                  <Text style={[styles.statusPillText, { color: isValidated ? theme.colors.success : theme.colors.warning }]}>
                    {isValidated ? 'Validée' : 'À compléter'}
                  </Text>
                </View>
              )}
            </View>
            
            {!isRestDay && !isCompetition && (!!surfaceMeta || !!equipmentMeta) && (
              <View style={styles.metaRow}>
                {!!surfaceMeta && (
                  <View style={styles.metaPill}>
                    <Feather
                      name={surfaceMeta === 'cote' ? 'trending-up' : 'disc'}
                      size={12}
                      color={theme.colors.sprintyBlue}
                    />
                    <Text style={styles.metaPillText}>
                      {surfaceMeta === 'cote' ? 'Côte' : 'Piste'}
                    </Text>
                  </View>
                )}
                {!!equipmentMeta && (
                  <View style={styles.metaPill}>
                    <Feather
                      name={equipmentMeta === 'pointes' ? 'zap' : 'activity'}
                      size={12}
                      color={theme.colors.sprintyBlue}
                    />
                    <Text style={styles.metaPillText}>
                      {equipmentMeta === 'pointes' ? 'Pointes' : 'Baskets'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isCoach && (
              <View style={styles.actionsContainer}>
                <PressableScale
                  haptic="none"
                  containerStyle={styles.actionBtnContainer}
                  style={styles.actionBtn}
                  onPress={handleEdit}
                  accessibilityRole="button"
                >
                  <Feather name="edit-2" size={15} color={theme.colors.sprintyBlue} />
                  <Text style={styles.actionBtnText}>Modifier</Text>
                </PressableScale>

                <PressableScale
                  containerStyle={styles.actionBtnContainer}
                  style={styles.actionBtn}
                  onPress={() => setShowCopyModal(true)}
                  accessibilityRole="button"
                >
                  <Feather name="copy" size={15} color={theme.colors.sprintyBlue} />
                  <Text style={styles.actionBtnText}>Copier</Text>
                </PressableScale>

                <PressableScale
                  containerStyle={styles.actionBtnContainer}
                  style={styles.actionBtn}
                  onPress={() => setShowRepeatModal(true)}
                  accessibilityRole="button"
                >
                  <Feather name="repeat" size={15} color={theme.colors.sprintyBlue} />
                  <Text style={styles.actionBtnText}>Répéter</Text>
                </PressableScale>
              </View>
            )}
          </View>

          {/* Consignes / Notes if provided (for non-technical sessions) */}
          {!isTechnical && cleanDescription ? (
            <View style={styles.consignesCard}>
              <View style={styles.consignesHeader}>
                <Feather name="file-text" size={14} color={theme.colors.sprintyBlue} />
                <Text style={styles.consignesCaption}>
                  {isRestDay ? 'Note de récupération' : 'Consignes de séance'}
                </Text>
              </View>
              <Text style={styles.consignesBody}>{cleanDescription}</Text>
            </View>
          ) : null}

          {isRestDay ? (
            <View style={styles.restDayCard}>
              <View style={styles.restDayIconCircle}>
                <Feather name="coffee" size={28} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.restDayTitle}>Jour de repos</Text>
              <Text style={styles.restDaySubtitle}>
                Aucun entraînement programmé. Priorité à la récupération et au repos.
              </Text>
            </View>
          ) : isCompetition ? (
            <View style={styles.technicalContainer}>
              <View style={styles.technicalSectionHeader}>
                <View style={[styles.technicalIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
                  <Feather name="award" size={15} color={theme.colors.warning} />
                </View>
                <Text style={styles.technicalSectionTitle}>Informations de la compétition</Text>
              </View>

              <View style={styles.technicalCard}>
                <Text style={styles.competitionName}>
                  {workout.description?.split('\n')[0] || 'Compétition'}
                </Text>

                {workout.measures?.location ? (
                  <View style={styles.competitionInfoRow}>
                    <Feather name="map-pin" size={16} color={theme.colors.textSecondary} style={styles.competitionInfoIcon} />
                    <Text style={styles.competitionInfoText}>
                      {workout.measures.location}
                    </Text>
                  </View>
                ) : null}

                {workout.measures?.attachmentUrl ? (
                  <View style={styles.competitionInfoRow}>
                    <Feather name="link" size={16} color={theme.colors.sprintyBlue} style={styles.competitionInfoIcon} />
                    <Text
                      style={styles.competitionLink}
                      accessibilityRole="link"
                      onPress={() => {
                        const raw = workout.measures.attachmentUrl.trim();
                        const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                        WebBrowser.openBrowserAsync(url).catch(() => undefined);
                      }}
                    >
                      {workout.measures.attachmentUrl}
                    </Text>
                  </View>
                ) : null}

                {(!workout.measures?.location && !workout.measures?.attachmentUrl) && (
                  <Text style={styles.emptyInfoText}>
                    Aucune information supplémentaire.
                  </Text>
                )}
              </View>
            </View>
          ) : isTechnical ? (
            <View style={styles.technicalContainer}>
              <View style={styles.technicalSectionHeader}>
                <View style={[styles.technicalIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Feather name="git-merge" size={15} color={theme.colors.success} />
                </View>
                <Text style={styles.technicalSectionTitle}>Consignes et ateliers techniques</Text>
              </View>

              {Array.isArray(technicalNotes) && technicalNotes.length > 0 ? (
                technicalNotes.map((note: any, idx: number) => {
                  const isTeam = note.targetType === 'team';
                  const isSubgroup = note.targetType === 'subgroup';
                  const badgeBg = isTeam ? '#E0E7FF' : isSubgroup ? '#D1FAE5' : '#FEF3C7';
                  const badgeText = isTeam ? '#4338CA' : isSubgroup ? '#047857' : '#B45309';
                  const badgeIcon = isTeam ? 'users' : isSubgroup ? 'git-branch' : 'user';
                  const targetLabel = note.targetName || (isTeam ? 'Tout le groupe' : isSubgroup ? 'Sous-groupe' : 'Athlète');

                  return (
                    <View
                      key={note.id || idx}
                      style={styles.technicalCard}
                    >
                      <View style={styles.technicalCardTop}>
                        <View style={[styles.technicalBadge, { backgroundColor: badgeBg }]}>
                          <Feather name={badgeIcon as any} size={12} color={badgeText} />
                          <Text style={[styles.technicalBadgeText, { color: badgeText }]}>
                            {targetLabel}
                          </Text>
                        </View>
                        <Text style={styles.technicalIndex}>
                          Atelier #{idx + 1}
                        </Text>
                      </View>

                      {note.title ? (
                        <Text style={styles.technicalNoteTitle}>
                          {note.title}
                        </Text>
                      ) : null}

                      <Text style={styles.technicalNoteContent}>
                        {note.content}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.technicalCard}>
                  <Text style={styles.technicalNoteContent}>
                    {cleanDescription || 'Aucune consigne technique renseignée.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* ========== EXERCISE BLOCKS ========== */
            <View style={styles.blocksContainer}>
              {isLoadingData && !isCoach && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.sprintyBlue} />
                </View>
              )}
              {blocks.map((block, index) => {
                const blockTargets = (block as any).targets || (block.exercises?.[0] as any)?.targets;
                const targetLabel = getTargetsLabel(blockTargets);

                return (
                  <View key={block.id || index} style={styles.block}>
                    <View style={styles.blockHeader}>
                      <View style={styles.blockNumber}>
                        <Text style={styles.blockNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>

                      {targetLabel && (
                        <View style={styles.blockTargetBadge}>
                          <Feather name="users" size={11} color={theme.colors.sprintyBlue} />
                          <Text style={styles.blockTargetBadgeText} numberOfLines={1}>
                            {targetLabel}
                          </Text>
                        </View>
                      )}
                    </View>

                {(block.exercises || []).map((exercise: Exercise) => (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>

                    {!!(exercise as any).target && (exercise as any).target.type !== 'all' && (
                      <View style={styles.targetBadge}>
                        <Feather name="user" size={11} color={theme.colors.sprintyBlue} />
                        <Text style={styles.targetBadgeText}>
                          {(exercise as any).target.name || 'Cible spécifique'}
                        </Text>
                      </View>
                    )}

                    {!!exercise.notes && (
                      <Text style={styles.exerciseNotes}>
                        {exercise.notes}
                      </Text>
                    )}

                    <View style={[styles.setsContainer, needsDataEntry && { gap: 0 }]}>
                      {/* Column headers for athlete mode */}
                      {needsDataEntry && (exercise.sets || []).length > 0 && (
                        <View style={styles.athleteSetHeader}>
                          <Text style={[styles.athleteHeaderText, { width: 32 }]}>Série</Text>
                          <Text style={[styles.athleteHeaderText, { flex: 1 }]}>Objectif</Text>
                          {sessionCategory === 'muscu' && (
                            <Text style={[styles.athleteHeaderText, { width: 90 }]}>Charge</Text>
                          )}
                          {sessionCategory === 'course' && (
                            <Text style={[styles.athleteHeaderText, { width: 90 }]}>Chrono</Text>
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
                          setDetails.push(`Récup ${r}`);
                        }

                        const resultKey = `${exercise.id}_${setIndex}`;
                        const data = setData[resultKey] || {};

                        if (needsDataEntry) {
                          // ===== ATHLETE: Inline data entry =====
                          return (
                            <View key={set.id || setIndex} style={styles.athleteSetRow}>
                              {/* Set number */}
                              <View style={styles.athleteSetNum}>
                                <Text style={styles.athleteSetNumText}>{setIndex + 1}</Text>
                              </View>

                              {/* Objective */}
                              <Text style={styles.athleteObjective} numberOfLines={1}>
                                {setDetails.join(' · ')}
                              </Text>

                              {sessionCategory === 'muscu' && (
                                <PressableScale
                                  haptic="selection"
                                  hitSlop={{ top: 4, bottom: 4 }}
                                  style={[
                                    styles.athleteValueButton,
                                    { minWidth: 90 },
                                    data.weight ? styles.athleteValueButtonFilled : null,
                                  ]}
                                  onPress={() => {
                                    const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                    if (idx >= 0) openKeypadAtIndex(idx);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={data.weight ? `Charge série ${setIndex + 1} : ${data.weight} kg` : `Saisir la charge de la série ${setIndex + 1}`}
                                >
                                  {!data.weight && <Feather name="plus" size={13} color={theme.colors.textSecondary} />}
                                  <Text style={[
                                    styles.athleteValueButtonText,
                                    data.weight ? styles.athleteValueFilledText : styles.athleteValuePlaceholder,
                                  ]}>
                                    {data.weight ? `${data.weight} kg` : 'Poids'}
                                  </Text>
                                </PressableScale>
                              )}

                              {sessionCategory === 'course' && (
                                <PressableScale
                                  haptic="selection"
                                  hitSlop={{ top: 4, bottom: 4 }}
                                  style={[
                                    styles.athleteValueButton,
                                    { minWidth: 105 },
                                    data.chrono ? styles.athleteValueButtonFilled : null,
                                  ]}
                                  onPress={() => {
                                    const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                    if (idx >= 0) openKeypadAtIndex(idx);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={data.chrono ? `Chrono série ${setIndex + 1} : ${data.chrono}` : `Saisir le chrono de la série ${setIndex + 1}`}
                                >
                                  <Feather
                                    name="clock"
                                    size={13}
                                    color={data.chrono ? theme.colors.sprintyBlue : theme.colors.textSecondary}
                                  />
                                  <Text style={[
                                    styles.athleteValueButtonText,
                                    data.chrono ? styles.athleteValueFilledText : styles.athleteValuePlaceholder,
                                  ]}>
                                    {data.chrono ? `${data.chrono} ${(set.distance || 0) >= 800 ? 'min' : 's'}` : 'Chrono'}
                                  </Text>
                                </PressableScale>
                              )}
                            </View>
                          );
                        } else {
                          // ===== COACH or non-data session: read-only =====
                          return (
                            <View key={set.id || setIndex} style={styles.setRow}>
                              <View style={styles.setNumber}>
                                <Text style={styles.setNumberText}>{setIndex + 1}</Text>
                              </View>
                              <Text style={styles.setDetails}>
                                {setDetails.join(' · ')}
                              </Text>
                            </View>
                          );
                        }
                      })}
                    </View>

                    {exercise.restBetweenExercises ? (
                      <View style={styles.exerciseRestRow}>
                        <Feather name="pause-circle" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.exerciseRestText}>
                          Repos fin d’exercice : {exercise.restBetweenExercises >= 60 ? `${Math.floor(exercise.restBetweenExercises / 60)} min` : `${exercise.restBetweenExercises}s`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })}
          </View>
        )}

        {/* ========== ATHLETE BOTTOM SECTION ========== */}
        {!isCoach && (
          <View style={styles.athleteBottom}>
            {/* Comment / Notes */}
            <View>
              <Text style={styles.sectionLabel}>
                {sessionCategory === 'other' ? 'Commentaire' : 'Commentaire (facultatif)'}
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder={
                  sessionCategory === 'other'
                    ? 'Comment s’est passée la séance ? Notes, ressentis…'
                    : 'Comment s’est passée la séance ?'
                }
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.sprintyBlue}
                multiline
                value={athleteNotes}
                onChangeText={setAthleteNotes}
              />
            </View>

            {/* Submit / Update button */}
            <PressableScale
              haptic="medium"
              style={[
                styles.submitBtn,
                { backgroundColor: justSaved || !isValidated ? theme.colors.success : theme.colors.sprintyBlue },
                isSubmitting && styles.submitBtnBusy,
              ]}
              onPress={submitAthleteWorkout}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name={justSaved ? 'check' : isValidated ? 'refresh-cw' : 'check-circle'}
                  size={19}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.submitBtnText} numberOfLines={1}>
                {isSubmitting
                  ? 'Enregistrement…'
                  : justSaved
                    ? 'Données à jour'
                    : isValidated
                      ? 'Mettre à jour mes données'
                      : 'Valider la séance'}
              </Text>
            </PressableScale>

            {isValidated && (
              <View style={styles.validatedHint}>
                <Feather name="check-circle" size={14} color={theme.colors.success} />
                <Text style={styles.validatedHintText}>
                  Séance validée. Tu peux modifier tes données à tout moment.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ========== COACH BOTTOM DELETE ACTION ========== */}
        {isCoach && (
          <PressableScale
            haptic="none"
            style={styles.coachDeleteFooterBtn}
            onPress={handleDelete}
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={16} color={theme.colors.error} />
            <Text style={styles.coachDeleteFooterText}>Supprimer cette séance</Text>
          </PressableScale>
        )}
        </ScrollView>
        </KeyboardAvoidingView>

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

        {/* Copy/Repeat Modals (Coach only) */}
        {isCoach && (
          <>
            <CopyWorkoutModal
              visible={showCopyModal}
              onClose={() => setShowCopyModal(false)}
              workout={workout}
              onCopied={() => {
                setShowCopyModal(false);
                onClose();
                onUpdated?.();
              }}
            />
            <RepeatWorkoutModal
              visible={showRepeatModal}
              onClose={() => setShowRepeatModal(false)}
              workout={workout}
              onRepeated={() => {
                setShowRepeatModal(false);
                onClose();
                onUpdated?.();
              }}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  headerPlaceholder: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  // Title card
  titleContainer: {
    ...glassCard,
    padding: 20,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  workoutName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginTop: 3,
  },
  statusPillDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusPillTodo: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  actionBtnContainer: {
    flex: 1,
  },
  actionBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Consignes
  consignesCard: {
    ...glassCard,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.sprintyBlue,
  },
  consignesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  consignesCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.sprintyBlue,
  },
  consignesBody: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
  // Rest day
  restDayCard: {
    ...glassCard,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  restDayIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: theme.colors.glassFill,
  },
  restDayTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
    marginBottom: 6,
  },
  restDaySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    color: theme.colors.textSecondary,
  },
  // Technical / competition
  technicalContainer: {
    gap: 12,
  },
  technicalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  technicalIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicalSectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  technicalCard: {
    ...glassCard,
  },
  competitionName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: theme.colors.text,
    marginBottom: 12,
  },
  competitionInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  competitionInfoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  competitionInfoText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  competitionLink: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.sprintyBlue,
    textDecorationLine: 'underline',
  },
  emptyInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  technicalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  technicalIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  technicalNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  technicalNoteContent: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
  // Blocks & exercises
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  blocksContainer: {
    gap: 28,
  },
  block: {
    gap: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  blockNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sprintyBlue,
  },
  blockNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  blockName: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.colors.text,
    flexShrink: 1,
  },
  blockTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginLeft: 'auto',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  blockTargetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  exerciseCard: {
    ...glassCard,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
    color: theme.colors.text,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.sprintyBlue,
  },
  exerciseNotes: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  setNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  setDetails: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  exerciseRestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  exerciseRestText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // Athlete data entry
  athleteSetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
    gap: 8,
  },
  athleteHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  athleteSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  athleteSetNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glassFill,
  },
  athleteSetNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  athleteObjective: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  athleteValueButton: {
    minHeight: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: theme.colors.glassFill,
  },
  athleteValueButtonFilled: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    borderColor: 'rgba(0, 105, 232, 0.3)',
  },
  athleteValueButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  athleteValueFilledText: {
    color: theme.colors.sprintyBlue,
  },
  athleteValuePlaceholder: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  athleteBottom: {
    marginTop: 24,
    gap: 16,
  },
  notesInput: {
    minHeight: 96,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: theme.colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  submitBtnBusy: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  validatedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  validatedHintText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
    textAlign: 'center',
  },
  coachDeleteFooterBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginTop: 24,
    marginBottom: 20,
  },
  coachDeleteFooterText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.error,
  },
});
