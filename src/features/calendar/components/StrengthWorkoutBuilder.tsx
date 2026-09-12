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
import {
  StrengthExerciseSearchModal,
  SelectedStrengthExercise,
} from './StrengthExerciseSearchModal';

interface ExerciseTarget {
  type: 'all' | 'subgroup' | 'athlete';
  id: string | null;
  name: string;
}

export interface StrengthExerciseItem {
  id: string;
  catalog_id?: string;
  name: string;
  name_en?: string;
  setsCount: number;
  repsCount: number;
  weight: number; // in kg or %
  weightType: 'kg' | 'percent_1rm';
  restSets: number; // in seconds
  target: ExerciseTarget;
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
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

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
  const [weightType, setWeightType] = useState<'kg' | 'percent_1rm'>('kg');
  const [restSets, setRestSets] = useState<number>(90); // 90s default for strength

  // Exercise Target inside session (when session target is 'team')
  const [exTargetType, setExTargetType] = useState<'all' | 'subgroup' | 'athlete'>('all');
  const [exTargetSubgroupId, setExTargetSubgroupId] = useState<string | null>(null);
  const [exTargetAthleteId, setExTargetAthleteId] = useState<string | null>(null);

  // Exercise Search Modal
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  // Rest Picker Modal
  const [isRestPickerVisible, setIsRestPickerVisible] = useState(false);

  // Coach Personal Library State
  const [coachSavedExercises, setCoachSavedExercises] = useState<CoachExercise[]>([]);
  const [isManageLibraryVisible, setIsManageLibraryVisible] = useState(false);
  const [editingLibraryEx, setEditingLibraryEx] = useState<CoachExercise | null>(null);
  const [editingLibraryName, setEditingLibraryName] = useState('');

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
        const loaded: StrengthExerciseItem[] = initialWorkout.exercises.map((ex: any) => ({
          id: ex.id || String(uuid.v4()),
          catalog_id: ex.catalog_id,
          name: ex.name,
          name_en: ex.name_en,
          setsCount: ex.sets?.length || 4,
          repsCount: ex.sets?.[0]?.reps || 10,
          weight: ex.sets?.[0]?.weight || 0,
          weightType: ex.sets?.[0]?.weight_type || ex.sets?.[0]?.weightType || 'kg',
          restSets: ex.sets?.[0]?.restSeconds || 90,
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
    setEditingId(null);
    setExerciseName('');
    setExerciseNameEn(undefined);
    setCatalogId(undefined);
    setExTargetType('all');
    // We intentionally keep setsCount, repsCount, weightValueText, weightType, restSets from memory!
    setIsExerciseSheetVisible(true);
  };

  // Open "Modifier l'exercice" sheet
  const handleStartEdit = (item: StrengthExerciseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(item.id);
    setExerciseName(item.name);
    setExerciseNameEn(item.name_en);
    setCatalogId(item.catalog_id);
    setSetsCount(item.setsCount);
    setRepsCount(item.repsCount);
    setWeightValueText(String(item.weight || 0));
    setWeightType(item.weightType);
    setRestSets(item.restSets);
    setExTargetType(item.target?.type || 'all');
    if (item.target?.type === 'subgroup') setExTargetSubgroupId(item.target.id || null);
    if (item.target?.type === 'athlete') setExTargetAthleteId(item.target.id || null);
    setIsExerciseSheetVisible(true);
  };

  // Select exercise from search modal
  const handleExerciseSelected = (ex: SelectedStrengthExercise) => {
    setExerciseName(ex.name);
    setExerciseNameEn(ex.name_en);
    setCatalogId(ex.id);
    // Reload library in case a new custom exercise was created
    if (ex.is_custom) {
      loadLibrary();
    }
  };

  // Select quick chip from coach library
  const handleSelectFromLibraryChip = (ex: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setExTargetType('all');
    setIsExerciseSheetVisible(true);
  };

  // Save exercise to current session
  const handleSaveExerciseToSession = () => {
    const trimmed = exerciseName.trim();
    if (!trimmed) {
      Alert.alert('Exercice requis', "Veuillez choisir ou saisir le nom de l'exercice.");
      return;
    }

    if (setsCount <= 0) {
      Alert.alert('Séries requises', 'Veuillez renseigner au moins 1 série.');
      return;
    }

    const parsedWeight = parseFloat(weightValueText.replace(',', '.')) || 0;

    // Persist all values in AsyncStorage for instant pre-fill on next exercise
    saveStrengthMemory(setsCount, repsCount, weightValueText, weightType, restSets);

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
                setsCount,
                repsCount,
                weight: parsedWeight,
                weightType,
                restSets,
                target: finalTarget,
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
        setsCount,
        repsCount,
        weight: parsedWeight,
        weightType,
        restSets,
        target: finalTarget,
      };
      setSessionExercises((prev) => [...prev, newEx]);
    }

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
  const handleDeleteFromLibrary = (ex: CoachExercise) => {
    Alert.alert(
      'Supprimer de ma bibliothèque',
      `Supprimer « ${ex.name} » de votre bibliothèque personnelle de musculation ?`,
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

  // Submit and assign workout to Supabase
  const handleSaveWorkout = async () => {
    if (sessionExercises.length === 0) {
      Alert.alert('Séance vide', "Veuillez ajouter au moins un exercice avant d'enregistrer.");
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
          sets_count: ex.setsCount,
          reps_count: ex.repsCount,
          weight: ex.weight,
          weight_type: ex.weightType,
          weightType: ex.weightType,
          rest_between_sets_s: ex.restSets,
          target: ex.target,
          sets: Array.from({ length: ex.setsCount }, (_, idx) => ({
            id: uuid.v4() as string,
            set_index: idx + 1,
            reps: ex.repsCount,
            weight: ex.weight || undefined,
            weight_type: ex.weightType,
            weightType: ex.weightType,
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

        // Filter per athlete so they only receive the exercises assigned to them
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
            };

            await workoutService.createPlannedWorkout(athletePayload);
            assignedCount++;
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Séance enregistrée !',
          `La séance de musculation a été programmée pour ${assignedCount} athlète(s) de votre équipe.`
        );
      } else if (targetType === 'subgroup') {
        const subgroupMembers = approvedMembers.filter(
          (m) => m.subgroup_id === selectedSubgroupId
        );

        if (subgroupMembers.length === 0) {
          Alert.alert('Aucun athlète', "Aucun athlète dans ce sous-groupe.");
          setIsSubmitting(false);
          return;
        }

        const sharedAssignmentId = uuid.v4() as string;
        const mappedExercises = mapExercisesToPayload(sessionExercises);

        for (const member of subgroupMembers) {
          const athletePayload = {
            type_seance: sessionTitle.trim() || 'Musculation',
            coach_id: user.id,
            team_id: activeTeamId,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: sessionNotes.trim() ? sessionNotes.trim() : `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} de musculation`,
            intensity: 7,
            blocks: [
              {
                id: uuid.v4(),
                name: 'Musculation',
                exercises: mappedExercises,
              },
            ],
            status: 'pending',
          };
          await workoutService.createPlannedWorkout(athletePayload);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Séance enregistrée !',
          `La séance a été assignée aux ${subgroupMembers.length} athlète(s) du sous-groupe.`
        );
      } else if (targetType === 'athlete') {
        const mappedExercises = mapExercisesToPayload(sessionExercises);
        const athletePayload = {
          type_seance: sessionTitle.trim() || 'Musculation',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId,
          date_prevue: targetDateIso,
          description: sessionNotes.trim() ? sessionNotes.trim() : `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} de musculation`,
          intensity: 7,
          blocks: [
            {
              id: uuid.v4(),
              name: 'Musculation',
              exercises: mappedExercises,
            },
          ],
          status: 'pending',
        };

        await workoutService.createPlannedWorkout(athletePayload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Séance enregistrée !', "La séance a été planifiée pour l'athlète.");
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement musculation:', err);
      Alert.alert(
        'Erreur',
        err.message || "Impossible d'enregistrer la séance. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <TextInput
              style={[styles.headerTitleInput, { color: theme.colors.text }]}
              value={sessionTitle}
              onChangeText={setSessionTitle}
              placeholder="Séance Musculation"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={35}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveHeaderBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleSaveWorkout}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveHeaderBtnText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* MAIN SCROLL VIEW                                                          */}
        {/* ========================================================================= */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION: ASSIGNATION / CIBLAGE GLOBAL */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>ASSIGNATION DE LA SÉANCE</Text>
          </View>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.segmentContainer, { backgroundColor: theme.colors.background }]}>
              {[
                { id: 'team', label: 'Tout le groupe' },
                { id: 'subgroup', label: 'Sous-groupe' },
                { id: 'athlete', label: 'Un athlète' },
              ].map((t) => {
                const isSelected = targetType === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.segmentBtn,
                      isSelected && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTargetType(t.id as any);
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: isSelected ? theme.colors.text : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subgroup Selector */}
            {targetType === 'subgroup' && (
              <View style={{ paddingTop: 12 }}>
                {subgroups.length === 0 ? (
                  <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                    Aucun sous-groupe configuré dans cette équipe.
                  </Text>
                ) : (
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
              </View>
            )}

            {/* Athlete Selector */}
            {targetType === 'athlete' && (
              <View style={{ paddingTop: 12 }}>
                {approvedMembers.length === 0 ? (
                  <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                    Aucun athlète approuvé dans votre équipe.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                    {approvedMembers.map((m) => {
                      const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                      const name = prof?.full_name || prof?.first_name || 'Athlète';
                      const isSelected = selectedAthleteId === m.user_id;
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
            )}
          </View>

          {/* SECTION: CONSIGNES DE SÉANCE */}
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CONSIGNES DE SÉANCE</Text>
          </View>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text }]}
              placeholder="Ajouter une note ou des consignes pour cette séance..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
            />
          </View>

          {/* SECTION: LISTE DES EXERCICES DE LA SÉANCE */}
          <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
              EXERCICES DE LA SÉANCE ({sessionExercises.length})
            </Text>
          </View>

          {sessionExercises.length === 0 ? (
            <View style={[styles.emptyStateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="activity" size={28} color={theme.colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun exercice ajouté</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Composez votre séance en piochant dans la base d'exercices ou votre bibliothèque coach.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginBottom: 12 }}>
              {sessionExercises.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.exerciseCardHeader}>
                    <View style={styles.indexCircle}>
                      <Text style={styles.indexText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{item.name}</Text>
                      {item.name_en && (
                        <Text style={[styles.exerciseNameEn, { color: theme.colors.textSecondary }]}>
                          {item.name_en}
                        </Text>
                      )}
                    </View>

                    {/* Target tag if specific */}
                    {targetType === 'team' && item.target && item.target.type !== 'all' && (
                      <View style={[styles.targetBadge, { backgroundColor: theme.colors.accent + '15' }]}>
                        <Text style={[styles.targetBadgeText, { color: theme.colors.accent }]}>
                          {item.target.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Summary details row */}
                  <View style={[styles.exerciseSummaryRow, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>SÉRIES</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{item.setsCount}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>REPS</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{item.repsCount}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>CHARGE</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>
                        {formatWeightDisplay(item.weight, item.weightType)}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>REPOS</Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                        {formatRestDisplay(item.restSets)}
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions */}
                  <View style={[styles.exerciseActionsRow, { borderTopColor: theme.colors.border }]}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'up')}
                        disabled={index === 0}
                        style={[styles.smallActionBtn, index === 0 && { opacity: 0.3 }]}
                      >
                        <Feather name="chevron-up" size={18} color={theme.colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'down')}
                        disabled={index === sessionExercises.length - 1}
                        style={[styles.smallActionBtn, index === sessionExercises.length - 1 && { opacity: 0.3 }]}
                      >
                        <Feather name="chevron-down" size={18} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.smallActionBtn}>
                        <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveExercise(item.id)} style={styles.smallActionBtn}>
                        <Feather name="trash-2" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ACTION BUTTONS GROUP */}
          <View style={styles.actionButtonsContainer}>
            {/* BOUTON PRINCIPAL : AJOUTER UN EXERCICE */}
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

            {/* BOUTON SECONDAIRE : CHOISIR DEPUIS LA BIBLIOTHÈQUE */}
            {coachSavedExercises.length > 0 && (
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
                    {coachSavedExercises.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

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
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
              {/* Sheet Header */}
              <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setIsExerciseSheetVisible(false)} style={styles.headerTextBtn}>
                  <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  {editingId ? "Modifier l'exercice" : 'Nouvel exercice'}
                </Text>

                {/* Right spacer to keep title centered, single action button at bottom */}
                <View style={{ width: 60 }} />
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Field 1: Nom de l'exercice / Sélecteur Catalogue */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>EXERCICE</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={styles.exerciseSelectorRow}
                    onPress={() => setIsSearchModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.selectorMainText, { color: exerciseName ? theme.colors.text : theme.colors.textMuted }]}>
                        {exerciseName || "Sélectionner dans la base d'exercices..."}
                      </Text>
                      {exerciseNameEn ? (
                        <Text style={[styles.selectorSubText, { color: theme.colors.textSecondary }]}>
                          {exerciseNameEn}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.searchPill, { backgroundColor: theme.colors.accent + '15' }]}>
                      <Feather name="search" size={14} color={theme.colors.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.searchPillText, { color: theme.colors.accent }]}>
                        {exerciseName ? 'Changer' : 'Choisir'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Field 2: Target (Only if session is general team) */}
                {targetType === 'team' && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>POUR QUI DANS LE GROUPE ?</Text>
                    </View>
                    <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <View style={[styles.segmentContainer, { backgroundColor: theme.colors.background }]}>
                        {[
                          { id: 'all', label: 'Tout le groupe' },
                          { id: 'subgroup', label: 'Sous-groupe' },
                          { id: 'athlete', label: 'Un athlète' },
                        ].map((t) => {
                          const isSelected = exTargetType === t.id;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.segmentBtn,
                                isSelected && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExTargetType(t.id as any);
                              }}
                            >
                              <Text
                                style={[
                                  styles.segmentBtnText,
                                  { color: isSelected ? theme.colors.text : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
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
                            const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                            const name = prof?.full_name || prof?.first_name || 'Athlète';
                            const isSelected = exTargetAthleteId === m.user_id;
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

                {/* Field 3: Séries & Répétitions */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>SÉRIES & RÉPÉTITIONS</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
                          saveStrengthMemory(next, repsCount, weightValueText, weightType, restSets);
                        }}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>

                      <Text style={[styles.stepperNumberText, { color: theme.colors.text }]}>{setsCount}</Text>

                      <TouchableOpacity
                        style={[styles.stepperActionBtn, { backgroundColor: theme.colors.background }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const next = setsCount + 1;
                          setSetsCount(next);
                          saveStrengthMemory(next, repsCount, weightValueText, weightType, restSets);
                        }}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />

                  {/* Répétitions Stepper Row */}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Nombre de répétitions</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {repsCount} reps par série
                      </Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperActionBtn, { backgroundColor: theme.colors.background }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const next = Math.max(1, repsCount - 1);
                          setRepsCount(next);
                          saveStrengthMemory(setsCount, next, weightValueText, weightType, restSets);
                        }}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>

                      <Text style={[styles.stepperNumberText, { color: theme.colors.text }]}>{repsCount}</Text>

                      <TouchableOpacity
                        style={[styles.stepperActionBtn, { backgroundColor: theme.colors.background }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const next = repsCount + 1;
                          setRepsCount(next);
                          saveStrengthMemory(setsCount, next, weightValueText, weightType, restSets);
                        }}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Field 4: Charge / Poids */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CHARGE / POIDS</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {/* Mode de charge : kg vs % 1RM */}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Format de la charge</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {weightType === 'kg' ? 'Charge fixe en kg' : 'Pourcentage du max (1RM)'}
                      </Text>
                    </View>

                    <View style={styles.stairsModeWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.stairsPillBtn,
                          weightType === 'kg' && [styles.stairsPillActive, { backgroundColor: theme.colors.accent }],
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setWeightType('kg');
                          saveStrengthMemory(setsCount, repsCount, weightValueText, 'kg', restSets);
                        }}
                      >
                        <Text style={[styles.stairsPillText, { color: weightType === 'kg' ? '#FFF' : theme.colors.textSecondary }]}>
                          kg
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.stairsPillBtn,
                          weightType === 'percent_1rm' && [styles.stairsPillActive, { backgroundColor: theme.colors.accent }],
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setWeightType('percent_1rm');
                          saveStrengthMemory(setsCount, repsCount, weightValueText, 'percent_1rm', restSets);
                        }}
                      >
                        <Text style={[styles.stairsPillText, { color: weightType === 'percent_1rm' ? '#FFF' : theme.colors.textSecondary }]}>
                          % 1RM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />

                  {/* Saisie de la valeur */}
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                        {weightType === 'kg' ? 'Poids en kilogrammes' : 'Pourcentage du 1RM'}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {weightType === 'kg' ? 'Mettre 0 pour poids du corps (PDC)' : 'Ex : 70, 75, 80% du max'}
                      </Text>
                    </View>

                    <View style={styles.weightInputContainer}>
                      <TextInput
                        style={[
                          styles.weightDetailedInput,
                          {
                            backgroundColor: theme.colors.background,
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                        value={weightValueText}
                        onChangeText={(val) => {
                          setWeightValueText(val);
                          saveStrengthMemory(setsCount, repsCount, val, weightType, restSets);
                        }}
                        maxLength={5}
                      />
                      <Text style={[styles.weightSuffixText, { color: theme.colors.textSecondary }]}>
                        {weightType === 'kg' ? 'kg' : '% 1RM'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Field 5: Temps de Repos */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>RÉCUPÉRATION</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsRestPickerVisible(true);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Repos entre les séries</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        Temps alloué pour récupérer entre chaque série
                      </Text>
                    </View>
                    <View style={styles.settingRight}>
                      <Text style={[styles.settingValueText, { color: theme.colors.accent }]}>
                        {formatRestDisplay(restSets)}
                      </Text>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Bottom Add Action Button (Single button, no header duplicate) */}
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
          onRequestClose={() => setIsManageLibraryVisible(false)}
        >
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ma bibliothèque de musculation</Text>
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

              {coachSavedExercises.length === 0 ? (
                <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 }]}>
                  Aucun exercice personnalisé dans votre bibliothèque.
                </Text>
              ) : (
                <>
                  <View style={{ marginBottom: 12, marginHorizontal: 4 }}>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' }}>
                      Touchez un exercice pour l'ajouter à votre séance :
                    </Text>
                  </View>
                  <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {coachSavedExercises.map((ex, idx) => {
                      const isLast = idx === coachSavedExercises.length - 1;
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
                              handleSelectFromLibraryChip(ex);
                              setIsManageLibraryVisible(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.libraryManageName, { color: theme.colors.text }]}>{ex.name}</Text>
                            <Text style={[styles.libraryManageSub, { color: theme.colors.textSecondary }]}>
                              {ex.default_sets || 4} séries • {ex.default_reps || 10} reps
                            </Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.libraryPickRowBtn, { backgroundColor: theme.colors.accent + '15' }]}
                              onPress={() => {
                                handleSelectFromLibraryChip(ex);
                                setIsManageLibraryVisible(false);
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleInput: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveHeaderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  groupedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 13,
  },
  subScroll: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 80,
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  },
  exerciseCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00000010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#888',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseNameEn: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  targetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#88888830',
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  smallActionBtn: {
    padding: 6,
  },
  addExerciseMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 24,
    gap: 10,
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseMainText: {
    fontSize: 15,
    fontWeight: '700',
  },
  librarySection: {
    marginTop: 8,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 4,
  },
  libraryTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  manageLibraryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  libraryScroll: {
    flexDirection: 'row',
  },
  libraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  libraryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  selectorMainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorSubText: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  searchPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumberText: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
  stairsModeWrapper: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    backgroundColor: '#00000010',
  },
  stairsPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stairsPillActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  stairsPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightDetailedInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  weightSuffixText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitSheetBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitSheetBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSaveBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  headerSaveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  libraryManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  libraryManageName: {
    fontSize: 15,
    fontWeight: '600',
  },
  libraryManageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
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
