import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { coachExerciseService, CoachExercise } from '../../../services/coachExerciseService';
import { RestTimePickerModal } from './RestTimePickerModal';

interface StairsWorkoutBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

export interface ExerciseTarget {
  type: 'all' | 'subgroup' | 'athlete';
  id?: string | null;
  name?: string;
}

export interface StairExerciseItem {
  id: string;
  name: string;
  stairs: number | null; // null = libre / non précisé
  setsCount: number;
  restSets: number; // in seconds
  restExercise: number; // in seconds
  target: ExerciseTarget;
}

const STORAGE_STAIRS_COUNT_KEY = '@sprintflow_stairs_last_count';
const STORAGE_STAIRS_MODE_KEY = '@sprintflow_stairs_last_mode';
const STORAGE_STAIRS_SETS_KEY = '@sprintflow_stairs_last_sets';
const STORAGE_STAIRS_REST_SETS_KEY = '@sprintflow_stairs_last_rest_sets';
const STORAGE_STAIRS_REST_EX_KEY = '@sprintflow_stairs_last_rest_ex';

export const StairsWorkoutBuilder: React.FC<StairsWorkoutBuilderProps> = ({
  visible,
  date,
  onClose,
  onSave,
  initialWorkout,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);
  const safeBottom = Math.max(insets.bottom, 16);

  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers, fetchTeams, fetchTeamMembers, fetchSubgroups } = useCoachStore();

  // Session-level Target
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Notes de la séance (consignes)
  const [sessionNotes, setSessionNotes] = useState('');

  // Exercises in the current session
  const [sessionExercises, setSessionExercises] = useState<StairExerciseItem[]>([]);

  // Coach's personal library
  const [savedExercises, setSavedExercises] = useState<CoachExercise[]>([]);

  // Sheet Modal: Add / Edit Exercise
  const [isExerciseSheetVisible, setIsExerciseSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Exercise Form State
  const [exerciseName, setExerciseName] = useState('');
  const [isStairsModeManual, setIsStairsModeManual] = useState(true);
  const [manualStairsText, setManualStairsText] = useState('20');
  const [setsCount, setSetsCount] = useState<number>(4);
  const [restSets, setRestSets] = useState<number>(60);
  const [restExercise, setRestExercise] = useState<number>(180);

  // Exercise-level targeting
  const [exTargetType, setExTargetType] = useState<'all' | 'subgroup' | 'athlete'>('all');
  const [exTargetSubgroupId, setExTargetSubgroupId] = useState<string | null>(null);
  const [exTargetAthleteId, setExTargetAthleteId] = useState<string | null>(null);

  // Rest Picker Modal
  const [isRestPickerVisible, setIsRestPickerVisible] = useState(false);
  const [restPickerTarget, setRestPickerTarget] = useState<'sets' | 'exercise'>('sets');

  // Library Management Modal
  const [isManageLibraryVisible, setIsManageLibraryVisible] = useState(false);
  const [editingLibraryEx, setEditingLibraryEx] = useState<CoachExercise | null>(null);
  const [editingLibraryName, setEditingLibraryName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approved team members
  const approvedMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'approved'),
    [teamMembers]
  );

  // Load persistence and library
  useEffect(() => {
    if (visible && user?.id) {
      if (teams.length === 0) {
        fetchTeams();
      }
      loadLibrary();
      loadStairsMemory();
    }
  }, [visible, user?.id, teams.length]);

  // Handle editing mode when initialWorkout is passed
  useEffect(() => {
    if (visible && initialWorkout) {
      const desc = initialWorkout.description || '';
      const isDefault = desc.includes('exercice') && desc.includes("escalier");
      setSessionNotes(isDefault ? '' : desc);

      if (initialWorkout.subgroup_id) {
        setTargetType('subgroup');
        setSelectedSubgroupId(initialWorkout.subgroup_id);
      } else if (initialWorkout.athlete_id && !initialWorkout.group_assignment_id) {
        setTargetType('athlete');
        setSelectedAthleteId(initialWorkout.athlete_id);
      } else {
        setTargetType('team');
      }

      if (initialWorkout.exercises && Array.isArray(initialWorkout.exercises)) {
        const loaded: StairExerciseItem[] = initialWorkout.exercises.map((ex: any) => ({
          id: ex.id || String(uuid.v4()),
          name: ex.name,
          stairs: ex.stairs_count !== undefined ? ex.stairs_count : (ex.sets?.[0]?.steps ?? null),
          setsCount: ex.sets_count || ex.sets?.length || 4,
          restSets: ex.rest_between_sets_s || ex.sets?.[0]?.restSeconds || 60,
          restExercise: ex.rest_between_exercises_s || ex.restBetweenExercises || 180,
          target: ex.target || { type: 'all', id: null, name: 'Tout le groupe' },
        }));
        setSessionExercises(loaded);
      }
    } else if (visible && !initialWorkout) {
      setSessionNotes('');
      setSessionExercises([]);
      setTargetType('team');
      setSelectedSubgroupId(null);
      setSelectedAthleteId(null);
    }
  }, [visible, initialWorkout]);

  // Ensure subgroups and members are loaded for the active team
  useEffect(() => {
    if (visible && teams.length > 0) {
      const activeTeamId = teams[0].id;
      if (teamMembers.length === 0) {
        fetchTeamMembers(activeTeamId);
      }
      if (subgroups.length === 0) {
        fetchSubgroups(activeTeamId);
      }
    }
  }, [visible, teams, teamMembers.length, subgroups.length]);

  // Set default targets when data arrives
  useEffect(() => {
    if (subgroups.length > 0 && !selectedSubgroupId) {
      setSelectedSubgroupId(subgroups[0].id);
      setExTargetSubgroupId(subgroups[0].id);
    }
    if (approvedMembers.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(approvedMembers[0].user_id);
      setExTargetAthleteId(approvedMembers[0].user_id);
    }
  }, [subgroups, approvedMembers]);

  // Reset transient form state when modal closes
  useEffect(() => {
    if (!visible) {
      setSessionExercises([]);
      setExerciseName('');
      setEditingId(null);
    }
  }, [visible]);

  const loadLibrary = async () => {
    if (!user?.id) return;
    const list = await coachExerciseService.fetchExercises(user.id, 'escalier');
    setSavedExercises(list || []);
  };

  const loadStairsMemory = async () => {
    try {
      const [savedCount, savedMode, savedSets, savedRestSets, savedRestEx] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STAIRS_COUNT_KEY),
        AsyncStorage.getItem(STORAGE_STAIRS_MODE_KEY),
        AsyncStorage.getItem(STORAGE_STAIRS_SETS_KEY),
        AsyncStorage.getItem(STORAGE_STAIRS_REST_SETS_KEY),
        AsyncStorage.getItem(STORAGE_STAIRS_REST_EX_KEY),
      ]);
      if (savedCount !== null) {
        setManualStairsText(savedCount);
      }
      if (savedMode !== null) {
        setIsStairsModeManual(savedMode === 'manual');
      }
      if (savedSets !== null) {
        const parsed = parseInt(savedSets, 10);
        if (!isNaN(parsed) && parsed > 0) setSetsCount(parsed);
      }
      if (savedRestSets !== null) {
        const parsed = parseInt(savedRestSets, 10);
        if (!isNaN(parsed) && parsed > 0) setRestSets(parsed);
      }
      if (savedRestEx !== null) {
        const parsed = parseInt(savedRestEx, 10);
        if (!isNaN(parsed) && parsed > 0) setRestExercise(parsed);
      }
    } catch (e) {
      console.warn('Could not load stairs memory', e);
    }
  };

  const saveStairsMemory = async (
    countText: string,
    isManual: boolean,
    sets?: number,
    rSets?: number,
    rEx?: number
  ) => {
    try {
      const targetSets = sets ?? setsCount;
      const targetRSets = rSets ?? restSets;
      const targetREx = rEx ?? restExercise;
      await Promise.all([
        AsyncStorage.setItem(STORAGE_STAIRS_COUNT_KEY, countText),
        AsyncStorage.setItem(STORAGE_STAIRS_MODE_KEY, isManual ? 'manual' : 'free'),
        AsyncStorage.setItem(STORAGE_STAIRS_SETS_KEY, String(targetSets)),
        AsyncStorage.setItem(STORAGE_STAIRS_REST_SETS_KEY, String(targetRSets)),
        AsyncStorage.setItem(STORAGE_STAIRS_REST_EX_KEY, String(targetREx)),
      ]);
    } catch (e) {
      console.warn('Could not save stairs memory', e);
    }
  };

  // Open the Add Exercise Sheet
  const handleOpenAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingId(null);
    setExerciseName('');
    // Keep the current manualStairsText, isStairsModeManual, setsCount, restSets, restExercise intact!
    setExTargetType('all');
    setIsExerciseSheetVisible(true);
  };

  // Open Edit Exercise Sheet
  const handleStartEdit = (item: StairExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(item.id);
    setExerciseName(item.name);
    if (item.stairs !== null && item.stairs !== undefined) {
      setIsStairsModeManual(true);
      setManualStairsText(String(item.stairs));
    } else {
      setIsStairsModeManual(false);
    }
    setSetsCount(item.setsCount);
    setRestSets(item.restSets);
    setRestExercise(item.restExercise);
    setExTargetType(item.target?.type || 'all');
    if (item.target?.type === 'subgroup') setExTargetSubgroupId(item.target.id || null);
    if (item.target?.type === 'athlete') setExTargetAthleteId(item.target.id || null);
    setIsExerciseSheetVisible(true);
  };

  // Pre-fill from personal library chip
  const handleSelectFromLibrary = (ex: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExerciseName(ex.name);
    const stairsStr = ex.default_stairs ? String(ex.default_stairs) : manualStairsText;
    const isManual = !!ex.default_stairs;
    setIsStairsModeManual(isManual);
    if (ex.default_stairs) {
      setManualStairsText(stairsStr);
    }
    const targetSets = ex.default_sets || setsCount;
    const targetRestSets = ex.default_rest_sets || restSets;
    const targetRestEx = ex.default_rest_exercise || restExercise;
    setSetsCount(targetSets);
    setRestSets(targetRestSets);
    setRestExercise(targetRestEx);
    saveStairsMemory(stairsStr, isManual, targetSets, targetRestSets, targetRestEx);
  };

  // Save exercise to session list
  const handleSaveExerciseToSession = () => {
    const trimmed = exerciseName.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', "Veuillez indiquer le nom de l'exercice d'escalier.");
      return;
    }
    if (setsCount <= 0) {
      Alert.alert('Séries requises', 'Veuillez renseigner au moins 1 série.');
      return;
    }

    // Persist all stairs & sets settings to memory permanently
    saveStairsMemory(manualStairsText, isStairsModeManual, setsCount, restSets, restExercise);

    let finalTarget: ExerciseTarget = { type: 'all', id: null, name: 'Tout le groupe' };
    if (exTargetType === 'subgroup') {
      const sg = subgroups.find((s) => s.id === exTargetSubgroupId);
      finalTarget = {
        type: 'subgroup',
        id: exTargetSubgroupId,
        name: sg ? sg.name : 'Sous-groupe',
      };
    } else if (exTargetType === 'athlete') {
      const ath = approvedMembers.find((m) => m.user_id === exTargetAthleteId);
      const athProf = (Array.isArray(ath?.profile) ? ath?.profile[0] : ath?.profile) as any;
      const athName = athProf?.full_name || athProf?.first_name || 'Athlète';
      finalTarget = {
        type: 'athlete',
        id: exTargetAthleteId,
        name: athName,
      };
    }

    const calculatedStairs = isStairsModeManual ? parseInt(manualStairsText, 10) || null : null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editingId) {
      setSessionExercises((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: trimmed,
                stairs: calculatedStairs,
                setsCount,
                restSets,
                restExercise,
                target: finalTarget,
              }
            : item
        )
      );
    } else {
      const newItem: StairExerciseItem = {
        id: uuid.v4() as string,
        name: trimmed,
        stairs: calculatedStairs,
        setsCount,
        restSets,
        restExercise,
        target: finalTarget,
      };
      setSessionExercises((prev) => [...prev, newItem]);
    }

    setIsExerciseSheetVisible(false);
  };

  const handleRemoveExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionExercises((prev) => prev.filter((item) => item.id !== id));
  };

  // Library actions
  const handleDeleteFromLibrary = (ex: CoachExercise) => {
    Alert.alert(
      'Supprimer de ma bibliothèque',
      `Supprimer "${ex.name}" de votre bibliothèque d'escaliers ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await coachExerciseService.deleteExercise(ex.id);
            loadLibrary();
          },
        },
      ]
    );
  };

  const handleStartEditLibraryEx = (ex: CoachExercise) => {
    setEditingLibraryEx(ex);
    setEditingLibraryName(ex.name);
  };

  const handleSaveLibraryEdit = async () => {
    if (!editingLibraryEx || !editingLibraryName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await coachExerciseService.updateExercise(editingLibraryEx.id, {
      name: editingLibraryName.trim(),
    });
    setEditingLibraryEx(null);
    setEditingLibraryName('');
    loadLibrary();
  };

  // Wheel picker handlers
  const openRestPicker = (target: 'sets' | 'exercise') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestPickerTarget(target);
    setIsRestPickerVisible(true);
  };

  const handleConfirmRestPicker = (seconds: number) => {
    if (restPickerTarget === 'sets') {
      setRestSets(seconds);
      saveStairsMemory(manualStairsText, isStairsModeManual, setsCount, seconds, restExercise);
    } else {
      setRestExercise(seconds);
      saveStairsMemory(manualStairsText, isStairsModeManual, setsCount, restSets, seconds);
    }
  };

  // Submit and assign workout
  const handleSaveWorkout = async () => {
    if (sessionExercises.length === 0) {
      Alert.alert(
        'Séance vide',
        "Veuillez ajouter au moins un exercice à la séance avant d'enregistrer."
      );
      return;
    }

    if (targetType === 'subgroup' && !selectedSubgroupId) {
      Alert.alert('Sous-groupe requis', 'Veuillez sélectionner un sous-groupe cible.');
      return;
    }

    if (targetType === 'athlete' && !selectedAthleteId) {
      Alert.alert('Athlète requis', 'Veuillez sélectionner un athlète cible.');
      return;
    }

    if (!user?.id) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;

      // Safe date anchor at midday
      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0);
      const targetDateIso = targetDate.toISOString();

      const mapExercisesToPayload = (list: StairExerciseItem[]) =>
        list.map((ex) => ({
          id: ex.id,
          name: ex.name,
          category: 'escalier',
          stairs_count: ex.stairs,
          sets_count: ex.setsCount,
          rest_between_sets_s: ex.restSets,
          rest_between_exercises_s: ex.restExercise,
          restBetweenExercises: ex.restExercise,
          target: ex.target,
          sets: Array.from({ length: ex.setsCount }, (_, idx) => ({
            id: uuid.v4() as string,
            set_index: idx + 1,
            steps: ex.stairs || undefined,
            reps: ex.stairs || undefined,
            restSeconds: ex.restSets,
            isCompleted: false,
          })),
        }));

      // If we are editing an existing workout, delete the previous record(s) first
      if (initialWorkout) {
        await workoutService.deleteWorkout(initialWorkout.id, initialWorkout.group_assignment_id);
      }

      if (targetType === 'team') {
        if (!activeTeamId) {
          Alert.alert('Erreur', 'Aucune équipe trouvée.');
          setIsSubmitting(false);
          return;
        }

        if (approvedMembers.length === 0) {
          Alert.alert(
            'Aucun athlète',
            "Aucun athlète validé n'a été trouvé dans votre équipe pour recevoir cette séance."
          );
          setIsSubmitting(false);
          return;
        }

        const sharedAssignmentId = uuid.v4() as string;
        let assignedCount = 0;

        // Filter per athlete so they only see their assigned exercises
        for (const member of approvedMembers) {
          const athleteFiltered = sessionExercises.filter((ex) => {
            if (!ex.target || ex.target.type === 'all') return true;
            if (ex.target.type === 'subgroup') return ex.target.id === member.subgroup_id;
            if (ex.target.type === 'athlete') return ex.target.id === member.user_id;
            return false;
          });

          if (athleteFiltered.length > 0) {
            const mappedExercises = mapExercisesToPayload(athleteFiltered);
            const athletePayload = {
              type_seance: 'Escalier',
              coach_id: user.id,
              team_id: activeTeamId,
              athlete_id: member.user_id,
              group_assignment_id: sharedAssignmentId,
              date_prevue: targetDateIso,
              description: sessionNotes.trim() ? sessionNotes.trim() : `${athleteFiltered.length} exercice${athleteFiltered.length > 1 ? 's' : ''} d'escalier`,
              exercises: mappedExercises,
              blocks: [
                {
                  id: uuid.v4() as string,
                  name: 'Corps de séance Escalier',
                  type: 'plyo',
                  exercises: mappedExercises,
                },
              ],
              status: 'pending',
            };

            await workoutService.createPlannedWorkout(athletePayload);
            assignedCount++;
          }
        }

        if (assignedCount === 0) {
          Alert.alert(
            'Information',
            'Aucun athlète ne correspond aux cibles choisies pour les exercices.'
          );
          setIsSubmitting(false);
          return;
        }
      } else if (targetType === 'subgroup') {
        const subMembers = approvedMembers.filter((m) => m.subgroup_id === selectedSubgroupId);
        if (subMembers.length === 0) {
          Alert.alert('Sous-groupe vide', "Aucun athlète validé n'est présent dans ce sous-groupe.");
          setIsSubmitting(false);
          return;
        }

        const sharedAssignmentId = uuid.v4() as string;
        for (const member of subMembers) {
          const athleteFiltered = sessionExercises.filter((ex) => {
            if (!ex.target || ex.target.type === 'all' || ex.target.type === 'subgroup') return true;
            if (ex.target.type === 'athlete') return ex.target.id === member.user_id;
            return false;
          });

          if (athleteFiltered.length > 0) {
            const mappedExercises = mapExercisesToPayload(athleteFiltered);
            const athletePayload = {
              type_seance: 'Escalier',
              coach_id: user.id,
              team_id: activeTeamId,
              subgroup_id: selectedSubgroupId,
              athlete_id: member.user_id,
              group_assignment_id: sharedAssignmentId,
              date_prevue: targetDateIso,
              description: sessionNotes.trim() ? sessionNotes.trim() : `${athleteFiltered.length} exercice${athleteFiltered.length > 1 ? 's' : ''} d'escalier`,
              exercises: mappedExercises,
              blocks: [
                {
                  id: uuid.v4() as string,
                  name: 'Corps de séance Escalier',
                  type: 'plyo',
                  exercises: mappedExercises,
                },
              ],
              status: 'pending',
            };
            await workoutService.createPlannedWorkout(athletePayload);
          }
        }
      } else {
        const mappedExercises = mapExercisesToPayload(sessionExercises);
        const athletePayload = {
          type_seance: 'Escalier',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId!,
          date_prevue: targetDateIso,
          description: sessionNotes.trim() ? sessionNotes.trim() : `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} d'escalier`,
          exercises: mappedExercises,
          blocks: [
            {
              id: uuid.v4() as string,
              name: 'Corps de séance Escalier',
              type: 'plyo',
              exercises: mappedExercises,
            },
          ],
          status: 'pending',
        };
        await workoutService.createPlannedWorkout(athletePayload);
      }

      // Persist unique exercises to personal library
      await Promise.all(
        sessionExercises.map((ex) =>
          coachExerciseService.saveExercise(user.id, {
            name: ex.name,
            default_stairs: ex.stairs || undefined,
            default_sets: ex.setsCount,
            default_rest_sets: ex.restSets,
            default_rest_exercise: ex.restExercise,
          })
        )
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving stairs workout:', err);
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer la séance. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRestDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins}m${secs}`;
    if (mins > 0) return `${mins} min`;
    return `${secs}s`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerTextBtn}>
            <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Séance Escalier</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSaveWorkout}
            disabled={isSubmitting || sessionExercises.length === 0}
            style={[
              styles.headerSaveBtn,
              {
                backgroundColor: sessionExercises.length > 0 ? theme.colors.accent : theme.colors.border,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerSaveBtnText}>Valider</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Section: CIBLE */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CIBLE DE LA SÉANCE</Text>
          </View>

          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.segmentedControl}>
              {[
                { id: 'team', label: 'Tout le groupe' },
                { id: 'subgroup', label: 'Sous-groupe' },
                { id: 'athlete', label: 'Athlète' },
              ].map((t) => {
                const isSelected = targetType === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.segmentBtn,
                      isSelected && [styles.segmentBtnActive, { backgroundColor: theme.colors.background }],
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTargetType(t.id as any);
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: isSelected ? theme.colors.text : theme.colors.textSecondary },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {targetType === 'subgroup' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                {subgroups.map((sg) => {
                  const isSelected = selectedSubgroupId === sg.id;
                  return (
                    <TouchableOpacity
                      key={sg.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                          borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedSubgroupId(sg.id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                        {sg.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {targetType === 'athlete' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                {approvedMembers.map((m) => {
                  const isSelected = selectedAthleteId === m.user_id;
                  const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                  const name = prof?.full_name?.trim() || 'Athlète';
                  return (
                    <TouchableOpacity
                      key={m.user_id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                          borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedAthleteId(m.user_id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Section: CONSIGNES */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CONSIGNES DE SÉANCE</Text>
          </View>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              style={[
                styles.notesInput,
                { color: theme.colors.text }
              ]}
              placeholder="Ajouter une note ou des consignes pour cette séance..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Section: EXERCICES DE LA SÉANCE */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
              EXERCICES ({sessionExercises.length})
            </Text>
          </View>

          {sessionExercises.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="layers" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun exercice ajouté</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Composez votre séance en ajoutant un premier exercice ci-dessous.
              </Text>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={handleOpenAddSheet}
                  activeOpacity={0.8}
                >
                  <View style={styles.primaryActionIconBox}>
                    <Feather name="plus" size={17} color="#FFFFFF" />
                  </View>
                  <Text style={styles.primaryActionText}>Ajouter un exercice</Text>
                </TouchableOpacity>

                {savedExercises.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryActionBtn,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                    onPress={() => setIsManageLibraryVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.secondaryActionIconBox, { backgroundColor: theme.colors.accent + '15' }]}>
                      <Feather name="bookmark" size={15} color={theme.colors.accent} />
                    </View>
                    <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>
                      Depuis ma bibliothèque
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: theme.colors.accent + '15' }]}>
                      <Text style={[styles.countBadgeText, { color: theme.colors.accent }]}>
                        {savedExercises.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {sessionExercises.map((item, index) => {
                const isLast = index === sessionExercises.length - 1;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.exerciseRow,
                      !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                    ]}
                  >
                    <View style={[styles.badgeNumber, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.badgeNumberText}>{index + 1}</Text>
                    </View>

                    <TouchableOpacity style={styles.exerciseRowCenter} onPress={() => handleStartEdit(item)} activeOpacity={0.7}>
                      <View style={styles.exerciseNameLine}>
                        <Text style={[styles.exerciseRowName, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.target?.type !== 'all' && (
                          <View style={[styles.targetMiniBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Text style={[styles.targetMiniBadgeText, { color: theme.colors.accent }]}>
                              {item.target?.name}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.exerciseRowSubtitle, { color: theme.colors.textSecondary }]}>
                        {item.stairs ? `${item.stairs} marches` : 'Libre'}  •  {item.setsCount} séries  •  Réc. {formatRestDisplay(item.restSets)}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.exerciseRowActions}>
                      <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.iconHit}>
                        <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveExercise(item.id)} style={styles.iconHit}>
                        <Feather name="trash-2" size={15} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Add More Button */}
              <TouchableOpacity
                style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                onPress={handleOpenAddSheet}
                activeOpacity={0.7}
              >
                <View style={[styles.actionRowIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                  <Feather name="plus" size={14} color={theme.colors.accent} />
                </View>
                <Text style={[styles.addMoreRowText, { color: theme.colors.accent }]}>Ajouter un autre exercice</Text>
              </TouchableOpacity>

              {/* Secondary Button: Pick from Library */}
              {savedExercises.length > 0 && (
                <TouchableOpacity
                  style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                  onPress={() => setIsManageLibraryVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionRowIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                    <Feather name="bookmark" size={13} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.addMoreRowText, { color: theme.colors.text }]}>
                    Depuis ma bibliothèque
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: theme.colors.surfaceLight, marginLeft: 'auto' }]}>
                    <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>
                      {savedExercises.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ========================================================================= */}
        {/* SHEET MODAL: ADD / EDIT EXERCISE (Dedicated Apple Form Sheet)             */}
        {/* ========================================================================= */}
        <Modal
          visible={isExerciseSheetVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsExerciseSheetVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
              {/* Sheet Header */}
              <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setIsExerciseSheetVisible(false)} style={styles.headerTextBtn}>
                  <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  {editingId ? "Modifier l'exercice" : 'Nouvel exercice'}
                </Text>

                <View style={{ width: 60 }} />
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Field 1: Name */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>EXERCICE</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={[styles.sheetInput, { color: theme.colors.text }]}
                    placeholder="Nom de l'exercice (ex. Montée 2 par 2)"
                    placeholderTextColor={theme.colors.textMuted}
                    value={exerciseName}
                    onChangeText={setExerciseName}
                    maxLength={40}
                  />
                </View>

                {/* Field 2: Target (Only if session is general team) */}
                {targetType === 'team' && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>ATTRIBUER À</Text>
                    </View>
                    <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <View style={styles.segmentedControl}>
                        {[
                          { id: 'all', label: 'Tout le groupe' },
                          { id: 'subgroup', label: 'Sous-groupe' },
                          { id: 'athlete', label: 'Athlète' },
                        ].map((t) => {
                          const isSelected = exTargetType === t.id;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.segmentBtn,
                                isSelected && [styles.segmentBtnActive, { backgroundColor: theme.colors.background }],
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExTargetType(t.id as any);
                              }}
                            >
                              <Text
                                style={[
                                  styles.segmentBtnText,
                                  { color: isSelected ? theme.colors.text : theme.colors.textSecondary },
                                ]}
                              >
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {exTargetType === 'subgroup' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                          {subgroups.map((sg) => {
                            const isSelected = exTargetSubgroupId === sg.id;
                            return (
                              <TouchableOpacity
                                key={sg.id}
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                                  },
                                ]}
                                onPress={() => setExTargetSubgroupId(sg.id)}
                              >
                                <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                                  {sg.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}

                      {exTargetType === 'athlete' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                          {approvedMembers.map((m) => {
                            const isSelected = exTargetAthleteId === m.user_id;
                            const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                            const name = prof?.full_name?.trim() || 'Athlète';
                            return (
                              <TouchableOpacity
                                key={m.user_id}
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                                  },
                                ]}
                                onPress={() => setExTargetAthleteId(m.user_id)}
                              >
                                <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                                  {name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </>
                )}

                {/* Field 3: Marches & Séries */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>RÉPÉTITIONS & SÉRIES</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {/* Marches Mode Selection */}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Format des répétitions</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {isStairsModeManual ? `${manualStairsText || '0'} marches par série` : 'Libre (sans compter les marches)'}
                      </Text>
                    </View>

                    <View style={styles.stairsModeWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.stairsPillBtn,
                          !isStairsModeManual && [styles.stairsPillActive, { backgroundColor: theme.colors.accent }],
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsStairsModeManual(false);
                          saveStairsMemory(manualStairsText, false, setsCount, restSets, restExercise);
                        }}
                      >
                        <Text style={[styles.stairsPillText, { color: !isStairsModeManual ? '#FFF' : theme.colors.textSecondary }]}>
                          Libre
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.stairsPillBtn,
                          isStairsModeManual && [styles.stairsPillActive, { backgroundColor: theme.colors.accent }],
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsStairsModeManual(true);
                          saveStairsMemory(manualStairsText, true, setsCount, restSets, restExercise);
                        }}
                      >
                        <Text style={[styles.stairsPillText, { color: isStairsModeManual ? '#FFF' : theme.colors.textSecondary }]}>
                          Saisir
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Explicit Input Row when "Saisir" is active */}
                  {isStairsModeManual && (
                    <>
                      <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />
                      <View style={styles.settingRow}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Nombre de marches</Text>
                          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                            Saisir le nombre de marches à monter
                          </Text>
                        </View>
                        <View style={styles.stairsInputContainer}>
                          <TextInput
                            style={[
                              styles.stairsDetailedInput,
                              {
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                              },
                            ]}
                            keyboardType="number-pad"
                            placeholder="20"
                            placeholderTextColor={theme.colors.textMuted}
                            value={manualStairsText}
                            onChangeText={(val) => {
                              setManualStairsText(val);
                              saveStairsMemory(val, true, setsCount, restSets, restExercise);
                            }}
                            maxLength={4}
                          />
                          <Text style={[styles.stairsSuffixText, { color: theme.colors.textSecondary }]}>marches</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Divider */}
                  <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />

                  {/* Séries Stepper Row */}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Nombre de séries</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {setsCount} {setsCount > 1 ? 'séries au total' : 'série'}
                      </Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperActionBtn, { backgroundColor: theme.colors.background }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const next = Math.max(1, setsCount - 1);
                          setSetsCount(next);
                          saveStairsMemory(manualStairsText, isStairsModeManual, next, restSets, restExercise);
                        }}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>

                      <Text style={[styles.stepperNumberText, { color: theme.colors.text }]}>
                        {setsCount}
                      </Text>

                      <TouchableOpacity
                        style={[styles.stepperActionBtn, { backgroundColor: theme.colors.background }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const next = setsCount + 1;
                          setSetsCount(next);
                          saveStairsMemory(manualStairsText, isStairsModeManual, next, restSets, restExercise);
                        }}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Field 4: Temps de Repos */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>RÉCUPÉRATION</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {/* Repos Séries */}
                  <TouchableOpacity style={styles.settingRow} onPress={() => openRestPicker('sets')} activeOpacity={0.6}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Entre les séries</Text>
                    <View style={styles.settingRight}>
                      <Text style={[styles.settingValueText, { color: theme.colors.accent }]}>
                        {formatRestDisplay(restSets)}
                      </Text>
                      <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />

                  {/* Repos Exercice */}
                  <TouchableOpacity style={styles.settingRow} onPress={() => openRestPicker('exercise')} activeOpacity={0.6}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Fin d'exercice</Text>
                    <View style={styles.settingRight}>
                      <Text style={[styles.settingValueText, { color: theme.colors.accent }]}>
                        {formatRestDisplay(restExercise)}
                      </Text>
                      <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Bottom Add Action Button */}
                <TouchableOpacity
                  style={[styles.submitSheetBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={handleSaveExerciseToSession}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitSheetBtnText}>
                    {editingId ? "Mettre à jour l'exercice" : 'Ajouter à la séance'}
                  </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal: Wheel Picker for Rest Time */}
        <RestTimePickerModal
          visible={isRestPickerVisible}
          title={restPickerTarget === 'sets' ? 'Repos entre les séries' : "Repos après l'exercice"}
          initialSeconds={restPickerTarget === 'sets' ? restSets : restExercise}
          onClose={() => setIsRestPickerVisible(false)}
          onConfirm={handleConfirmRestPicker}
        />

        {/* Modal: Manage Coach Library */}
        <Modal
          visible={isManageLibraryVisible}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setIsManageLibraryVisible(false)}
        >
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ma bibliothèque d'escaliers</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsManageLibraryVisible(false);
                  setEditingLibraryEx(null);
                }}
                style={styles.headerTextBtn}
              >
                <Text style={[styles.headerCancelText, { color: theme.colors.accent }]}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {editingLibraryEx && (
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 16 }]}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary, marginBottom: 8 }]}>RENOMMER</Text>
                  <TextInput
                    style={[styles.sheetInput, { color: theme.colors.text, marginBottom: 12 }]}
                    value={editingLibraryName}
                    onChangeText={setEditingLibraryName}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.headerSaveBtn, { backgroundColor: theme.colors.accent, flex: 1 }]}
                      onPress={handleSaveLibraryEdit}
                    >
                      <Text style={styles.headerSaveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.headerSaveBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                      onPress={() => setEditingLibraryEx(null)}
                    >
                      <Text style={[styles.headerSaveBtnText, { color: theme.colors.text }]}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {savedExercises.length === 0 ? (
                <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 }]}>
                  Aucun exercice enregistré dans votre bibliothèque.
                </Text>
              ) : (
                <>
                  <View style={{ marginBottom: 12, marginHorizontal: 4 }}>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' }}>
                      Touchez un exercice pour l'ajouter à votre séance :
                    </Text>
                  </View>
                  <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {savedExercises.map((ex, idx) => {
                      const isLast = idx === savedExercises.length - 1;
                      return (
                        <View
                          key={ex.id}
                          style={[
                            styles.libraryManageRow,
                            !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => {
                              handleSelectFromLibrary(ex);
                              setIsManageLibraryVisible(false);
                              setIsExerciseSheetVisible(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.libraryManageName, { color: theme.colors.text }]}>{ex.name}</Text>
                            <Text style={[styles.libraryManageSub, { color: theme.colors.textSecondary }]}>
                              {ex.default_stairs ? `${ex.default_stairs} marches` : 'Libre'} • {ex.default_sets || 4} séries
                            </Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.libraryPickRowBtn, { backgroundColor: theme.colors.accent + '15' }]}
                              onPress={() => {
                                handleSelectFromLibrary(ex);
                                setIsManageLibraryVisible(false);
                                setIsExerciseSheetVisible(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Feather name="plus" size={13} color={theme.colors.accent} style={{ marginRight: 4 }} />
                              <Text style={[styles.libraryPickRowText, { color: theme.colors.accent }]}>Choisir</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleStartEditLibraryEx(ex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteFromLibrary(ex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Feather name="trash-2" size={16} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  headerTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerSaveSheetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerSaveSheetText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 4,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupedCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subScroll: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 80,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  exerciseRowCenter: {
    flex: 1,
  },
  exerciseNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseRowName: {
    fontSize: 15,
    fontWeight: '700',
  },
  targetMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetMiniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseRowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  exerciseRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  iconHit: {
    padding: 6,
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  addMoreRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickLibraryBox: {
    marginTop: 20,
    marginHorizontal: 4,
  },
  quickLibraryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  libraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  libraryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheetInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValueText: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  stairsModeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stairsPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stairsPillActive: {},
  stairsPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stairsNumberInput: {
    width: 50,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  stairsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stairsDetailedInput: {
    width: 64,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  stairsSuffixText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumberText: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  submitSheetBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  libraryManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libraryManageName: {
    fontSize: 15,
    fontWeight: '700',
  },
  libraryManageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 14,
    width: '100%',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    gap: 8,
  },
  secondaryActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionRowIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  libraryPickRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  libraryPickRowText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
