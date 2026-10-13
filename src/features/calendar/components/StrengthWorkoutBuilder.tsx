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
import { useTheme, theme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { coachExerciseService, CoachExercise } from '../../../services/coachExerciseService';
import { RestTimePickerModal } from './RestTimePickerModal';
import {
  StrengthExerciseSearchModal,
  SelectedStrengthExercise,
} from './StrengthExerciseSearchModal';
import {
  MultiTargetSelectorModal,
  MultiTarget,
} from '../../../shared/components/MultiTargetSelectorModal';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast, confirmAsync } from '../../../shared/feedback/appAlert';
import { glassCard } from '../../../core/glass';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';

export interface StrengthSetItem {
  id: string;
  reps: number;
  weight: number;
}

export interface StrengthExerciseItem {
  id: string;
  catalog_id?: string;
  name: string;
  name_en?: string;
  setsCount: number; // Keeping for legacy/compatibility if needed
  repsCount: number; // Keeping for legacy/compatibility if needed
  weight: number;    // Keeping for legacy/compatibility if needed
  weightType: 'kg' | 'percent_1rm';
  restSets: number; // in seconds
  targets: MultiTarget;
  sets: StrengthSetItem[];
}

interface StrengthWorkoutBuilderProps {
  visible?: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  defaultTitle?: string;
  initialWorkout?: any;
}

// Storage keys for persisting coach's last entered parameters
const STORAGE_STRENGTH_SETS_KEY = '@sprintflow_strength_last_sets';
const STORAGE_STRENGTH_REPS_KEY = '@sprintflow_strength_last_reps';
const STORAGE_STRENGTH_WEIGHT_KEY = '@sprintflow_strength_last_weight';
const STORAGE_STRENGTH_WEIGHT_TYPE_KEY = '@sprintflow_strength_last_weight_type';
const STORAGE_STRENGTH_REST_KEY = '@sprintflow_strength_last_rest';

export const StrengthWorkoutBuilder: React.FC<StrengthWorkoutBuilderProps> = ({
  visible = true,
  date,
  onClose,
  onSave,
  defaultTitle = 'Séance Musculation',
  initialWorkout,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
      : insets.top > 0
      ? insets.top + 6
      : 16;
  const safeBottom = Math.max(insets.bottom, 16);

  const { user } = useAuthStore();
  const {
    teams,
    subgroups,
    teamMembers,
    fetchTeams,
    fetchTeamMembers,
    fetchSubgroups,
  } = useCoachStore();

  // Session-level Target
  const [targetType, setTargetType] = useState<'team'>('team');

  // Session metadata
  const [sessionTitle, setSessionTitle] = useState(defaultTitle);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<StrengthExerciseItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exercise Form Modal State (Add / Edit)
  const [isExerciseSheetVisible, setIsExerciseSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Exercise Form Fields
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseNameEn, setExerciseNameEn] = useState<string | undefined>(undefined);
  const [catalogId, setCatalogId] = useState<string | undefined>(undefined);
  const [setsCount, setSetsCount] = useState<number>(4);
  const [repsCount, setRepsCount] = useState<number>(10);
  const [weightValueText, setWeightValueText] = useState<string>('0');
  const [setsData, setSetsData] = useState<StrengthSetItem[]>([]);
  const [weightType, setWeightType] = useState<'kg' | 'percent_1rm'>('kg');
  const [restSets, setRestSets] = useState<number>(90); // 90s default for strength

  // Exercise Targets
  const [exTargets, setExTargets] = useState<MultiTarget>({ subgroups: [], athletes: [] });
  const [isMultiTargetModalVisible, setIsMultiTargetModalVisible] = useState(false);

  // Exercise Search Modal
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  // Rest Picker Modal
  const [isRestPickerVisible, setIsRestPickerVisible] = useState(false);

  // Coach Personal Library State
  const [coachSavedExercises, setCoachSavedExercises] = useState<CoachExercise[]>([]);
  const [isManageLibraryVisible, setIsManageLibraryVisible] = useState(false);
  const [editingLibraryEx, setEditingLibraryEx] = useState<CoachExercise | null>(null);
  const [editingLibraryName, setEditingLibraryName] = useState('');

  // Inline validation messages (shown under the related field instead of popups)
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [exerciseNameError, setExerciseNameError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [libraryNameError, setLibraryNameError] = useState<string | null>(null);

  const resetSheetErrors = () => {
    setExerciseNameError(null);
    setSetsError(null);
  };

  const activeTeam = teams[0];
  const approvedMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'approved'),
    [teamMembers]
  );

  // Initial load
  useEffect(() => {
    if (visible && user?.id) {
      if (teams.length === 0) {
        fetchTeams();
      }
      loadLibrary();
      loadStrengthMemory();
    }
  }, [visible, user?.id, teams.length]);

  // Handle editing mode when initialWorkout is passed
  useEffect(() => {
    if (visible && initialWorkout) {
      if (initialWorkout.type_seance) {
        setSessionTitle(initialWorkout.type_seance);
      }
      setSessionNotes(initialWorkout.description || '');
      setTargetType('team');

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
        const loaded: StrengthExerciseItem[] = exList.map((ex: any) => {
          const loadedSetsCount = ex.sets?.length || ex.sets_count || 4;
          const defaultReps = ex.sets?.[0]?.reps || ex.reps_count || 10;
          const defaultWeight = ex.sets?.[0]?.weight || ex.weight || 0;
          
          let parsedSets: StrengthSetItem[] = [];
          if (ex.sets && Array.isArray(ex.sets) && ex.sets.length > 0) {
            parsedSets = ex.sets.map((s: any) => ({
              id: String(uuid.v4()),
              reps: s.reps || defaultReps,
              weight: s.weight || defaultWeight,
            }));
          } else {
            parsedSets = Array.from({ length: loadedSetsCount }).map(() => ({
              id: String(uuid.v4()),
              reps: defaultReps,
              weight: defaultWeight,
            }));
          }

          return {
            id: ex.id || String(uuid.v4()),
            catalog_id: ex.catalog_id,
            name: ex.name,
            name_en: ex.name_en,
            setsCount: loadedSetsCount,
            repsCount: defaultReps,
            weight: defaultWeight,
            weightType: ex.sets?.[0]?.weight_type || ex.sets?.[0]?.weightType || ex.weight_type || 'kg',
            restSets: ex.sets?.[0]?.restSeconds || ex.rest_between_sets_s || 90,
            targets: ex.targets || { subgroups: [], athletes: [] },
            sets: parsedSets,
          };
        });
        setSessionExercises(loaded);
      }
    } else if (visible && !initialWorkout) {
      setSessionNotes('');
      setSessionExercises([]);
      setTargetType('team');
    }
  }, [visible, initialWorkout]);

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

  const getTargetsLabel = (targets?: { subgroups: string[]; athletes: string[] }) => {
    if (!targets) return null;
    const names: string[] = [];
    
    // Subgroups
    targets.subgroups?.forEach((id) => {
      const sg = subgroups.find((s) => s.id === id);
      if (sg?.name) names.push(sg.name);
    });

    // Athletes
    targets.athletes?.forEach((id) => {
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

  const loadLibrary = async () => {
    if (!user?.id) return;
    try {
      const list = await coachExerciseService.fetchExercises(user.id, 'musculation');
      setCoachSavedExercises(list || []);
    } catch (e) {
      console.warn('Erreur chargement bibliothèque musculation:', e);
    }
  };

  // Load last used settings from AsyncStorage
  const loadStrengthMemory = async () => {
    try {
      const [savedSets, savedReps, savedWeight, savedWeightType, savedRest] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STRENGTH_SETS_KEY),
        AsyncStorage.getItem(STORAGE_STRENGTH_REPS_KEY),
        AsyncStorage.getItem(STORAGE_STRENGTH_WEIGHT_KEY),
        AsyncStorage.getItem(STORAGE_STRENGTH_WEIGHT_TYPE_KEY),
        AsyncStorage.getItem(STORAGE_STRENGTH_REST_KEY),
      ]);

      if (savedSets !== null) {
        const parsed = parseInt(savedSets, 10);
        if (!isNaN(parsed) && parsed > 0) setSetsCount(parsed);
      }
      if (savedReps !== null) {
        const parsed = parseInt(savedReps, 10);
        if (!isNaN(parsed) && parsed > 0) setRepsCount(parsed);
      }
      if (savedWeight !== null) {
        setWeightValueText(savedWeight);
      }
      if (savedWeightType === 'percent_1rm' || savedWeightType === 'kg') {
        setWeightType(savedWeightType);
      }
      if (savedRest !== null) {
        const parsed = parseInt(savedRest, 10);
        if (!isNaN(parsed) && parsed > 0) setRestSets(parsed);
      }
    } catch (e) {
      console.warn('Could not load strength memory', e);
    }
  };

  // Save current settings to AsyncStorage
  const saveStrengthMemory = async (
    sets: number,
    reps: number,
    weight: string,
    wType: 'kg' | 'percent_1rm',
    rest: number
  ) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_STRENGTH_SETS_KEY, String(sets)),
        AsyncStorage.setItem(STORAGE_STRENGTH_REPS_KEY, String(reps)),
        AsyncStorage.setItem(STORAGE_STRENGTH_WEIGHT_KEY, weight),
        AsyncStorage.setItem(STORAGE_STRENGTH_WEIGHT_TYPE_KEY, wType),
        AsyncStorage.setItem(STORAGE_STRENGTH_REST_KEY, String(rest)),
      ]);
    } catch (e) {
      console.warn('Could not save strength memory', e);
    }
  };

  // Format rest time in seconds into clean readable string
  const formatRestDisplay = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m${secs}` : `${mins} min`;
  };

  // Format weight display
  const formatWeightDisplay = (weight: number, wType: 'kg' | 'percent_1rm'): string => {
    if (!weight || weight === 0) {
      return wType === 'percent_1rm' ? '0% 1RM' : 'PDC (0 kg)';
    }
    return wType === 'percent_1rm' ? `${weight}% 1RM` : `${weight} kg`;
  };

  // Open "Ajouter un exercice" sheet
  const handleOpenAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetSheetErrors();
    setEditingId(null);
    setExerciseName('');
    setExerciseNameEn(undefined);
    setCatalogId(undefined);
    setExTargets({ subgroups: [], athletes: [] });
    const parsedWeight = parseFloat(weightValueText.replace(',', '.')) || 0;
    const initialSets = Array.from({ length: setsCount }).map(() => ({
      id: String(uuid.v4()),
      reps: repsCount,
      weight: parsedWeight,
    }));
    setSetsData(initialSets);
    setIsExerciseSheetVisible(true);
  };

  const handleStartEdit = (item: StrengthExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetSheetErrors();
    setEditingId(item.id);
    setExerciseName(item.name);
    setExerciseNameEn(item.name_en);
    setCatalogId(item.catalog_id);
    setSetsCount(item.setsCount);
    setRepsCount(item.repsCount);
    setWeightValueText(String(item.weight || 0));
    setWeightType(item.weightType);
    setRestSets(item.restSets);
    setExTargets(item.targets || { subgroups: [], athletes: [] });
    
    if (item.sets && item.sets.length > 0) {
      setSetsData([...item.sets]);
    } else {
      const initialSets = Array.from({ length: item.setsCount }).map(() => ({
        id: String(uuid.v4()),
        reps: item.repsCount,
        weight: item.weight || 0,
      }));
      setSetsData(initialSets);
    }
    
    setIsExerciseSheetVisible(true);
  };

  // Select exercise from search modal
  const handleExerciseSelected = (ex: SelectedStrengthExercise) => {
    setExerciseName(ex.name);
    setExerciseNameEn(ex.name_en);
    setCatalogId(ex.id);
    setExerciseNameError(null);
    // Reload library in case a new custom exercise was created
    if (ex.is_custom) {
      loadLibrary();
    }
  };

  // Select quick chip from coach library
  const handleSelectFromLibraryChip = (ex: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetSheetErrors();
    setEditingId(null);
    setExerciseName(ex.name);
    setExerciseNameEn(undefined);
    setCatalogId(undefined);
    const targetSets = ex.default_sets || setsCount;
    const targetReps = ex.default_reps || repsCount;
    const targetWeight = ex.default_weight !== undefined ? String(ex.default_weight) : weightValueText;
    const targetWeightType = (ex.default_weight_type as any) || weightType;
    const targetRest = ex.default_rest_sets || restSets;

    setSetsCount(targetSets);
    setRepsCount(targetReps);
    setWeightValueText(targetWeight);
    setWeightType(targetWeightType);
    setRestSets(targetRest);
    setExTargets({ subgroups: [], athletes: [] });
    
    const parsedWeight = parseFloat(targetWeight.replace(',', '.')) || 0;
    const initialSets = Array.from({ length: targetSets }).map(() => ({
      id: String(uuid.v4()),
      reps: targetReps,
      weight: parsedWeight,
    }));
    setSetsData(initialSets);
    
    setIsExerciseSheetVisible(true);
  };

  // Save exercise to current session
  const handleSaveExerciseToSession = () => {
    const trimmed = exerciseName.trim();
    const nameError = trimmed ? null : 'Choisis un exercice dans la base ou crée le tien.';
    const setsMissing = setsData.length === 0 ? 'Ajoute au moins une série.' : null;
    setExerciseNameError(nameError);
    setSetsError(setsMissing);
    if (nameError || setsMissing) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Update counts from setsData
    const updatedSetsCount = setsData.length;
    const updatedRepsCount = setsData.length > 0 ? setsData[0].reps : 0;
    const updatedWeight = setsData.length > 0 ? setsData[0].weight : 0;

    // Persist all values in AsyncStorage for instant pre-fill on next exercise
    saveStrengthMemory(updatedSetsCount, updatedRepsCount, String(updatedWeight), weightType, restSets);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editingId) {
      // Edit existing exercise
      setSessionExercises((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: trimmed,
                name_en: exerciseNameEn,
                catalog_id: catalogId,
                setsCount: updatedSetsCount,
                repsCount: updatedRepsCount,
                weight: updatedWeight,
                weightType,
                restSets,
                targets: exTargets,
                sets: setsData,
              }
            : item
        )
      );
    } else {
      // Add new exercise
      const newEx: StrengthExerciseItem = {
        id: uuid.v4() as string,
        catalog_id: catalogId,
        name: trimmed,
        name_en: exerciseNameEn,
        setsCount: updatedSetsCount,
        repsCount: updatedRepsCount,
        weight: updatedWeight,
        weightType,
        restSets,
        targets: exTargets,
        sets: setsData,
      };
      setSessionExercises((prev) => [...prev, newEx]);
    }
    setSessionError(null);

    setIsExerciseSheetVisible(false);
  };

  // Reorder exercises
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sessionExercises.length - 1)) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...sessionExercises];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIdx]] = [updated[targetIdx], updated[index]];
    setSessionExercises(updated);
  };

  // Delete exercise from session
  const handleRemoveExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionExercises((prev) => prev.filter((item) => item.id !== id));
  };

  // Coach Library Actions
  const handleDeleteFromLibrary = async (ex: CoachExercise) => {
    const confirmed = await confirmAsync({
      title: 'Supprimer de ta bibliothèque ?',
      message: `« ${ex.name} » sera retiré de ta bibliothèque de musculation.`,
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
    setLibraryNameError(null);
  };

  const handleSaveLibraryEdit = async () => {
    if (!editingLibraryEx) return;
    if (!editingLibraryName.trim()) {
      setLibraryNameError('Donne un nom à cet exercice.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await coachExerciseService.updateExercise(editingLibraryEx.id, {
      name: editingLibraryName.trim(),
    });
    setEditingLibraryEx(null);
    setEditingLibraryName('');
    loadLibrary();
  };

  // Submit and assign workout to Supabase
  const handleSaveWorkout = async () => {
    if (sessionExercises.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSessionError('Ajoute au moins un exercice avant d’enregistrer.');
      return;
    }
    setSessionError(null);

    if (!user?.id) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;

      // Midday date anchor to avoid timezone offsets
      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0);
      const targetDateIso = targetDate.toISOString();

      const mapExercisesToPayload = (list: StrengthExerciseItem[]) =>
        list.map((ex) => ({
          id: ex.id,
          catalog_id: ex.catalog_id,
          name: ex.name,
          name_en: ex.name_en,
          category: 'musculation',
          sets_count: ex.sets.length,
          reps_count: ex.sets.length > 0 ? ex.sets[0].reps : 0,
          weight: ex.sets.length > 0 ? ex.sets[0].weight : 0,
          weight_type: ex.weightType,
          weightType: ex.weightType,
          rest_between_sets_s: ex.restSets,
          targets: ex.targets,
          sets: ex.sets.map((s, idx) => ({
            id: s.id || `${ex.id}_set_${idx}`,
            set_index: idx + 1,
            reps: s.reps,
            weight: s.weight || undefined,
            weight_type: ex.weightType,
            weightType: ex.weightType,
            restSeconds: ex.restSets,
            isCompleted: false,
          })),
        }));

      // If we are editing an existing workout, we NO LONGER delete it.
      // We will use smartUpdateWorkouts to preserve IDs and efforts!
      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
      const payloadsToUpdate: any[] = [];

      if (!activeTeamId) {
        appAlert('Aucune équipe', 'Crée ou rejoins une équipe pour programmer cette séance.');
        setIsSubmitting(false);
        return;
      }

      if (approvedMembers.length === 0) {
        appAlert(
          'Aucun athlète',
          'Aucun athlète validé dans ton équipe ne peut recevoir cette séance.'
        );
        setIsSubmitting(false);
        return;
      }

      const sharedAssignmentId = uuid.v4() as string;

      // --- MASTER COPY FOR COACH ---
      const masterMappedExercises = mapExercisesToPayload(sessionExercises);
      payloadsToUpdate.push({
        type_seance: sessionTitle.trim() || 'Musculation',
        coach_id: user.id,
        team_id: activeTeamId,
        athlete_id: user.id, // Coach acts as athlete
        group_assignment_id: sharedAssignmentId,
        date_prevue: targetDateIso,
        description: sessionNotes.trim() ? sessionNotes.trim() : `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} de musculation`,
        intensity: 7,
        blocks: [
          {
            id: 'strength_main', // deterministic
            name: 'Musculation',
            exercises: masterMappedExercises,
          },
        ],
        measures: { is_master: true },
        status: 'pending',
      });

      // Filter per athlete so they only receive the exercises assigned to them
      for (const member of approvedMembers) {
        const athleteFiltered = sessionExercises.filter((ex) => {
          const t = ex.targets;
          if (!t || (t.subgroups.length === 0 && t.athletes.length === 0)) return true; // all
          if (t.subgroups.includes(member.subgroup_id || '')) return true;
          if (t.athletes.includes(member.user_id)) return true;
          return false;
        });

        if (athleteFiltered.length > 0) {
          const mappedExercises = mapExercisesToPayload(athleteFiltered);
          payloadsToUpdate.push({
            type_seance: sessionTitle.trim() || 'Musculation',
            coach_id: user.id,
            team_id: activeTeamId,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: sessionNotes.trim() ? sessionNotes.trim() : `${athleteFiltered.length} exercice${athleteFiltered.length > 1 ? 's' : ''} de musculation`,
            intensity: 7,
            blocks: [
              {
                id: uuid.v4(),
                name: 'Musculation',
                exercises: mappedExercises,
              },
            ],
            status: 'pending',
          });
        }
      }

      if (payloadsToUpdate.length === 0) {
        appAlert('Attention', 'Aucun athlète ne correspond aux ciblages choisis.');
        setIsSubmitting(false);
        return;
      }

      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The first payload is the coach's master copy
      const athleteCount = payloadsToUpdate.length - 1;
      toast(
        'success',
        `Programmée pour ${athleteCount} athlète${athleteCount > 1 ? 's' : ''} de ton équipe.`,
        'Séance enregistrée'
      );

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement musculation:', err);
      appAlert(
        'Erreur',
        err.message || 'Impossible d’enregistrer la séance. Réessaie dans un instant.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  // Immutable updates of the sets table (never mutate objects shared with saved exercises)
  const updateSetAt = (idx: number, patch: Partial<StrengthSetItem>) => {
    setSetsData((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleRemoveSetAt = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSetsData((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSet = () => {
    const lastSet = setsData[setsData.length - 1];
    setSetsData([
      ...setsData,
      {
        id: String(uuid.v4()),
        reps: lastSet ? lastSet.reps : 10,
        weight: lastSet ? lastSet.weight : 0,
      },
    ]);
    setSetsError(null);
  };

  const closeLibrary = () => {
    setIsManageLibraryVisible(false);
    setEditingLibraryEx(null);
    setLibraryNameError(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.container}>
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />

          <View style={styles.headerTitleContainer}>
            <TextInput
              style={styles.headerTitleInput}
              value={sessionTitle}
              onChangeText={setSessionTitle}
              placeholder="Séance Musculation"
              placeholderTextColor={theme.colors.textMuted}
              selectionColor={theme.colors.sprintyBlue}
              maxLength={35}
              accessibilityLabel="Titre de la séance"
            />
          </View>

          <PressableScale
            haptic="none"
            onPress={handleSaveWorkout}
            disabled={isSubmitting}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer la séance"
            style={[styles.headerPill, isSubmitting && styles.headerPillBusy]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Text style={styles.headerPillText}>Enregistrer</Text>
            )}
          </PressableScale>
        </View>

        {/* ========================================================================= */}
        {/* MAIN SCROLL VIEW                                                          */}
        {/* ========================================================================= */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* SECTION: CONSIGNES DE SÉANCE */}
          <Text style={[styles.sectionCaption, styles.sectionHeader]}>Consignes de séance</Text>
          <View style={[styles.card, styles.notesCard]}>
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

          {/* SECTION: LISTE DES EXERCICES DE LA SÉANCE */}
          <Text style={[styles.sectionCaption, styles.sectionHeader]}>
            Exercices de la séance ({sessionExercises.length})
          </Text>

          {sessionExercises.length === 0 ? (
            <View style={[styles.card, styles.emptyCard, !!sessionError && styles.cardError]}>
              <EmptyState
                compact
                icon="activity"
                title="Ta séance est vide"
                message="Pioche dans la base d’exercices ou dans ta bibliothèque pour composer ta séance."
              />
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {sessionExercises.map((item, index) => {
                const targetLabel = getTargetsLabel(item.targets);
                const isFirst = index === 0;
                const isLast = index === sessionExercises.length - 1;
                return (
                  <View key={item.id} style={[styles.card, styles.exerciseCard]}>
                    <PressableScale
                      haptic="none"
                      activeScale={0.98}
                      onPress={() => handleStartEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${item.name}`}
                      style={styles.exerciseCardHeader}
                    >
                      <View style={styles.indexCircle}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.exerciseName}>{item.name}</Text>
                        {!!item.name_en && <Text style={styles.exerciseNameEn}>{item.name_en}</Text>}
                      </View>

                      {/* Target tag if specific */}
                      {!!targetLabel && (
                        <View style={styles.targetBadge}>
                          <Feather name="users" size={11} color={theme.colors.sprintyBlue} style={{ marginRight: 4 }} />
                          <Text style={styles.targetBadgeText} numberOfLines={1}>
                            {targetLabel}
                          </Text>
                        </View>
                      )}
                    </PressableScale>

                    {/* Summary details row */}
                    <View style={styles.exerciseSummaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Séries</Text>
                        <Text style={styles.summaryValue}>{item.setsCount}</Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Reps</Text>
                        <Text style={styles.summaryValue}>{item.repsCount}</Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Charge</Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.sprintyBlue }]} numberOfLines={1}>
                          {formatWeightDisplay(item.weight, item.weightType)}
                        </Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Repos</Text>
                        <Text style={styles.summaryValue}>{formatRestDisplay(item.restSets)}</Text>
                      </View>
                    </View>

                    {/* Card Actions */}
                    <View style={styles.exerciseActionsRow}>
                      <View style={styles.actionsGroup}>
                        <IconButton
                          icon="chevron-up"
                          tone="plain"
                          size={34}
                          color={theme.colors.text}
                          disabled={isFirst}
                          onPress={() => handleMoveExercise(index, 'up')}
                          accessibilityLabel="Monter l’exercice"
                        />
                        <IconButton
                          icon="chevron-down"
                          tone="plain"
                          size={34}
                          color={theme.colors.text}
                          disabled={isLast}
                          onPress={() => handleMoveExercise(index, 'down')}
                          accessibilityLabel="Descendre l’exercice"
                        />
                      </View>

                      <View style={styles.actionsGroup}>
                        <IconButton
                          icon="edit-2"
                          size={34}
                          onPress={() => handleStartEdit(item)}
                          accessibilityLabel={`Modifier ${item.name}`}
                        />
                        <IconButton
                          icon="trash-2"
                          tone="danger"
                          size={34}
                          onPress={() => handleRemoveExercise(item.id)}
                          accessibilityLabel={`Retirer ${item.name}`}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!!sessionError && (
            <View style={styles.errorNotice}>
              <Feather name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={styles.errorNoticeText}>{sessionError}</Text>
            </View>
          )}

          {/* ACTION BUTTONS GROUP */}
          <View style={styles.actionButtonsContainer}>
            {/* BOUTON PRINCIPAL : AJOUTER UN EXERCICE */}
            <PressableScale
              haptic="none"
              style={styles.primaryActionBtn}
              onPress={handleOpenAddSheet}
              accessibilityRole="button"
            >
              <View style={styles.primaryActionIconBox}>
                <Feather name="plus" size={17} color={theme.colors.surface} />
              </View>
              <Text style={styles.primaryActionText}>Ajouter un exercice</Text>
            </PressableScale>

            {/* BOUTON SECONDAIRE : CHOISIR DEPUIS LA BIBLIOTHÈQUE */}
            {coachSavedExercises.length > 0 && (
              <PressableScale
                haptic="light"
                style={[styles.card, styles.secondaryActionBtn]}
                onPress={() => setIsManageLibraryVisible(true)}
                accessibilityRole="button"
              >
                <View style={styles.secondaryActionIconBox}>
                  <Feather name="bookmark" size={15} color={theme.colors.sprintyBlue} />
                </View>
                <Text style={styles.secondaryActionText}>Depuis ma bibliothèque</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{coachSavedExercises.length}</Text>
                </View>
              </PressableScale>
            )}
          </View>
        </ScrollView>

        {/* ========================================================================= */}
        {/* SHEET MODAL: ADD / EDIT EXERCISE                                          */}
        {/* ========================================================================= */}
        <Modal
          visible={isExerciseSheetVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsExerciseSheetVisible(false)}
        >
          <FeedbackHost />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
              {/* Sheet Header */}
              <View style={[styles.header, { paddingTop: safeTop }]}>
                <IconButton icon="x" onPress={() => setIsExerciseSheetVisible(false)} accessibilityLabel="Fermer" />

                <Text style={styles.headerTitle} numberOfLines={1}>
                  {editingId ? 'Modifier l’exercice' : 'Nouvel exercice'}
                </Text>

                <PressableScale
                  haptic="none"
                  onPress={handleSaveExerciseToSession}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={editingId ? 'Valider l’exercice' : 'Ajouter l’exercice à la séance'}
                  style={styles.headerPill}
                >
                  <Text style={styles.headerPillText}>{editingId ? 'Valider' : 'Ajouter'}</Text>
                </PressableScale>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                {/* Field 1: Nom de l'exercice / Sélecteur Catalogue */}
                <Text style={[styles.sectionCaption, styles.sectionHeader]}>Exercice</Text>
                <PressableScale
                  haptic="selection"
                  activeScale={0.98}
                  style={[styles.card, styles.exerciseSelectorRow, !!exerciseNameError && styles.cardError]}
                  onPress={() => setIsSearchModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel={exerciseName ? `Exercice : ${exerciseName}. Changer` : 'Choisir un exercice'}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={[
                        styles.selectorMainText,
                        { color: exerciseName ? theme.colors.text : theme.colors.textMuted },
                      ]}
                    >
                      {exerciseName || 'Choisis dans la base d’exercices…'}
                    </Text>
                    {!!exerciseNameEn && <Text style={styles.selectorSubText}>{exerciseNameEn}</Text>}
                  </View>
                  <View style={styles.searchPill}>
                    <Feather name="search" size={14} color={theme.colors.sprintyBlue} style={{ marginRight: 4 }} />
                    <Text style={styles.searchPillText}>{exerciseName ? 'Changer' : 'Choisir'}</Text>
                  </View>
                </PressableScale>
                {!!exerciseNameError && <Text style={styles.fieldError}>{exerciseNameError}</Text>}

                {/* Field 2: Cible (Optionnel) */}
                <Text style={[styles.sectionCaption, styles.sectionHeader]}>Cible (optionnel)</Text>
                <PressableScale
                  haptic="selection"
                  activeScale={0.98}
                  style={[styles.card, styles.settingRow]}
                  onPress={() => setIsMultiTargetModalVisible(true)}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Cibler cet exercice</Text>
                    <Text style={styles.settingHint}>
                      {exTargets.subgroups.length === 0 && exTargets.athletes.length === 0
                        ? 'Tout le groupe'
                        : `${exTargets.subgroups.length} sous-groupe${exTargets.subgroups.length > 1 ? 's' : ''}, ${exTargets.athletes.length} athlète${exTargets.athletes.length > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                </PressableScale>

                {/* Field 3: Séries, Répétitions & Charge (Tableur) */}
                <Text style={[styles.sectionCaption, styles.sectionHeader]}>Séries, répétitions et charge</Text>
                <View style={[styles.card, styles.tableCard, !!setsError && styles.cardError]}>
                  {/* Mode de charge toggle at top */}
                  <View style={styles.tableTopRow}>
                    <Text style={styles.settingLabel}>Format de la charge</Text>
                    <SegmentedControl
                      options={[
                        { key: 'kg', label: 'kg' },
                        { key: 'percent_1rm', label: '% 1RM' },
                      ]}
                      value={weightType}
                      onChange={setWeightType}
                      style={styles.weightTypeSegment}
                    />
                  </View>

                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Série</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Reps</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>{weightType === 'kg' ? 'kg' : '% 1RM'}</Text>
                    <View style={{ width: 36 }} />
                  </View>

                  {/* Table Rows */}
                  {setsData.map((set, idx) => (
                    <View key={set.id} style={[styles.tableRow, idx < setsData.length - 1 && styles.rowBorder]}>
                      <View style={{ flex: 0.5, alignItems: 'center' }}>
                        <View style={styles.setIndexBubble}>
                          <Text style={styles.setIndexText}>{idx + 1}</Text>
                        </View>
                      </View>
                      <View style={styles.tableCell}>
                        <TextInput
                          style={styles.tableInput}
                          keyboardType="number-pad"
                          value={String(set.reps || '')}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                          accessibilityLabel={`Répétitions de la série ${idx + 1}`}
                          onChangeText={(val) => updateSetAt(idx, { reps: parseInt(val) || 0 })}
                        />
                      </View>
                      <View style={styles.tableCell}>
                        <TextInput
                          style={styles.tableInput}
                          keyboardType="decimal-pad"
                          value={set.weight ? String(set.weight) : ''}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                          accessibilityLabel={`Charge de la série ${idx + 1}`}
                          onChangeText={(val) => updateSetAt(idx, { weight: parseFloat(val.replace(',', '.')) || 0 })}
                        />
                      </View>
                      <IconButton
                        icon="x"
                        tone="plain"
                        size={32}
                        color={theme.colors.textMuted}
                        onPress={() => handleRemoveSetAt(idx)}
                        accessibilityLabel={`Supprimer la série ${idx + 1}`}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  ))}

                  {/* Add Row Button */}
                  <PressableScale
                    haptic="light"
                    activeScale={0.98}
                    style={[styles.addSetBtn, setsData.length > 0 && styles.addSetBtnBorder]}
                    onPress={handleAddSet}
                    accessibilityRole="button"
                  >
                    <Feather name="plus" size={16} color={theme.colors.sprintyBlue} />
                    <Text style={styles.addSetText}>Ajouter une série</Text>
                  </PressableScale>
                </View>
                {!!setsError && <Text style={styles.fieldError}>{setsError}</Text>}

                {/* Field 5: Temps de Repos */}
                <Text style={[styles.sectionCaption, styles.sectionHeader]}>Récupération</Text>
                <PressableScale
                  haptic="none"
                  activeScale={0.98}
                  style={[styles.card, styles.settingRow]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsRestPickerVisible(true);
                  }}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Repos entre les séries</Text>
                    <Text style={styles.settingHint}>Temps de récupération entre chaque série</Text>
                  </View>
                  <View style={styles.settingRight}>
                    <Text style={styles.settingValueText}>{formatRestDisplay(restSets)}</Text>
                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </View>
                </PressableScale>

                {/* Bottom action, mirrors the header pill for long tables */}
                <Button
                  title={editingId ? 'Mettre à jour l’exercice' : 'Ajouter à la séance'}
                  onPress={handleSaveExerciseToSession}
                  style={styles.submitSheetBtn}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal: Wheel Picker for Rest Time */}
        <RestTimePickerModal
          visible={isRestPickerVisible}
          title="Repos entre les séries"
          initialSeconds={restSets}
          onClose={() => setIsRestPickerVisible(false)}
          onConfirm={(seconds) => {
            setRestSets(seconds);
            saveStrengthMemory(setsCount, repsCount, weightValueText, weightType, seconds);
          }}
        />

        {/* Modal: Search Catalog & Create Custom Exercise */}
        <StrengthExerciseSearchModal
          visible={isSearchModalVisible}
          onClose={() => setIsSearchModalVisible(false)}
          onSelect={handleExerciseSelected}
        />

        {/* Modal: Manage Coach Library */}
        <Modal
          visible={isManageLibraryVisible}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={closeLibrary}
        >
          <FeedbackHost />
          <View style={styles.container}>
            <View style={[styles.header, { paddingTop: safeTop }]}>
              <IconButton icon="x" onPress={closeLibrary} accessibilityLabel="Fermer" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Ma bibliothèque
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottom + 24 }]}
              keyboardShouldPersistTaps="handled"
            >
              {editingLibraryEx && (
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Input
                    label="Renommer l’exercice"
                    value={editingLibraryName}
                    onChangeText={(t) => {
                      setEditingLibraryName(t);
                      if (libraryNameError) setLibraryNameError(null);
                    }}
                    error={libraryNameError || undefined}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveLibraryEdit}
                    containerStyle={{ marginBottom: 12 }}
                  />
                  <View style={styles.renameActions}>
                    <Button
                      title="Annuler"
                      variant="secondary"
                      onPress={() => {
                        setEditingLibraryEx(null);
                        setLibraryNameError(null);
                      }}
                      style={styles.renameBtn}
                    />
                    <Button title="Enregistrer" onPress={handleSaveLibraryEdit} style={styles.renameBtn} />
                  </View>
                </View>
              )}

              {coachSavedExercises.length === 0 ? (
                <EmptyState
                  icon="bookmark"
                  title="Ta bibliothèque est vide"
                  message="Crée un exercice depuis la recherche pour le retrouver ici."
                />
              ) : (
                <>
                  <Text style={[styles.sectionCaption, styles.sectionHeader]}>
                    Touche un exercice pour l’ajouter
                  </Text>
                  <View style={[styles.card, styles.listCard]}>
                    {coachSavedExercises.map((ex, idx) => {
                      const isLast = idx === coachSavedExercises.length - 1;
                      const pick = () => {
                        handleSelectFromLibraryChip(ex);
                        setIsManageLibraryVisible(false);
                      };
                      return (
                        <View key={ex.id} style={[styles.libraryManageRow, !isLast && styles.rowBorder]}>
                          <PressableScale
                            haptic="none"
                            activeScale={0.98}
                            containerStyle={{ flex: 1 }}
                            style={styles.libraryManageBody}
                            onPress={pick}
                            accessibilityRole="button"
                            accessibilityLabel={`Ajouter ${ex.name}`}
                          >
                            <Text style={styles.libraryManageName}>{ex.name}</Text>
                            <Text style={styles.libraryManageSub}>
                              {ex.default_sets || 4} séries · {ex.default_reps || 10} reps
                            </Text>
                          </PressableScale>

                          <View style={styles.actionsGroup}>
                            <PressableScale
                              haptic="none"
                              hitSlop={6}
                              style={styles.libraryPickRowBtn}
                              onPress={pick}
                              accessibilityRole="button"
                              accessibilityLabel={`Choisir ${ex.name}`}
                            >
                              <Feather name="plus" size={13} color={theme.colors.sprintyBlue} style={{ marginRight: 4 }} />
                              <Text style={styles.libraryPickRowText}>Choisir</Text>
                            </PressableScale>
                            <IconButton
                              icon="edit-2"
                              tone="plain"
                              size={34}
                              onPress={() => handleStartEditLibraryEx(ex)}
                              accessibilityLabel={`Renommer ${ex.name}`}
                            />
                            <IconButton
                              icon="trash-2"
                              tone="plain"
                              size={34}
                              color={theme.colors.error}
                              onPress={() => handleDeleteFromLibrary(ex)}
                              accessibilityLabel={`Supprimer ${ex.name}`}
                            />
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

      <MultiTargetSelectorModal
        visible={isMultiTargetModalVisible}
        onClose={() => setIsMultiTargetModalVisible(false)}
        onSave={setExTargets}
        initialTarget={exTargets}
        title="Cibler l’exercice"
      />
    </Modal>
  );
};

const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';
const RED_TINT = 'rgba(239, 68, 68, 0.1)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleInput: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    paddingVertical: 4,
    color: theme.colors.text,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 38,
  },
  headerPill: {
    minWidth: 76,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.sprintyBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPillBusy: {
    opacity: 0.8,
  },
  headerPillText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
  },
  card: {
    ...glassCard,
  },
  cardError: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  fieldError: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RED_TINT,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
  },
  notesCard: {
    padding: 0,
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 88,
    lineHeight: 21,
    color: theme.colors.text,
  },
  emptyCard: {
    padding: 0,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    padding: 0,
    overflow: 'hidden',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  indexCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.sprintyBlue,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  exerciseNameEn: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 120,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: BLUE_TINT,
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  exerciseSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: theme.colors.text,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: theme.colors.hairline,
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  selectorMainText: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectorSubText: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
  },
  searchPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
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
    gap: 4,
  },
  settingValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.sprintyBlue,
  },
  tableCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  weightTypeSegment: {
    width: 150,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.glassFill,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 6,
  },
  tableInput: {
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  setIndexBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  addSetBtnBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  addSetText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
  submitSheetBtn: {
    marginTop: 28,
  },
  listCard: {
    paddingVertical: 0,
  },
  libraryManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  libraryManageBody: {
    paddingVertical: 12,
    paddingRight: 8,
  },
  libraryManageName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  libraryManageSub: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  renameBtn: {
    flex: 1,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.sprintyBlue,
    gap: 8,
    shadowColor: theme.colors.sprintyBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
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
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  secondaryActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: BLUE_TINT,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.sprintyBlue,
  },
  libraryPickRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
  },
  libraryPickRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.sprintyBlue,
  },
});
