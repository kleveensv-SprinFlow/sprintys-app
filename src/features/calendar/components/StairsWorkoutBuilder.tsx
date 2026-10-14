import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { coachExerciseService, CoachExercise } from '../../../services/coachExerciseService';
import { RestTimePickerModal } from './RestTimePickerModal';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast, confirmAsync } from '../../../shared/feedback/appAlert';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { TimeField, useSessionTime } from './TimeField';

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
  const sessionTime = useSessionTime(visible, initialWorkout);
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

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

  // Inline validation messages
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);

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

      let exList: any[] = [];
      if (initialWorkout.blocks && Array.isArray(initialWorkout.blocks)) {
        initialWorkout.blocks.forEach((b: any) => {
          if (b.exercises && Array.isArray(b.exercises)) {
            exList.push(...b.exercises);
          }
        });
      } else if (initialWorkout.exercises && Array.isArray(initialWorkout.exercises)) {
        exList = initialWorkout.exercises;
      }

      if (exList.length > 0) {
        const loaded: StairExerciseItem[] = exList.map((ex: any) => ({
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
      setFormError(null);
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
    setNameError(null);
    setSetsError(null);
    // Keep the current manualStairsText, isStairsModeManual, setsCount, restSets, restExercise intact!
    setExTargetType('all');
    setIsExerciseSheetVisible(true);
  };

  // Open Edit Exercise Sheet
  const handleStartEdit = (item: StairExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(item.id);
    setExerciseName(item.name);
    setNameError(null);
    setSetsError(null);
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
    setNameError(null);
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
      setNameError('Indique le nom de l’exercice.');
      return;
    }
    if (setsCount <= 0) {
      setSetsError('Renseigne au moins 1 série.');
      return;
    }
    setNameError(null);
    setSetsError(null);

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
    setFormError(null);

    setIsExerciseSheetVisible(false);
  };

  const handleRemoveExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionExercises((prev) => prev.filter((item) => item.id !== id));
  };

  // Library actions
  const handleDeleteFromLibrary = async (ex: CoachExercise) => {
    const confirmed = await confirmAsync({
      title: 'Supprimer de ma bibliothèque',
      message: `Supprimer « ${ex.name} » de ta bibliothèque d’escaliers ?`,
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await coachExerciseService.deleteExercise(ex.id);
    loadLibrary();
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
      setFormError('Ajoute au moins un exercice avant d’enregistrer.');
      return;
    }

    if (targetType === 'subgroup' && !selectedSubgroupId) {
      setFormError('Choisis un sous-groupe cible.');
      return;
    }

    if (targetType === 'athlete' && !selectedAthleteId) {
      setFormError('Choisis un athlète cible.');
      return;
    }
    setFormError(null);

    if (!user?.id) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;

      // Safe date anchor at midday
      const targetDate = new Date(date);
      targetDate.setTime(sessionTime.applyTo(targetDate, 12).getTime());
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
            id: `${ex.id}_set_${idx}`,
            set_index: idx + 1,
            steps: ex.stairs || undefined,
            reps: ex.stairs || undefined,
            restSeconds: ex.restSets,
            isCompleted: false,
          })),
        }));

      // We NO LONGER delete it here to preserve IDs and efforts!
      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
      const payloadsToUpdate: any[] = [];

      if (targetType === 'team') {
        if (!activeTeamId) {
          appAlert('Erreur', 'Aucune équipe trouvée.');
          setIsSubmitting(false);
          return;
        }

        if (approvedMembers.length === 0) {
          appAlert(
            'Aucun athlète',
            'Aucun athlète validé n’a été trouvé dans ton équipe pour recevoir cette séance.'
          );
          setIsSubmitting(false);
          return;
        }

        const sharedAssignmentId = uuid.v4() as string;

        // --- MASTER COPY FOR COACH ---
        const masterMappedExercises = mapExercisesToPayload(sessionExercises);
        payloadsToUpdate.push({
          type_seance: 'Escalier',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: user.id, // Coach ID
          group_assignment_id: sharedAssignmentId,
          date_prevue: targetDateIso,
          description: sessionNotes.trim() ? sessionNotes.trim() : `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} en escalier`,
          intensity: 8,
          blocks: [
            {
              id: 'stairs_main', // deterministic block ID
              name: 'Escalier',
              exercises: masterMappedExercises,
            },
          ],
          measures: { is_master: true },
          status: 'pending',
        });

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
            payloadsToUpdate.push({
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
            });
          }
        }

        if (payloadsToUpdate.length === 0) {
          appAlert(
            'Information',
            'Aucun athlète ne correspond aux cibles choisies pour les exercices.'
          );
          setIsSubmitting(false);
          return;
        }
        payloadsToUpdate.forEach((p: any) => {
        p.measures = { ...(p.measures || {}), ...sessionTime.flag() };
      });
      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate, initialWorkout?.id);
      } else if (targetType === 'subgroup') {
        const subMembers = approvedMembers.filter((m) => m.subgroup_id === selectedSubgroupId);
        if (subMembers.length === 0) {
          appAlert('Sous-groupe vide', 'Aucun athlète validé n’est présent dans ce sous-groupe.');
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
            payloadsToUpdate.push({
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
            });
          }
        }
        payloadsToUpdate.forEach((p: any) => {
        p.measures = { ...(p.measures || {}), ...sessionTime.flag() };
      });
      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate, initialWorkout?.id);
      } else {
        const mappedExercises = mapExercisesToPayload(sessionExercises);
        payloadsToUpdate.push({
          type_seance: 'Escalier',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId!,
          group_assignment_id: uuid.v4() as string,
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
        });
        payloadsToUpdate.forEach((p: any) => {
        p.measures = { ...(p.measures || {}), ...sessionTime.flag() };
      });
      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate, initialWorkout?.id);
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

      toast('success', 'Séance escalier enregistrée.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving stairs workout:', err);
      appAlert('Erreur', err?.message || 'Impossible d’enregistrer la séance. Réessaie.');
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


  const hasExercises = sessionExercises.length > 0;

  const renderChip = (key: string, label: string, isSelected: boolean, onPress: () => void) => (
    <PressableScale
      key={key}
      haptic="selection"
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.chip, isSelected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipText, { color: isSelected ? theme.colors.sprintyBlue : theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );

  const renderTargetChips = (
    mode: string,
    subgroupId: string | null,
    onSubgroup: (id: string) => void,
    athleteId: string | null,
    onAthlete: (id: string) => void
  ) => {
    if (mode === 'subgroup') {
      if (subgroups.length === 0) return <Text style={styles.emptyHint}>Aucun sous-groupe dans ton équipe.</Text>;
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subScrollContent}>
          {subgroups.map((sg) => renderChip(sg.id, sg.name, subgroupId === sg.id, () => onSubgroup(sg.id)))}
        </ScrollView>
      );
    }
    if (mode === 'athlete') {
      if (approvedMembers.length === 0) return <Text style={styles.emptyHint}>Aucun athlète validé dans ton équipe.</Text>;
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subScrollContent}>
          {approvedMembers.map((m) => {
            const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
            const name = prof?.full_name?.trim() || 'Athlète';
            return renderChip(m.user_id, name, athleteId === m.user_id, () => onAthlete(m.user_id));
          })}
        </ScrollView>
      );
    }
    return null;
  };

  const pickFromLibrary = (ex: CoachExercise) => {
    handleSelectFromLibrary(ex);
    setIsManageLibraryVisible(false);
    setIsExerciseSheetVisible(true);
  };

  const closeLibrary = () => {
    setIsManageLibraryVisible(false);
    setEditingLibraryEx(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.container}>
        {/* Sheet header */}
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <IconButton icon="x" accessibilityLabel="Fermer" onPress={onClose} />

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>Séance escalier</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>

          <PressableScale
            haptic="none"
            onPress={handleSaveWorkout}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.savePill, !hasExercises && styles.savePillDimmed]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Text style={styles.savePillText}>Enregistrer</Text>
            )}
          </PressableScale>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <TimeField time={sessionTime.time} onChange={sessionTime.setTime} />
          {formError && (
            <View style={styles.errorNotice}>
              <Feather name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={styles.errorNoticeText}>{formError}</Text>
            </View>
          )}

          {/* Target */}
          <Text style={[styles.sectionCaption, styles.sectionCaptionFirst]}>Cible de la séance</Text>
          <View style={glassCard}>
            <SegmentedControl
              options={[
                { key: 'team', label: 'Tout le groupe' },
                { key: 'subgroup', label: 'Sous-groupe' },
                { key: 'athlete', label: 'Athlète' },
              ]}
              value={targetType}
              onChange={(k) => {
                setFormError(null);
                setTargetType(k);
              }}
            />
            {renderTargetChips(
              targetType,
              selectedSubgroupId,
              (id) => {
                setFormError(null);
                setSelectedSubgroupId(id);
              },
              selectedAthleteId,
              (id) => {
                setFormError(null);
                setSelectedAthleteId(id);
              }
            )}
          </View>

          {/* Notes */}
          <Text style={styles.sectionCaption}>Consignes de séance</Text>
          <View style={[glassCard, styles.cardFlush]}>
            <TextInput
              style={styles.notesInput}
              placeholder="Ajoute une note ou des consignes pour cette séance…"
              placeholderTextColor={theme.colors.textMuted}
              selectionColor={theme.colors.sprintyBlue}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Exercises */}
          <Text style={styles.sectionCaption}>Exercices ({sessionExercises.length})</Text>

          {!hasExercises ? (
            <View style={[glassCard, styles.emptyCard]}>
              <View style={styles.emptyIconCircle}>
                <Feather name="trending-up" size={22} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.emptyTitle}>Aucun exercice ajouté</Text>
              <Text style={styles.emptySubtitle}>
                Compose ta séance en ajoutant un premier exercice.
              </Text>

              <View style={styles.emptyActions}>
                <Button title="Ajouter un exercice" onPress={handleOpenAddSheet} />

                {savedExercises.length > 0 && (
                  <PressableScale
                    onPress={() => setIsManageLibraryVisible(true)}
                    accessibilityRole="button"
                    style={styles.secondaryActionBtn}
                  >
                    <Feather name="bookmark" size={16} color={theme.colors.sprintyBlue} />
                    <Text style={styles.secondaryActionText}>Depuis ma bibliothèque</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{savedExercises.length}</Text>
                    </View>
                  </PressableScale>
                )}
              </View>
            </View>
          ) : (
            <View style={[glassCard, styles.cardFlush]}>
              {sessionExercises.map((item, index) => (
                <View key={item.id} style={[styles.exerciseRow, index > 0 && styles.rowDividerTop]}>
                  <View style={styles.badgeNumber}>
                    <Text style={styles.badgeNumberText}>{index + 1}</Text>
                  </View>

                  <PressableScale
                    containerStyle={styles.exerciseRowCenter}
                    activeScale={0.98}
                    onPress={() => handleStartEdit(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier ${item.name}`}
                  >
                    <View style={styles.exerciseNameLine}>
                      <Text style={styles.exerciseRowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.target?.type !== 'all' && (
                        <View style={styles.targetMiniBadge}>
                          <Text style={styles.targetMiniBadgeText} numberOfLines={1}>
                            {item.target?.name}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.exerciseRowSubtitle} numberOfLines={1}>
                      {item.stairs ? `${item.stairs} marches` : 'Libre'}  ·  {item.setsCount} séries  ·  Récup. {formatRestDisplay(item.restSets)}
                    </Text>
                  </PressableScale>

                  <View style={styles.exerciseRowActions}>
                    <IconButton
                      icon="edit-2"
                      tone="plain"
                      size={34}
                      accessibilityLabel={`Modifier ${item.name}`}
                      onPress={() => handleStartEdit(item)}
                    />
                    <IconButton
                      icon="trash-2"
                      tone="danger"
                      size={34}
                      accessibilityLabel={`Retirer ${item.name}`}
                      onPress={() => handleRemoveExercise(item.id)}
                    />
                  </View>
                </View>
              ))}

              <PressableScale
                onPress={handleOpenAddSheet}
                activeScale={0.98}
                accessibilityRole="button"
                style={[styles.actionRow, styles.rowDividerTop]}
              >
                <View style={styles.actionRowIconCircle}>
                  <Feather name="plus" size={15} color={theme.colors.sprintyBlue} />
                </View>
                <Text style={[styles.actionRowText, { color: theme.colors.sprintyBlue }]}>Ajouter un autre exercice</Text>
              </PressableScale>

              {savedExercises.length > 0 && (
                <PressableScale
                  onPress={() => setIsManageLibraryVisible(true)}
                  activeScale={0.98}
                  accessibilityRole="button"
                  style={[styles.actionRow, styles.rowDividerTop]}
                >
                  <View style={styles.actionRowIconCircle}>
                    <Feather name="bookmark" size={14} color={theme.colors.sprintyBlue} />
                  </View>
                  <Text style={styles.actionRowText}>Depuis ma bibliothèque</Text>
                  <View style={[styles.countBadge, styles.countBadgeNeutral]}>
                    <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>
                      {savedExercises.length}
                    </Text>
                  </View>
                </PressableScale>
              )}
            </View>
          )}
        </ScrollView>

        {/* ===================================================================== */}
        {/* SHEET: ADD / EDIT EXERCISE                                            */}
        {/* ===================================================================== */}
        <Modal
          visible={isExerciseSheetVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsExerciseSheetVisible(false)}
        >
          <FeedbackHost />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.container}>
              <View style={[styles.header, { paddingTop: safeTop }]}>
                <IconButton icon="x" accessibilityLabel="Fermer" onPress={() => setIsExerciseSheetVisible(false)} />

                <View style={styles.headerCenter}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {editingId ? 'Modifier l’exercice' : 'Nouvel exercice'}
                  </Text>
                </View>

                <PressableScale
                  haptic="none"
                  onPress={handleSaveExerciseToSession}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={styles.savePill}
                >
                  <Text style={styles.savePillText}>{editingId ? 'Valider' : 'Ajouter'}</Text>
                </PressableScale>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                {/* Name */}
                <Text style={[styles.sectionCaption, styles.sectionCaptionFirst]}>Exercice</Text>
                <View style={glassCard}>
                  <Input
                    placeholder="Nom de l’exercice (ex. montée 2 par 2)"
                    value={exerciseName}
                    onChangeText={(v) => {
                      setExerciseName(v);
                      if (nameError) setNameError(null);
                    }}
                    maxLength={40}
                    error={nameError ?? undefined}
                    containerStyle={styles.inputNoMargin}
                  />
                </View>

                {/* Target (only when the session targets the whole team) */}
                {targetType === 'team' && (
                  <>
                    <Text style={styles.sectionCaption}>Attribuer à</Text>
                    <View style={glassCard}>
                      <SegmentedControl
                        options={[
                          { key: 'all', label: 'Tout le groupe' },
                          { key: 'subgroup', label: 'Sous-groupe' },
                          { key: 'athlete', label: 'Athlète' },
                        ]}
                        value={exTargetType}
                        onChange={setExTargetType}
                      />
                      {renderTargetChips(
                        exTargetType,
                        exTargetSubgroupId,
                        setExTargetSubgroupId,
                        exTargetAthleteId,
                        setExTargetAthleteId
                      )}
                    </View>
                  </>
                )}

                {/* Stairs & sets */}
                <Text style={styles.sectionCaption}>Répétitions et séries</Text>
                <View style={[glassCard, styles.cardFlush]}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextCol}>
                      <Text style={styles.settingLabel}>Format des répétitions</Text>
                      <Text style={styles.settingHint}>
                        {isStairsModeManual ? `${manualStairsText || '0'} marches par série` : 'Libre (sans compter les marches)'}
                      </Text>
                    </View>
                    <SegmentedControl
                      style={styles.modeSegmented}
                      options={[
                        { key: 'free', label: 'Libre' },
                        { key: 'manual', label: 'Saisir' },
                      ]}
                      value={isStairsModeManual ? 'manual' : 'free'}
                      onChange={(k) => {
                        const manual = k === 'manual';
                        setIsStairsModeManual(manual);
                        saveStairsMemory(manualStairsText, manual, setsCount, restSets, restExercise);
                      }}
                    />
                  </View>

                  {isStairsModeManual && (
                    <View style={[styles.settingRow, styles.rowDividerTop]}>
                      <View style={styles.settingTextCol}>
                        <Text style={styles.settingLabel}>Nombre de marches</Text>
                        <Text style={styles.settingHint}>Par montée</Text>
                      </View>
                      <View style={styles.stairsInputContainer}>
                        <TextInput
                          style={styles.stairsInput}
                          keyboardType="number-pad"
                          placeholder="20"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                          value={manualStairsText}
                          onChangeText={(val) => {
                            setManualStairsText(val);
                            saveStairsMemory(val, true, setsCount, restSets, restExercise);
                          }}
                          maxLength={4}
                          accessibilityLabel="Nombre de marches"
                        />
                        <Text style={styles.stairsSuffixText}>marches</Text>
                      </View>
                    </View>
                  )}

                  <View style={[styles.settingRow, styles.rowDividerTop]}>
                    <View style={styles.settingTextCol}>
                      <Text style={styles.settingLabel}>Nombre de séries</Text>
                      <Text style={[styles.settingHint, setsError ? { color: theme.colors.error } : null]}>
                        {setsError ?? `${setsCount} ${setsCount > 1 ? 'séries au total' : 'série'}`}
                      </Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <IconButton
                        icon="minus"
                        size={36}
                        accessibilityLabel="Retirer une série"
                        disabled={setsCount <= 1}
                        onPress={() => {
                          const next = Math.max(1, setsCount - 1);
                          setSetsCount(next);
                          saveStairsMemory(manualStairsText, isStairsModeManual, next, restSets, restExercise);
                        }}
                      />
                      <Text style={styles.stepperNumberText}>{setsCount}</Text>
                      <IconButton
                        icon="plus"
                        size={36}
                        accessibilityLabel="Ajouter une série"
                        onPress={() => {
                          const next = setsCount + 1;
                          setSetsCount(next);
                          setSetsError(null);
                          saveStairsMemory(manualStairsText, isStairsModeManual, next, restSets, restExercise);
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Rest */}
                <Text style={styles.sectionCaption}>Récupération</Text>
                <View style={[glassCard, styles.cardFlush]}>
                  <PressableScale
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => openRestPicker('sets')}
                    accessibilityRole="button"
                    style={styles.settingRow}
                  >
                    <Text style={styles.settingLabel}>Entre les séries</Text>
                    <View style={styles.settingRight}>
                      <Text style={styles.settingValueText}>{formatRestDisplay(restSets)}</Text>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </View>
                  </PressableScale>

                  <PressableScale
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => openRestPicker('exercise')}
                    accessibilityRole="button"
                    style={[styles.settingRow, styles.rowDividerTop]}
                  >
                    <Text style={styles.settingLabel}>Fin d’exercice</Text>
                    <View style={styles.settingRight}>
                      <Text style={styles.settingValueText}>{formatRestDisplay(restExercise)}</Text>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </View>
                  </PressableScale>
                </View>

                <Button
                  title={editingId ? 'Mettre à jour l’exercice' : 'Ajouter à la séance'}
                  onPress={handleSaveExerciseToSession}
                  style={styles.submitSheetBtn}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Rest time wheel picker */}
        <RestTimePickerModal
          visible={isRestPickerVisible}
          title={restPickerTarget === 'sets' ? 'Repos entre les séries' : 'Repos après l’exercice'}
          initialSeconds={restPickerTarget === 'sets' ? restSets : restExercise}
          onClose={() => setIsRestPickerVisible(false)}
          onConfirm={handleConfirmRestPicker}
        />

        {/* Coach library */}
        <Modal
          visible={isManageLibraryVisible}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={closeLibrary}
        >
          <FeedbackHost />
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: safeTop }]}>
              <IconButton icon="x" accessibilityLabel="Fermer" onPress={closeLibrary} />
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>Ma bibliothèque</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>Exercices d’escalier</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {editingLibraryEx && (
                <View style={[glassCard, styles.renameCard]}>
                  <Text style={[styles.sectionCaption, styles.sectionCaptionInCard]}>Renommer</Text>
                  <Input
                    value={editingLibraryName}
                    onChangeText={setEditingLibraryName}
                    placeholder="Nom de l’exercice"
                    autoFocus
                    containerStyle={styles.inputNoMargin}
                  />
                  <View style={styles.renameActions}>
                    <Button title="Annuler" variant="outline" onPress={() => setEditingLibraryEx(null)} style={styles.flex1} />
                    <Button
                      title="Enregistrer"
                      onPress={handleSaveLibraryEdit}
                      disabled={!editingLibraryName.trim()}
                      style={styles.flex1}
                    />
                  </View>
                </View>
              )}

              {savedExercises.length === 0 ? (
                <View style={styles.libraryEmpty}>
                  <Feather name="bookmark" size={22} color={theme.colors.textMuted} />
                  <Text style={styles.libraryEmptyText}>Aucun exercice enregistré dans ta bibliothèque.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.libraryIntro}>Touche un exercice pour l’ajouter à ta séance.</Text>
                  <View style={[glassCard, styles.cardFlush]}>
                    {savedExercises.map((ex, idx) => (
                      <View key={ex.id} style={[styles.libraryRow, idx > 0 && styles.rowDividerTop]}>
                        <PressableScale
                          containerStyle={styles.flex1}
                          activeScale={0.98}
                          onPress={() => pickFromLibrary(ex)}
                          accessibilityRole="button"
                          accessibilityLabel={`Choisir ${ex.name}`}
                        >
                          <Text style={styles.libraryName} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.librarySub}>
                            {ex.default_stairs ? `${ex.default_stairs} marches` : 'Libre'}  ·  {ex.default_sets || 4} séries
                          </Text>
                        </PressableScale>

                        <View style={styles.libraryActions}>
                          <PressableScale
                            haptic="selection"
                            onPress={() => pickFromLibrary(ex)}
                            hitSlop={{ top: 6, bottom: 6 }}
                            accessibilityRole="button"
                            style={styles.libraryPickBtn}
                          >
                            <Feather name="plus" size={14} color={theme.colors.sprintyBlue} />
                            <Text style={styles.libraryPickText}>Choisir</Text>
                          </PressableScale>
                          <IconButton
                            icon="edit-2"
                            tone="plain"
                            size={34}
                            accessibilityLabel={`Renommer ${ex.name}`}
                            onPress={() => handleStartEditLibraryEx(ex)}
                          />
                          <IconButton
                            icon="trash-2"
                            tone="danger"
                            size={34}
                            accessibilityLabel={`Supprimer ${ex.name}`}
                            onPress={() => handleDeleteFromLibrary(ex)}
                          />
                        </View>
                      </View>
                    ))}
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
    backgroundColor: theme.colors.backdrop,
  },
  flex1: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: theme.colors.backdrop,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
    color: theme.colors.textSecondary,
  },
  headerSpacer: {
    width: 38,
  },
  savePill: {
    minHeight: 36,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sprintyBlue,
  },
  savePillDimmed: {
    opacity: 0.45,
  },
  savePillText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },

  // Layout
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 56,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCaptionFirst: {
    marginTop: 4,
  },
  sectionCaptionInCard: {
    marginTop: 0,
    marginLeft: 0,
  },
  cardFlush: {
    padding: 0,
  },
  rowDividerTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
  },

  // Target chips
  subScroll: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  subScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: theme.colors.glassFill,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    borderColor: theme.colors.sprintyBlue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Notes
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 96,
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.text,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  emptyActions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 18,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  countBadgeNeutral: {
    marginLeft: 'auto',
    backgroundColor: theme.colors.glassFill,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.sprintyBlue,
  },

  // Exercise list
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    minHeight: 60,
  },
  badgeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.sprintyBlue,
  },
  badgeNumberText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseRowCenter: {
    flex: 1,
    paddingVertical: 4,
  },
  exerciseNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseRowName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  targetMiniBadge: {
    flexShrink: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  targetMiniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  exerciseRowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  exerciseRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 52,
  },
  actionRowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },

  // Exercise sheet settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  settingHint: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValueText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  modeSegmented: {
    width: 140,
  },
  stairsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stairsInput: {
    width: 72,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderCurve: 'continuous',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    backgroundColor: theme.colors.glassFill,
  },
  stairsSuffixText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperNumberText: {
    fontSize: 17,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
    color: theme.colors.text,
  },
  submitSheetBtn: {
    marginTop: 24,
  },

  // Library
  renameCard: {
    marginBottom: 16,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  libraryEmpty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  libraryEmptyText: {
    fontSize: 15,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  libraryIntro: {
    fontSize: 13,
    marginBottom: 10,
    marginHorizontal: 4,
    color: theme.colors.textSecondary,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    minHeight: 60,
  },
  libraryName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  librarySub: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  libraryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  libraryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  libraryPickText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
});
