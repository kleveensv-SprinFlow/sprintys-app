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
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
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

export const StairsWorkoutBuilder: React.FC<StairsWorkoutBuilderProps> = ({
  visible,
  date,
  onClose,
  onSave,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers } = useCoachStore();

  // Session-level Target
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Coach's personal library
  const [savedExercises, setSavedExercises] = useState<CoachExercise[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Library Management Modal
  const [isManageLibraryVisible, setIsManageLibraryVisible] = useState(false);
  const [editingLibraryEx, setEditingLibraryEx] = useState<CoachExercise | null>(null);
  const [editingLibraryName, setEditingLibraryName] = useState('');

  // Rest Time Picker Modal State
  const [isRestPickerVisible, setIsRestPickerVisible] = useState(false);
  const [restPickerTarget, setRestPickerTarget] = useState<'sets' | 'exercise'>('sets');

  // Exercises in the current session
  const [sessionExercises, setSessionExercises] = useState<StairExerciseItem[]>([]);

  // Current exercise form state
  const [exerciseName, setExerciseName] = useState('');
  const [isStairsModeManual, setIsStairsModeManual] = useState(true); // true = nombre saisi, false = libre
  const [manualStairsText, setManualStairsText] = useState('20');
  const [setsCount, setSetsCount] = useState<number>(4);
  const [restSets, setRestSets] = useState<number>(60);
  const [restExercise, setRestExercise] = useState<number>(180);

  // Per-exercise targeting inside the session
  const [exTargetType, setExTargetType] = useState<'all' | 'subgroup' | 'athlete'>('all');
  const [exTargetSubgroupId, setExTargetSubgroupId] = useState<string | null>(null);
  const [exTargetAthleteId, setExTargetAthleteId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approved team members
  const approvedMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'approved'),
    [teamMembers]
  );

  // Load coach's personal exercises from Supabase
  const loadLibrary = async () => {
    if (!user?.id) return;
    setIsLoadingLibrary(true);
    const list = await coachExerciseService.fetchExercises(user.id, 'escalier');
    setSavedExercises(list || []);
    setIsLoadingLibrary(false);
  };

  useEffect(() => {
    if (visible && user?.id) {
      loadLibrary();

      if (subgroups.length > 0 && !selectedSubgroupId) {
        setSelectedSubgroupId(subgroups[0].id);
        setExTargetSubgroupId(subgroups[0].id);
      }
      if (approvedMembers.length > 0 && !selectedAthleteId) {
        setSelectedAthleteId(approvedMembers[0].user_id);
        setExTargetAthleteId(approvedMembers[0].user_id);
      }
    }
  }, [visible, user?.id, subgroups, approvedMembers]);

  // Handle choosing a preset from coach's saved library
  const handleSelectFromLibrary = (ex: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExerciseName(ex.name);
    if (ex.default_stairs) {
      setIsStairsModeManual(true);
      setManualStairsText(String(ex.default_stairs));
    } else {
      setIsStairsModeManual(false);
    }
    setSetsCount(ex.default_sets || 4);
    setRestSets(ex.default_rest_sets || 60);
    setRestExercise(ex.default_rest_exercise || 180);
  };

  // Reset exercise creation form
  const resetExerciseForm = () => {
    setExerciseName('');
    setIsStairsModeManual(true);
    setManualStairsText('20');
    setSetsCount(4);
    setRestSets(60);
    setRestExercise(180);
    setExTargetType('all');
    setEditingId(null);
  };

  // Add or update exercise in current session
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

    // Build target object
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

    resetExerciseForm();
  };

  // Start editing an existing exercise in the list
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
  };

  // Remove exercise from session
  const handleRemoveExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionExercises((prev) => prev.filter((item) => item.id !== id));
  };

  // Delete exercise from personal library
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

  // Open Wheel Picker
  const openRestPicker = (target: 'sets' | 'exercise') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestPickerTarget(target);
    setIsRestPickerVisible(true);
  };

  const handleConfirmRestPicker = (seconds: number) => {
    if (restPickerTarget === 'sets') {
      setRestSets(seconds);
    } else {
      setRestExercise(seconds);
    }
  };

  // Submit and assign workout (filtering per athlete so they only see relevant exercises)
  const handleSaveWorkout = async () => {
    if (sessionExercises.length === 0) {
      Alert.alert(
        'Séance vide',
        "Veuillez ajouter au moins un exercice d'escalier à la séance avant d'enregistrer."
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

      // Helper function to map exercises list to DB schema
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

      // A. Global Team Mode: Tailor workout for EACH athlete individually based on exercise-level target!
      if (targetType === 'team') {
        if (!activeTeamId) {
          Alert.alert('Erreur', 'Aucune équipe trouvée.');
          setIsSubmitting(false);
          return;
        }

        // For each approved athlete, filter exercises that concern them
        for (const member of approvedMembers) {
          const athleteFiltered = sessionExercises.filter((ex) => {
            if (!ex.target || ex.target.type === 'all') return true;
            if (ex.target.type === 'subgroup') return ex.target.id === member.subgroup_id;
            if (ex.target.type === 'athlete') return ex.target.id === member.user_id;
            return false;
          });

          // Only create workout if the athlete has at least one exercise assigned to them
          if (athleteFiltered.length > 0) {
            const athletePayload = {
              type_seance: 'Escalier',
              coach_id: user.id,
              team_id: activeTeamId,
              athlete_id: member.user_id,
              date_prevue: date.toISOString(),
              description: `${athleteFiltered.length} exercice${athleteFiltered.length > 1 ? 's' : ''} d'escalier`,
              exercises: mapExercisesToPayload(athleteFiltered),
              blocks: [
                {
                  id: uuid.v4() as string,
                  name: 'Corps de séance Escalier',
                  type: 'plyo',
                  exercises: mapExercisesToPayload(athleteFiltered),
                },
              ],
              status: 'pending',
            };

            await workoutService.createPlannedWorkout(athletePayload);
          }
        }
      } else if (targetType === 'subgroup') {
        // Filter for members of this subgroup
        const subMembers = approvedMembers.filter((m) => m.subgroup_id === selectedSubgroupId);
        for (const member of subMembers) {
          const athleteFiltered = sessionExercises.filter((ex) => {
            if (!ex.target || ex.target.type === 'all' || ex.target.type === 'subgroup') return true;
            if (ex.target.type === 'athlete') return ex.target.id === member.user_id;
            return false;
          });

          if (athleteFiltered.length > 0) {
            const athletePayload = {
              type_seance: 'Escalier',
              coach_id: user.id,
              team_id: activeTeamId,
              subgroup_id: selectedSubgroupId,
              athlete_id: member.user_id,
              date_prevue: date.toISOString(),
              description: `${athleteFiltered.length} exercice${athleteFiltered.length > 1 ? 's' : ''} d'escalier`,
              exercises: mapExercisesToPayload(athleteFiltered),
              status: 'pending',
            };
            await workoutService.createPlannedWorkout(athletePayload);
          }
        }
      } else {
        // Individual athlete mode
        const athletePayload = {
          type_seance: 'Escalier',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId!,
          date_prevue: date.toISOString(),
          description: `${sessionExercises.length} exercice${sessionExercises.length > 1 ? 's' : ''} d'escalier`,
          exercises: mapExercisesToPayload(sessionExercises),
          status: 'pending',
        };
        await workoutService.createPlannedWorkout(athletePayload);
      }

      // Automatically persist unique exercises to coach's personal library
      sessionExercises.forEach((ex) => {
        coachExerciseService.saveExercise(user.id, {
          name: ex.name,
          default_stairs: ex.stairs || undefined,
          default_sets: ex.setsCount,
          default_rest_sets: ex.restSets,
          default_rest_exercise: ex.restExercise,
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving stairs workout:', err);
      Alert.alert('Erreur', "Impossible d'enregistrer la séance. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRestDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins} min ${secs} s`;
    if (mins > 0) return `${mins} min`;
    return `${secs} s`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Top Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}>
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Séance Escalier</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveWorkout}
              disabled={isSubmitting || sessionExercises.length === 0}
              style={[
                styles.saveHeaderBtn,
                {
                  backgroundColor: sessionExercises.length > 0 ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveHeaderBtnText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Target Assignment Selector (Session Level) */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cible de la séance</Text>

              <View style={styles.targetTypeRow}>
                {[
                  { id: 'team', label: 'Tout le groupe', icon: 'users' },
                  { id: 'subgroup', label: 'Sous-groupe', icon: 'layers' },
                  { id: 'athlete', label: 'Athlète', icon: 'user' },
                ].map((t) => {
                  const isSelected = targetType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.targetTypeBtn,
                        {
                          backgroundColor: isSelected ? theme.colors.accent : theme.colors.background,
                          borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTargetType(t.id as any);
                        if (t.id === 'subgroup' && !selectedSubgroupId && subgroups.length > 0) {
                          setSelectedSubgroupId(subgroups[0].id);
                        }
                        if (t.id === 'athlete' && !selectedAthleteId && approvedMembers.length > 0) {
                          setSelectedAthleteId(approvedMembers[0].user_id);
                        }
                      }}
                    >
                      <Feather
                        name={t.icon as any}
                        size={13}
                        color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.targetTypeBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subgroup selector if chosen at session level */}
              {targetType === 'subgroup' && (
                <View style={styles.subSelectorBox}>
                  {subgroups.length === 0 ? (
                    <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                      Aucun sous-groupe configuré.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {sg.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Athlete selector if chosen at session level */}
              {targetType === 'athlete' && (
                <View style={styles.subSelectorBox}>
                  {approvedMembers.length === 0 ? (
                    <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                      Aucun athlète dans l'équipe.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {approvedMembers.map((m) => {
                        const isSelected = selectedAthleteId === m.user_id;
                        const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                        const nameDisplay = prof?.full_name?.trim() || 'Athlète';
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
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {nameDisplay}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            {/* Coach's Personal Library (Chips + Gérer) */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Feather name="book-open" size={16} color={theme.colors.accent} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ma bibliothèque d'exercices</Text>
                </View>

                {savedExercises.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setIsManageLibraryVisible(true)}
                    style={styles.manageLibraryBtn}
                  >
                    <Feather name="settings" size={12} color={theme.colors.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.manageLibraryBtnText, { color: theme.colors.accent }]}>Gérer</Text>
                  </TouchableOpacity>
                )}
              </View>

              {savedExercises.length === 0 ? (
                <View style={[styles.emptyLibraryNotice, { backgroundColor: theme.colors.background }]}>
                  <Feather name="info" size={15} color={theme.colors.accent} style={{ marginTop: 2 }} />
                  <Text style={[styles.emptyLibraryText, { color: theme.colors.textSecondary }]}>
                    Votre bibliothèque est vide. Chaque exercice créé sera mémorisé pour vos prochaines séances.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {savedExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.libraryChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => handleSelectFromLibrary(ex)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={12} color={theme.colors.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.libraryChipText, { color: theme.colors.text }]}>{ex.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Session Exercises List */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Exercices de la séance</Text>
                <Text style={[styles.libraryCount, { color: theme.colors.textSecondary }]}>
                  {sessionExercises.length} exercice{sessionExercises.length > 1 ? 's' : ''}
                </Text>
              </View>

              {sessionExercises.length === 0 ? (
                <Text style={[styles.emptySessionText, { color: theme.colors.textMuted }]}>
                  Aucun exercice pour l'instant. Configurez votre premier exercice ci-dessous.
                </Text>
              ) : (
                <View style={styles.exerciseList}>
                  {sessionExercises.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.exerciseItemCard,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      ]}
                    >
                      <View style={styles.exerciseItemHeader}>
                        <View style={[styles.exerciseNumberBadge, { backgroundColor: theme.colors.accent }]}>
                          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.exerciseItemName, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>

                        {/* Exercise Target Badge */}
                        <View style={[styles.exTargetBadge, { backgroundColor: theme.colors.surface }]}>
                          <Text style={[styles.exTargetBadgeText, { color: theme.colors.accent }]}>
                            {item.target?.name || 'Tout le groupe'}
                          </Text>
                        </View>

                        <View style={styles.exerciseActions}>
                          <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.actionBtn}>
                            <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemoveExercise(item.id)} style={styles.actionBtn}>
                            <Feather name="trash-2" size={15} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Stats Pills */}
                      <View style={styles.statsPillsRow}>
                        <View style={[styles.statPill, { backgroundColor: theme.colors.surface }]}>
                          <Text style={[styles.statPillLabel, { color: theme.colors.textSecondary }]}>Marches</Text>
                          <Text style={[styles.statPillValue, { color: theme.colors.text }]}>
                            {item.stairs ? `${item.stairs}` : 'Libre'}
                          </Text>
                        </View>

                        <View style={[styles.statPill, { backgroundColor: theme.colors.surface }]}>
                          <Text style={[styles.statPillLabel, { color: theme.colors.textSecondary }]}>Séries</Text>
                          <Text style={[styles.statPillValue, { color: theme.colors.text }]}>{item.setsCount}</Text>
                        </View>

                        <View style={[styles.statPill, { backgroundColor: theme.colors.surface }]}>
                          <Text style={[styles.statPillLabel, { color: theme.colors.textSecondary }]}>Réc. séries</Text>
                          <Text style={[styles.statPillValue, { color: theme.colors.text }]}>{formatRestDisplay(item.restSets)}</Text>
                        </View>

                        <View style={[styles.statPill, { backgroundColor: theme.colors.surface }]}>
                          <Text style={[styles.statPillLabel, { color: theme.colors.textSecondary }]}>Réc. exo</Text>
                          <Text style={[styles.statPillValue, { color: theme.colors.text }]}>{formatRestDisplay(item.restExercise)}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Form: Add / Edit an Exercise */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Feather name={editingId ? 'edit' : 'plus-circle'} size={16} color={theme.colors.accent} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {editingId ? "Modifier l'exercice" : 'Ajouter un exercice'}
                  </Text>
                </View>

                {editingId && (
                  <TouchableOpacity onPress={resetExerciseForm}>
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Field 1: Exercise Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Nom de l'exercice</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Ex. Montée 2 par 2, Pieds joints, Vitesse..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={exerciseName}
                  onChangeText={setExerciseName}
                  maxLength={40}
                />
              </View>

              {/* Field 2: Per-Exercise Target Selector (in general team session) */}
              {targetType === 'team' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.colors.text }]}>Attribuer cet exercice à :</Text>
                  <View style={styles.targetTypeRow}>
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
                            styles.targetTypeBtn,
                            {
                              backgroundColor: isSelected ? theme.colors.accent : theme.colors.background,
                              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setExTargetType(t.id as any);
                          }}
                        >
                          <Text
                            style={[
                              styles.targetTypeBtnText,
                              { color: isSelected ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Subgroup options for this exercise */}
                  {exTargetType === 'subgroup' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
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
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {sg.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Athlete options for this exercise */}
                  {exTargetType === 'athlete' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {approvedMembers.map((m) => {
                        const isSelected = exTargetAthleteId === m.user_id;
                        const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                        const nameDisplay = prof?.full_name?.trim() || 'Athlète';
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
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? theme.colors.accent : theme.colors.text },
                              ]}
                            >
                              {nameDisplay}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Field 3: Nombre de marches (Libre ou Saisie manuelle) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Nombre de marches</Text>
                
                <View style={styles.stairsToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.stairsToggleBtn,
                      {
                        backgroundColor: !isStairsModeManual ? theme.colors.accent : theme.colors.background,
                        borderColor: !isStairsModeManual ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsStairsModeManual(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.stairsToggleBtnText,
                        { color: !isStairsModeManual ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Marches libres
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.stairsToggleBtn,
                      {
                        backgroundColor: isStairsModeManual ? theme.colors.accent : theme.colors.background,
                        borderColor: isStairsModeManual ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsStairsModeManual(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.stairsToggleBtnText,
                        { color: isStairsModeManual ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Saisir le nombre
                    </Text>
                  </TouchableOpacity>
                </View>

                {isStairsModeManual && (
                  <View style={styles.manualStairsInputRow}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          textAlign: 'center',
                          fontSize: 16,
                          fontWeight: '800',
                        },
                      ]}
                      keyboardType="number-pad"
                      placeholder="Ex. 25"
                      placeholderTextColor={theme.colors.textMuted}
                      value={manualStairsText}
                      onChangeText={setManualStairsText}
                      maxLength={4}
                    />
                    <Text style={[styles.unitLabel, { color: theme.colors.textSecondary }]}>marches</Text>
                  </View>
                )}
              </View>

              {/* Field 4: Nombre de séries (Stepper uniquement avec - et +) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Nombre de séries</Text>
                <View style={[styles.largeStepperBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[styles.largeStepperBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSetsCount((prev) => Math.max(1, prev - 1));
                    }}
                  >
                    <Feather name="minus" size={20} color={theme.colors.text} />
                  </TouchableOpacity>

                  <View style={styles.largeStepperTextWrap}>
                    <Text style={[styles.largeStepperValue, { color: theme.colors.text }]}>{setsCount}</Text>
                    <Text style={[styles.largeStepperSub, { color: theme.colors.textSecondary }]}>
                      série{setsCount > 1 ? 's' : ''}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.largeStepperBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSetsCount((prev) => prev + 1);
                    }}
                  >
                    <Feather name="plus" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 5: Temps de repos entre les séries (Clic pour ouvrir la roue Minutes/Secondes) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Temps de repos entre les séries</Text>
                <TouchableOpacity
                  style={[styles.restSelectorCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => openRestPicker('sets')}
                  activeOpacity={0.7}
                >
                  <View style={styles.restSelectorLeft}>
                    <Feather name="clock" size={18} color={theme.colors.accent} />
                    <Text style={[styles.restSelectorValue, { color: theme.colors.text }]}>
                      {formatRestDisplay(restSets)}
                    </Text>
                  </View>
                  <View style={[styles.restSelectorActionBadge, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.restSelectorActionText, { color: theme.colors.accent }]}>Modifier</Text>
                    <Feather name="chevron-right" size={14} color={theme.colors.accent} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Field 6: Temps de repos après cet exercice */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Temps de repos après cet exercice</Text>
                <TouchableOpacity
                  style={[styles.restSelectorCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => openRestPicker('exercise')}
                  activeOpacity={0.7}
                >
                  <View style={styles.restSelectorLeft}>
                    <Feather name="pause-circle" size={18} color={theme.colors.accent} />
                    <Text style={[styles.restSelectorValue, { color: theme.colors.text }]}>
                      {formatRestDisplay(restExercise)}
                    </Text>
                  </View>
                  <View style={[styles.restSelectorActionBadge, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.restSelectorActionText, { color: theme.colors.accent }]}>Modifier</Text>
                    <Feather name="chevron-right" size={14} color={theme.colors.accent} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Button: Ajouter à la séance */}
              <TouchableOpacity
                style={[styles.addExerciseBtn, { backgroundColor: theme.colors.accent }]}
                onPress={handleSaveExerciseToSession}
                activeOpacity={0.8}
              >
                <Feather name={editingId ? 'check' : 'plus'} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.addExerciseBtnText}>
                  {editingId ? "Mettre à jour l'exercice" : "Ajouter l'exercice à la séance"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 50 }} />
          </ScrollView>

          {/* Modal: Wheel Picker for Rest Time (Minutes / Secondes) */}
          <RestTimePickerModal
            visible={isRestPickerVisible}
            title={
              restPickerTarget === 'sets'
                ? 'Repos entre les séries'
                : "Repos après l'exercice"
            }
            initialSeconds={restPickerTarget === 'sets' ? restSets : restExercise}
            onClose={() => setIsRestPickerVisible(false)}
            onConfirm={handleConfirmRestPicker}
          />

          {/* Modal: Gérer ma bibliothèque d'exercices */}
          <Modal
            visible={isManageLibraryVisible}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setIsManageLibraryVisible(false)}
          >
            <View style={[styles.manageModalContainer, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.manageModalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.manageModalTitle, { color: theme.colors.text }]}>
                  Ma bibliothèque d'escaliers
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsManageLibraryVisible(false);
                    setEditingLibraryEx(null);
                  }}
                  style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}
                >
                  <Feather name="x" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, padding: 16 }}>
                {editingLibraryEx && (
                  <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 8 }]}>
                      Modifier le nom de l'exercice
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={editingLibraryName}
                      onChangeText={setEditingLibraryName}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.saveHeaderBtn, { backgroundColor: theme.colors.accent, flex: 1 }]}
                        onPress={handleSaveLibraryEdit}
                      >
                        <Text style={styles.saveHeaderBtnText}>Enregistrer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveHeaderBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                        onPress={() => setEditingLibraryEx(null)}
                      >
                        <Text style={[styles.saveHeaderBtnText, { color: theme.colors.text }]}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {savedExercises.length === 0 ? (
                  <Text style={[styles.emptySessionText, { color: theme.colors.textMuted }]}>
                    Aucun exercice enregistré dans votre bibliothèque.
                  </Text>
                ) : (
                  savedExercises.map((ex) => (
                    <View
                      key={ex.id}
                      style={[
                        styles.libraryManageItem,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.libraryManageName, { color: theme.colors.text }]}>{ex.name}</Text>
                        <Text style={[styles.libraryManageDetails, { color: theme.colors.textSecondary }]}>
                          {ex.default_stairs ? `${ex.default_stairs} marches` : 'Marches libres'} • {ex.default_sets || 4} séries
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleStartEditLibraryEx(ex)}
                        >
                          <Feather name="edit-2" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleDeleteFromLibrary(ex)}
                        >
                          <Feather name="trash-2" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  libraryCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  manageLibraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  manageLibraryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyLibraryNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyLibraryText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  libraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  libraryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  targetTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  targetTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  targetTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subSelectorBox: {
    marginTop: 10,
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptySessionText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  exerciseList: {
    gap: 10,
    marginTop: 4,
  },
  exerciseItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  exerciseItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  exTargetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  exTargetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
  },
  statsPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  stairsToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stairsToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stairsToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  manualStairsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  largeStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  largeStepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeStepperTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeStepperValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  largeStepperSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  restSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  restSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restSelectorValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  restSelectorActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  restSelectorActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  addExerciseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  manageModalContainer: {
    flex: 1,
  },
  manageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  manageModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  libraryManageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  libraryManageName: {
    fontSize: 15,
    fontWeight: '700',
  },
  libraryManageDetails: {
    fontSize: 12,
    marginTop: 2,
  },
});
