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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { RestTimePickerModal } from './RestTimePickerModal';

export interface RunWorkoutBuilderProps {
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

export interface RunBlockItem {
  id: string;
  name: string;
  distance: number;
  repsCount: number;
  intensity: number; // percentage, e.g. 95
  restReps: number; // in seconds
  restBlock: number; // in seconds
  target: ExerciseTarget;
}

export interface SavedRunTemplate {
  id: string;
  name: string;
  distance: number;
  repsCount: number;
  intensity: number;
  restReps: number;
  restBlock: number;
}

const STORAGE_RUN_SURFACE_KEY = '@sprintflow_run_last_surface';
const STORAGE_RUN_EQUIPMENT_KEY = '@sprintflow_run_last_equipment';
const STORAGE_RUN_DISTANCE_KEY = '@sprintflow_run_last_distance';
const STORAGE_RUN_REPS_KEY = '@sprintflow_run_last_reps';
const STORAGE_RUN_INTENSITY_KEY = '@sprintflow_run_last_intensity';
const STORAGE_RUN_REST_REPS_KEY = '@sprintflow_run_last_rest_reps';
const STORAGE_RUN_REST_BLOCK_KEY = '@sprintflow_run_last_rest_block';
const STORAGE_RUN_TEMPLATES_KEY = '@sprintflow_run_library_templates';

const PRESET_DISTANCES = [30, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400];
const PRESET_REPS = [1, 2, 3, 4, 5, 6, 8, 10];
const PRESET_INTENSITIES = [80, 85, 90, 95, 100];

const DEFAULT_TEMPLATES: SavedRunTemplate[] = [
  { id: 'tpl-1', name: '3 × 120m (95%)', distance: 120, repsCount: 3, intensity: 95, restReps: 180, restBlock: 360 },
  { id: 'tpl-2', name: '4 × 60m (100%) Vitesse max', distance: 60, repsCount: 4, intensity: 100, restReps: 180, restBlock: 300 },
  { id: 'tpl-3', name: '5 × 30m (100%) Départs', distance: 30, repsCount: 5, intensity: 100, restReps: 150, restBlock: 300 },
  { id: 'tpl-4', name: '2 × 250m (90%) Lactique', distance: 250, repsCount: 2, intensity: 90, restReps: 300, restBlock: 480 },
  { id: 'tpl-5', name: '3 × 150m (90%)', distance: 150, repsCount: 3, intensity: 90, restReps: 240, restBlock: 360 },
];

export const RunWorkoutBuilder: React.FC<RunWorkoutBuilderProps> = ({
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

  // Session Target
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Surface & Equipment
  const [surface, setSurface] = useState<'piste' | 'cote'>('piste');
  const [equipment, setEquipment] = useState<'pointes' | 'baskets'>('pointes');

  // Session Notes
  const [sessionNotes, setSessionNotes] = useState('');

  // Blocks list
  const [blocks, setBlocks] = useState<RunBlockItem[]>([]);

  // Personal Templates Library
  const [savedTemplates, setSavedTemplates] = useState<SavedRunTemplate[]>([]);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);

  // Add / Edit Block Sheet
  const [isBlockSheetVisible, setIsBlockSheetVisible] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Block Form State
  const [blockName, setBlockName] = useState('');
  const [manualDistanceText, setManualDistanceText] = useState('120');
  const [repsCount, setRepsCount] = useState<number>(3);
  const [intensity, setIntensity] = useState<number>(95);
  const [restReps, setRestReps] = useState<number>(180);
  const [restBlock, setRestBlock] = useState<number>(360);

  // Target override per block
  const [blockTargetScope, setBlockTargetScope] = useState<'inherit' | 'subgroup' | 'athlete'>('inherit');
  const [blockTargetSubgroupId, setBlockTargetSubgroupId] = useState<string | null>(null);
  const [blockTargetAthleteId, setBlockTargetAthleteId] = useState<string | null>(null);

  // Save block to library checkbox
  const [saveToLibraryChecked, setSaveToLibraryChecked] = useState(false);

  // Rest Picker Modals
  const [isRestRepsPickerVisible, setIsRestRepsPickerVisible] = useState(false);
  const [isRestBlockPickerVisible, setIsRestBlockPickerVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approved athletes
  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved');
  }, [teamMembers]);

  // Load templates from AsyncStorage
  const loadTemplates = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_RUN_TEMPLATES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedTemplates(parsed);
      } else {
        setSavedTemplates(DEFAULT_TEMPLATES);
        await AsyncStorage.setItem(STORAGE_RUN_TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      }
    } catch (e) {
      console.warn('Error loading run templates:', e);
      setSavedTemplates(DEFAULT_TEMPLATES);
    }
  };

  // Load memory
  const loadRunMemory = async () => {
    try {
      const [savedSurface, savedEquip, savedDist, savedReps, savedInt, savedRestReps, savedRestBlk] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_RUN_SURFACE_KEY),
          AsyncStorage.getItem(STORAGE_RUN_EQUIPMENT_KEY),
          AsyncStorage.getItem(STORAGE_RUN_DISTANCE_KEY),
          AsyncStorage.getItem(STORAGE_RUN_REPS_KEY),
          AsyncStorage.getItem(STORAGE_RUN_INTENSITY_KEY),
          AsyncStorage.getItem(STORAGE_RUN_REST_REPS_KEY),
          AsyncStorage.getItem(STORAGE_RUN_REST_BLOCK_KEY),
        ]);

      if (savedSurface === 'cote' || savedSurface === 'piste') setSurface(savedSurface);
      if (savedEquip === 'baskets' || savedEquip === 'pointes') setEquipment(savedEquip);
      if (savedDist) setManualDistanceText(savedDist);
      if (savedReps) setRepsCount(Math.max(1, parseInt(savedReps, 10) || 3));
      if (savedInt) setIntensity(Math.min(100, Math.max(50, parseInt(savedInt, 10) || 95)));
      if (savedRestReps) setRestReps(Math.max(10, parseInt(savedRestReps, 10) || 180));
      if (savedRestBlk) setRestBlock(Math.max(0, parseInt(savedRestBlk, 10) || 360));
    } catch (e) {
      console.warn('Error loading run memory:', e);
    }
  };

  // Initialize on modal open
  useEffect(() => {
    if (visible) {
      loadTemplates();
      loadRunMemory();

      if (initialWorkout) {
        // Populate existing workout
        const desc = initialWorkout.description || '';
        setSessionNotes(desc);

        // Detect surface & equipment from type_seance or measures or description
        const typeSeance = (initialWorkout.type_seance || '').toLowerCase();
        if (typeSeance.includes('côte') || typeSeance.includes('cote')) {
          setSurface('cote');
        } else {
          setSurface('piste');
        }

        if (initialWorkout.measures?.equipment) {
          setEquipment(initialWorkout.measures.equipment);
        } else if (desc.toLowerCase().includes('basket')) {
          setEquipment('baskets');
        } else if (desc.toLowerCase().includes('pointe')) {
          setEquipment('pointes');
        }

        if (initialWorkout.measures?.surface) {
          setSurface(initialWorkout.measures.surface);
        }

        // Targeting
        if (initialWorkout.subgroup_id) {
          setTargetType('subgroup');
          setSelectedSubgroupId(initialWorkout.subgroup_id);
        } else if (initialWorkout.athlete_id && !initialWorkout.group_assignment_id) {
          setTargetType('athlete');
          setSelectedAthleteId(initialWorkout.athlete_id);
        } else {
          setTargetType('team');
        }

        // Parse blocks
        if (initialWorkout.blocks && Array.isArray(initialWorkout.blocks) && initialWorkout.blocks.length > 0) {
          const loadedBlocks: RunBlockItem[] = initialWorkout.blocks.map((blk: any, idx: number) => {
            const firstEx = blk.exercises?.[0];
            const sets = firstEx?.sets || [];
            const firstSet = sets[0] || {};
            const dist = firstSet.distance || 100;
            const reps = sets.length || 3;
            const intens = firstSet.intensity || 95;
            const restR = firstSet.restSeconds || 180;
            const restB = blk.restAfterBlock || 360;

            return {
              id: blk.id || String(uuid.v4()),
              name: blk.name || `Bloc ${idx + 1}`,
              distance: dist,
              repsCount: reps,
              intensity: intens,
              restReps: restR,
              restBlock: restB,
              target: firstEx?.target || { type: 'all', id: null, name: 'Tout le groupe' },
            };
          });
          setBlocks(loadedBlocks);
        } else if (initialWorkout.exercises && Array.isArray(initialWorkout.exercises)) {
          // Fallback if blocks wasn't populated
          const loadedBlocks: RunBlockItem[] = initialWorkout.exercises.map((ex: any, idx: number) => {
            const sets = ex.sets || [];
            const firstSet = sets[0] || {};
            return {
              id: ex.id || String(uuid.v4()),
              name: ex.name || `Bloc ${idx + 1}`,
              distance: firstSet.distance || 100,
              repsCount: sets.length || 3,
              intensity: firstSet.intensity || 95,
              restReps: firstSet.restSeconds || 180,
              restBlock: 360,
              target: ex.target || { type: 'all', id: null, name: 'Tout le groupe' },
            };
          });
          setBlocks(loadedBlocks);
        }
      } else {
        // Fresh creation
        setSessionNotes('');
        setBlocks([]);
        setTargetType('team');
        setSelectedSubgroupId(null);
        setSelectedAthleteId(null);
      }
    }
  }, [visible, initialWorkout]);

  // Ensure subgroups and members are loaded
  useEffect(() => {
    if (visible && teams.length > 0) {
      const activeTeamId = teams[0].id;
      if (teamMembers.length === 0) fetchTeamMembers(activeTeamId);
      if (subgroups.length === 0) fetchSubgroups(activeTeamId);
    }
  }, [visible, teams, teamMembers.length, subgroups.length]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setBlocks([]);
      setEditingBlockId(null);
    }
  }, [visible]);

  // Format helpers
  const formatRestDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins}m${secs}`;
    if (mins > 0) return `${mins} min`;
    return `${secs}s`;
  };

  // Open add sheet
  const handleOpenAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBlockId(null);
    setBlockName(`Bloc ${blocks.length + 1}`);
    setBlockTargetScope('inherit');
    setBlockTargetSubgroupId(subgroups[0]?.id || null);
    setBlockTargetAthleteId(approvedMembers[0]?.user_id || null);
    setSaveToLibraryChecked(false);
    setIsBlockSheetVisible(true);
  };

  // Open edit sheet
  const handleStartEdit = (block: RunBlockItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBlockId(block.id);
    setBlockName(block.name);
    setManualDistanceText(String(block.distance));
    setRepsCount(block.repsCount);
    setIntensity(block.intensity);
    setRestReps(block.restReps);
    setRestBlock(block.restBlock);

    if (block.target.type === 'subgroup') {
      setBlockTargetScope('subgroup');
      setBlockTargetSubgroupId(block.target.id || null);
    } else if (block.target.type === 'athlete') {
      setBlockTargetScope('athlete');
      setBlockTargetAthleteId(block.target.id || null);
    } else {
      setBlockTargetScope('inherit');
    }

    setSaveToLibraryChecked(false);
    setIsBlockSheetVisible(true);
  };

  const handleRemoveBlock = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // Choose from library
  const handleSelectTemplate = (tpl: SavedRunTemplate) => {
    Haptics.selectionAsync();
    const newBlock: RunBlockItem = {
      id: String(uuid.v4()),
      name: tpl.name || `Bloc ${blocks.length + 1}`,
      distance: tpl.distance,
      repsCount: tpl.repsCount,
      intensity: tpl.intensity,
      restReps: tpl.restReps,
      restBlock: tpl.restBlock,
      target: { type: 'all', id: null, name: 'Tout le groupe' },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setIsLibraryVisible(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const updated = savedTemplates.filter((t) => t.id !== templateId);
    setSavedTemplates(updated);
    await AsyncStorage.setItem(STORAGE_RUN_TEMPLATES_KEY, JSON.stringify(updated));
  };

  // Submit Add / Edit Block Sheet
  const handleSaveBlockSheet = async () => {
    const distNum = parseInt(manualDistanceText, 10);
    if (isNaN(distNum) || distNum <= 0) {
      Alert.alert('Distance invalide', 'Veuillez saisir une distance valide en mètres (ex: 120).');
      return;
    }

    let target: ExerciseTarget = { type: 'all', id: null, name: 'Tout le groupe' };
    if (blockTargetScope === 'subgroup' && blockTargetSubgroupId) {
      const sg = subgroups.find((s) => s.id === blockTargetSubgroupId);
      target = { type: 'subgroup', id: blockTargetSubgroupId, name: sg ? sg.name : 'Sous-groupe' };
    } else if (blockTargetScope === 'athlete' && blockTargetAthleteId) {
      const m = approvedMembers.find((mem) => mem.user_id === blockTargetAthleteId);
      const prof = (Array.isArray(m?.profile) ? m?.profile[0] : m?.profile) as any;
      const athleteName = prof?.full_name?.trim() || 'Athlète';
      target = { type: 'athlete', id: blockTargetAthleteId, name: athleteName };
    }

    const defaultTitle = `${repsCount} × ${distNum}m (${intensity}%)`;
    const finalName = blockName.trim() || defaultTitle;

    if (editingBlockId) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId
            ? {
                ...b,
                name: finalName,
                distance: distNum,
                repsCount,
                intensity,
                restReps,
                restBlock,
                target,
              }
            : b
        )
      );
    } else {
      const newBlock: RunBlockItem = {
        id: String(uuid.v4()),
        name: finalName,
        distance: distNum,
        repsCount,
        intensity,
        restReps,
        restBlock,
        target,
      };
      setBlocks((prev) => [...prev, newBlock]);
    }

    // Save memory
    AsyncStorage.setItem(STORAGE_RUN_DISTANCE_KEY, String(distNum));
    AsyncStorage.setItem(STORAGE_RUN_REPS_KEY, String(repsCount));
    AsyncStorage.setItem(STORAGE_RUN_INTENSITY_KEY, String(intensity));
    AsyncStorage.setItem(STORAGE_RUN_REST_REPS_KEY, String(restReps));
    AsyncStorage.setItem(STORAGE_RUN_REST_BLOCK_KEY, String(restBlock));

    // Save to library if toggled
    if (saveToLibraryChecked) {
      const newTpl: SavedRunTemplate = {
        id: String(uuid.v4()),
        name: finalName,
        distance: distNum,
        repsCount,
        intensity,
        restReps,
        restBlock,
      };
      const updated = [newTpl, ...savedTemplates];
      setSavedTemplates(updated);
      AsyncStorage.setItem(STORAGE_RUN_TEMPLATES_KEY, JSON.stringify(updated));
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsBlockSheetVisible(false);
  };

  // Mapping blocks to workout database payload
  const mapBlocksToPayload = (items: RunBlockItem[]) => {
    return items.map((blk, idx) => {
      const isLastBlock = idx === items.length - 1;
      const exerciseId = uuid.v4() as string;
      const sets = Array.from({ length: blk.repsCount }).map((_, sIdx) => {
        const isLastRepInBlock = sIdx === blk.repsCount - 1;
        const restSec = isLastRepInBlock ? blk.restBlock : blk.restReps;
        return {
          id: uuid.v4() as string,
          distance: blk.distance,
          intensity: blk.intensity,
          restSeconds: restSec,
        };
      });

      return {
        id: blk.id || (uuid.v4() as string),
        name: blk.name || `Bloc ${idx + 1} : ${blk.repsCount} × ${blk.distance}m`,
        type: 'sprint',
        restAfterBlock: blk.restBlock,
        exercises: [
          {
            id: exerciseId,
            name: `${blk.repsCount} × ${blk.distance}m`,
            target: blk.target,
            sets,
          },
        ],
      };
    });
  };

  // Main Save Workout to Supabase
  const handleSaveWorkout = async () => {
    if (!user?.id) return;
    if (blocks.length === 0) {
      Alert.alert('Séance vide', 'Veuillez ajouter au moins un bloc de course.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;
      const targetDateIso = date.toISOString();

      // Persist surface & equipment in memory
      AsyncStorage.setItem(STORAGE_RUN_SURFACE_KEY, surface);
      AsyncStorage.setItem(STORAGE_RUN_EQUIPMENT_KEY, equipment);

      // In edit mode: delete old workout(s) first
      if (initialWorkout?.id) {
        await workoutService.deleteWorkout(
          initialWorkout.id,
          initialWorkout.group_assignment_id || undefined
        );
      }

      // Build session label and description
      const surfaceLabel = surface === 'cote' ? 'Côte' : 'Piste';
      const equipmentLabel = equipment === 'pointes' ? 'Pointes' : 'Baskets';
      const sessionTypeSeance = surface === 'cote' ? 'Côte' : 'Piste';

      const headerMeta = `[${surfaceLabel} • ${equipmentLabel}]`;
      const finalDescription = sessionNotes.trim()
        ? `${headerMeta} ${sessionNotes.trim()}`
        : `${headerMeta} ${blocks.length} bloc${blocks.length > 1 ? 's' : ''} de ${surfaceLabel.toLowerCase()}`;

      if (targetType === 'team') {
        if (!activeTeamId) {
          Alert.alert('Erreur', 'Aucune équipe active trouvée.');
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

        for (const member of approvedMembers) {
          const athleteFilteredBlocks = blocks.filter((blk) => {
            if (!blk.target || blk.target.type === 'all') return true;
            if (blk.target.type === 'subgroup') return blk.target.id === member.subgroup_id;
            if (blk.target.type === 'athlete') return blk.target.id === member.user_id;
            return false;
          });

          if (athleteFilteredBlocks.length > 0) {
            const mappedBlocks = mapBlocksToPayload(athleteFilteredBlocks);
            const flatExercises = mappedBlocks.flatMap((b) => b.exercises);

            const athletePayload = {
              type_seance: sessionTypeSeance,
              coach_id: user.id,
              team_id: activeTeamId,
              athlete_id: member.user_id,
              group_assignment_id: sharedAssignmentId,
              date_prevue: targetDateIso,
              description: finalDescription,
              exercises: flatExercises,
              blocks: mappedBlocks,
              measures: {
                surface,
                equipment,
              },
              status: 'pending',
            };

            await workoutService.createPlannedWorkout(athletePayload);
            assignedCount++;
          }
        }

        if (assignedCount === 0) {
          Alert.alert(
            'Information',
            'Aucun athlète ne correspond aux cibles choisies pour les blocs.'
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
          const athleteFilteredBlocks = blocks.filter((blk) => {
            if (!blk.target || blk.target.type === 'all' || blk.target.type === 'subgroup') return true;
            if (blk.target.type === 'athlete') return blk.target.id === member.user_id;
            return false;
          });

          if (athleteFilteredBlocks.length > 0) {
            const mappedBlocks = mapBlocksToPayload(athleteFilteredBlocks);
            const flatExercises = mappedBlocks.flatMap((b) => b.exercises);

            const athletePayload = {
              type_seance: sessionTypeSeance,
              coach_id: user.id,
              team_id: activeTeamId,
              subgroup_id: selectedSubgroupId,
              athlete_id: member.user_id,
              group_assignment_id: sharedAssignmentId,
              date_prevue: targetDateIso,
              description: finalDescription,
              exercises: flatExercises,
              blocks: mappedBlocks,
              measures: {
                surface,
                equipment,
              },
              status: 'pending',
            };

            await workoutService.createPlannedWorkout(athletePayload);
          }
        }
      } else {
        // Specific Athlete
        const mappedBlocks = mapBlocksToPayload(blocks);
        const flatExercises = mappedBlocks.flatMap((b) => b.exercises);

        const athletePayload = {
          type_seance: sessionTypeSeance,
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId!,
          date_prevue: targetDateIso,
          description: finalDescription,
          exercises: flatExercises,
          blocks: mappedBlocks,
          measures: {
            surface,
            equipment,
          },
          status: 'pending',
        };

        await workoutService.createPlannedWorkout(athletePayload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving running workout:', err);
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer la séance. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
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
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Course & Sprint</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSaveWorkout}
            disabled={isSubmitting || blocks.length === 0}
            style={[
              styles.headerSaveBtn,
              {
                backgroundColor: blocks.length > 0 ? theme.colors.accent : theme.colors.border,
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

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section: CIBLE */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CIBLE DE LA SÉANCE</Text>
          </View>

          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, targetType === 'team' && { backgroundColor: theme.colors.accent }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTargetType('team');
                }}
              >
                <Text style={[styles.segmentBtnText, { color: targetType === 'team' ? '#FFFFFF' : theme.colors.text }]}>
                  Équipe entière
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, targetType === 'subgroup' && { backgroundColor: theme.colors.accent }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTargetType('subgroup');
                  if (subgroups.length > 0 && !selectedSubgroupId) setSelectedSubgroupId(subgroups[0].id);
                }}
              >
                <Text style={[styles.segmentBtnText, { color: targetType === 'subgroup' ? '#FFFFFF' : theme.colors.text }]}>
                  Sous-groupe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, targetType === 'athlete' && { backgroundColor: theme.colors.accent }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTargetType('athlete');
                  if (approvedMembers.length > 0 && !selectedAthleteId) setSelectedAthleteId(approvedMembers[0].user_id);
                }}
              >
                <Text style={[styles.segmentBtnText, { color: targetType === 'athlete' ? '#FFFFFF' : theme.colors.text }]}>
                  Athlète
                </Text>
              </TouchableOpacity>
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

          {/* Section: CONTEXTE & ÉQUIPEMENT */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>LIEU & ÉQUIPEMENT</Text>
          </View>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Lieu / Surface */}
            <View style={styles.contextRow}>
              <View style={styles.contextLabelBox}>
                <Feather name="map-pin" size={15} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.contextLabelText, { color: theme.colors.text }]}>Lieu</Text>
              </View>
              <View style={styles.segmentedSmall}>
                <TouchableOpacity
                  style={[
                    styles.segmentSmallBtn,
                    surface === 'piste' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSurface('piste');
                  }}
                >
                  <Text style={[styles.segmentSmallText, { color: surface === 'piste' ? '#FFFFFF' : theme.colors.text }]}>
                    🏟️ Piste
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentSmallBtn,
                    surface === 'cote' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSurface('cote');
                  }}
                >
                  <Text style={[styles.segmentSmallText, { color: surface === 'cote' ? '#FFFFFF' : theme.colors.text }]}>
                    ⛰️ Côte
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.rowDivider, { borderBottomColor: theme.colors.border }]} />

            {/* Chaussures */}
            <View style={styles.contextRow}>
              <View style={styles.contextLabelBox}>
                <Ionicons name="footsteps-outline" size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.contextLabelText, { color: theme.colors.text }]}>Chaussures</Text>
              </View>
              <View style={styles.segmentedSmall}>
                <TouchableOpacity
                  style={[
                    styles.segmentSmallBtn,
                    equipment === 'pointes' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEquipment('pointes');
                  }}
                >
                  <Text style={[styles.segmentSmallText, { color: equipment === 'pointes' ? '#FFFFFF' : theme.colors.text }]}>
                    👟 Pointes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentSmallBtn,
                    equipment === 'baskets' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEquipment('baskets');
                  }}
                >
                  <Text style={[styles.segmentSmallText, { color: equipment === 'baskets' ? '#FFFFFF' : theme.colors.text }]}>
                    👟 Baskets
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Section: CONSIGNES */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CONSIGNES DE SÉANCE</Text>
          </View>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text }]}
              placeholder="Ajouter une consigne pour les athlètes (ex: départ arrêté, 3 foulées de relance)..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Section: BLOCS */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
              BLOCS DE COURSE ({blocks.length})
            </Text>
          </View>

          {blocks.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="zap" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun bloc ajouté</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Structurez votre séance en ajoutant un premier bloc de répétitions ci-dessous.
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
                  <Text style={styles.primaryActionText}>Ajouter un bloc</Text>
                </TouchableOpacity>

                {savedTemplates.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryActionBtn,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                    onPress={() => setIsLibraryVisible(true)}
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
                        {savedTemplates.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {blocks.map((item, index) => {
                const isLast = index === blocks.length - 1;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.blockRow,
                      !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                    ]}
                  >
                    <View style={[styles.badgeNumber, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.badgeNumberText}>{index + 1}</Text>
                    </View>

                    <TouchableOpacity style={styles.blockRowCenter} onPress={() => handleStartEdit(item)} activeOpacity={0.7}>
                      <View style={styles.blockNameLine}>
                        <Text style={[styles.blockRowName, { color: theme.colors.text }]} numberOfLines={1}>
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
                      <Text style={[styles.blockRowSubtitle, { color: theme.colors.textSecondary }]}>
                        {item.repsCount} × {item.distance}m  •  {item.intensity}%  •  Rép: {formatRestDisplay(item.restReps)}  •  Bloc: {formatRestDisplay(item.restBlock)}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.blockRowActions}>
                      <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.iconHit}>
                        <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveBlock(item.id)} style={styles.iconHit}>
                        <Feather name="trash-2" size={15} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Add More Row */}
              <TouchableOpacity
                style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                onPress={handleOpenAddSheet}
                activeOpacity={0.7}
              >
                <View style={[styles.actionRowIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                  <Feather name="plus" size={14} color={theme.colors.accent} />
                </View>
                <Text style={[styles.addMoreRowText, { color: theme.colors.accent }]}>Ajouter un autre bloc</Text>
              </TouchableOpacity>

              {/* Library Row */}
              {savedTemplates.length > 0 && (
                <TouchableOpacity
                  style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                  onPress={() => setIsLibraryVisible(true)}
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
                      {savedTemplates.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ========================================================================= */}
        {/* SHEET MODAL: ADD / EDIT BLOCK (Clean Apple Form Sheet)                    */}
        {/* ========================================================================= */}
        <Modal
          visible={isBlockSheetVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsBlockSheetVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.sheetContainer, { backgroundColor: theme.colors.background }]}>
              {/* Sheet Header */}
              <View style={[styles.sheetHeader, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setIsBlockSheetVisible(false)} style={styles.headerTextBtn}>
                  <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  {editingBlockId ? 'Modifier le bloc' : 'Nouveau bloc'}
                </Text>

                <TouchableOpacity onPress={handleSaveBlockSheet} style={[styles.headerSaveBtn, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.headerSaveBtnText}>{editingBlockId ? 'Enregistrer' : 'Ajouter'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
              >
                {/* 1. NOM DU BLOC */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>NOM DU BLOC (OPTIONNEL)</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TextInput
                    style={[styles.singleLineInput, { color: theme.colors.text }]}
                    placeholder={`Ex: Bloc ${blocks.length + 1} ou Sprint départ arrêté`}
                    placeholderTextColor={theme.colors.textMuted}
                    value={blockName}
                    onChangeText={setBlockName}
                  />
                </View>

                {/* 2. DISTANCE (MANUELLE + PRESETS) */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>DISTANCE (MÈTRES)</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 16 }]}>
                  {/* Manual freeform input */}
                  <View style={styles.manualDistanceRow}>
                    <Text style={[styles.distanceLabel, { color: theme.colors.textSecondary }]}>Distance exacte</Text>
                    <View style={[styles.distanceInputBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                      <TextInput
                        style={[styles.distanceInputField, { color: theme.colors.text }]}
                        keyboardType="number-pad"
                        value={manualDistanceText}
                        onChangeText={setManualDistanceText}
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text style={[styles.meterUnitText, { color: theme.colors.accent }]}>m</Text>
                    </View>
                  </View>

                  {/* Preset chips for fast selection */}
                  <Text style={[styles.presetSubLabel, { color: theme.colors.textSecondary }]}>Distances courantes</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                    {PRESET_DISTANCES.map((d) => {
                      const isSelected = manualDistanceText === String(d);
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setManualDistanceText(String(d));
                          }}
                        >
                          <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                            {d}m
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 3. RÉPÉTITIONS & INTENSITÉ */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>RÉPÉTITIONS & INTENSITÉ</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {/* Stepper Reps */}
                  <View style={styles.paramRow}>
                    <View style={styles.paramLabelBox}>
                      <Text style={[styles.paramRowTitle, { color: theme.colors.text }]}>Répétitions</Text>
                      <Text style={[styles.paramRowSub, { color: theme.colors.textSecondary }]}>Nombre de courses dans le bloc</Text>
                    </View>
                    <View style={styles.stepperBox}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceLight }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setRepsCount((r) => Math.max(1, r - 1));
                        }}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValueText, { color: theme.colors.text }]}>{repsCount}</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceLight }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setRepsCount((r) => r + 1);
                        }}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.rowDivider, { borderBottomColor: theme.colors.border }]} />

                  {/* Preset chips for reps */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {PRESET_REPS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.chipCompact,
                            {
                              backgroundColor: repsCount === r ? theme.colors.accent + '20' : theme.colors.background,
                              borderColor: repsCount === r ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setRepsCount(r);
                          }}
                        >
                          <Text style={[styles.chipText, { color: repsCount === r ? theme.colors.accent : theme.colors.text }]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={[styles.rowDivider, { borderBottomColor: theme.colors.border }]} />

                  {/* Stepper Intensity */}
                  <View style={styles.paramRow}>
                    <View style={styles.paramLabelBox}>
                      <Text style={[styles.paramRowTitle, { color: theme.colors.text }]}>Intensité</Text>
                      <Text style={[styles.paramRowSub, { color: theme.colors.textSecondary }]}>Pourcentage de la vitesse max</Text>
                    </View>
                    <View style={styles.stepperBox}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceLight }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setIntensity((i) => Math.max(50, i - 5));
                        }}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValueText, { color: theme.colors.text }]}>{intensity}%</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceLight }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setIntensity((i) => Math.min(100, i + 5));
                        }}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Preset chips for intensity */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {PRESET_INTENSITIES.map((i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.chipCompact,
                            {
                              backgroundColor: intensity === i ? theme.colors.accent + '20' : theme.colors.background,
                              borderColor: intensity === i ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setIntensity(i);
                          }}
                        >
                          <Text style={[styles.chipText, { color: intensity === i ? theme.colors.accent : theme.colors.text }]}>
                            {i}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* 4. TEMPS DE REPOS */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>TEMPS DE RÉCUPÉRATION</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {/* Rest between reps */}
                  <TouchableOpacity
                    style={styles.clickableRow}
                    onPress={() => setIsRestRepsPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clickableRowLeft}>
                      <Text style={[styles.clickableRowTitle, { color: theme.colors.text }]}>Repos entre répétitions</Text>
                      <Text style={[styles.clickableRowSub, { color: theme.colors.textSecondary }]}>
                        Entre chaque {manualDistanceText || '100'}m
                      </Text>
                    </View>
                    <View style={styles.clickableRowRight}>
                      <Text style={[styles.clickableRowValue, { color: theme.colors.accent }]}>
                        {formatRestDisplay(restReps)}
                      </Text>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.rowDivider, { borderBottomColor: theme.colors.border }]} />

                  {/* Rest after block */}
                  <TouchableOpacity
                    style={styles.clickableRow}
                    onPress={() => setIsRestBlockPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clickableRowLeft}>
                      <Text style={[styles.clickableRowTitle, { color: theme.colors.text }]}>Repos après le bloc</Text>
                      <Text style={[styles.clickableRowSub, { color: theme.colors.textSecondary }]}>
                        Avant d'attaquer le bloc suivant
                      </Text>
                    </View>
                    <View style={styles.clickableRowRight}>
                      <Text style={[styles.clickableRowValue, { color: theme.colors.accent }]}>
                        {formatRestDisplay(restBlock)}
                      </Text>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 5. CIBLE DU BLOC (OPTIONNEL) */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
                    CIBLE SPÉCIFIQUE POUR CE BLOC
                  </Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, blockTargetScope === 'inherit' && { backgroundColor: theme.colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBlockTargetScope('inherit');
                      }}
                    >
                      <Text style={[styles.segmentBtnText, { color: blockTargetScope === 'inherit' ? '#FFFFFF' : theme.colors.text }]}>
                        Toute la séance
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.segmentBtn, blockTargetScope === 'subgroup' && { backgroundColor: theme.colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBlockTargetScope('subgroup');
                      }}
                    >
                      <Text style={[styles.segmentBtnText, { color: blockTargetScope === 'subgroup' ? '#FFFFFF' : theme.colors.text }]}>
                        Sous-groupe
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.segmentBtn, blockTargetScope === 'athlete' && { backgroundColor: theme.colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBlockTargetScope('athlete');
                      }}
                    >
                      <Text style={[styles.segmentBtnText, { color: blockTargetScope === 'athlete' ? '#FFFFFF' : theme.colors.text }]}>
                        Athlète
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {blockTargetScope === 'subgroup' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                      {subgroups.map((sg) => {
                        const isSelected = blockTargetSubgroupId === sg.id;
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
                            onPress={() => setBlockTargetSubgroupId(sg.id)}
                          >
                            <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                              {sg.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {blockTargetScope === 'athlete' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                      {approvedMembers.map((m) => {
                        const isSelected = blockTargetAthleteId === m.user_id;
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
                            onPress={() => setBlockTargetAthleteId(m.user_id)}
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

                {/* 6. OPTION: ENREGISTRER DANS LA BIBLIOTHÈQUE */}
                {!editingBlockId && (
                  <View style={{ marginTop: 14 }}>
                    <TouchableOpacity
                      style={[
                        styles.librarySaveToggleRow,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSaveToLibraryChecked(!saveToLibraryChecked);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkboxIcon, { borderColor: saveToLibraryChecked ? theme.colors.accent : theme.colors.border, backgroundColor: saveToLibraryChecked ? theme.colors.accent : 'transparent' }]}>
                        {saveToLibraryChecked && <Feather name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                          Mémoriser ce bloc dans ma bibliothèque
                        </Text>
                        <Text style={[styles.checkboxSub, { color: theme.colors.textSecondary }]}>
                          Pour le réutiliser en 1 clic dans vos prochaines séances
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL: BIBLIOTHÈQUE DE BLOCS (Modern Vertical List with "Choisir")        */}
        {/* ========================================================================= */}
        <Modal
          visible={isLibraryVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsLibraryVisible(false)}
        >
          <View style={[styles.sheetContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.sheetHeader, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setIsLibraryVisible(false)} style={styles.headerTextBtn}>
                <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Fermer</Text>
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ma bibliothèque</Text>

              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
                  MODÈLES ENREGISTRÉS ({savedTemplates.length})
                </Text>
              </View>

              {savedTemplates.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Bibliothèque vide</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Vos blocs enregistrés apparaîtront ici pour être réutilisés en un clic.
                  </Text>
                </View>
              ) : (
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {savedTemplates.map((tpl, index) => {
                    const isLast = index === savedTemplates.length - 1;
                    return (
                      <View
                        key={tpl.id}
                        style={[
                          styles.libraryRow,
                          !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={[styles.libraryTitle, { color: theme.colors.text }]}>{tpl.name}</Text>
                          <Text style={[styles.librarySubtitle, { color: theme.colors.textSecondary }]}>
                            {tpl.repsCount} × {tpl.distance}m  •  {tpl.intensity}%  •  Rép: {formatRestDisplay(tpl.restReps)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.libraryPickBtn, { backgroundColor: theme.colors.accent }]}
                          onPress={() => handleSelectTemplate(tpl)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.libraryPickBtnText}>Choisir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.libraryTrashBtn}
                          onPress={() => handleDeleteTemplate(tpl.id)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={15} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* REST PICKER MODALS */}
        <RestTimePickerModal
          visible={isRestRepsPickerVisible}
          initialSeconds={restReps}
          title="Repos entre répétitions"
          onClose={() => setIsRestRepsPickerVisible(false)}
          onConfirm={(secs: number) => setRestReps(secs)}
        />

        <RestTimePickerModal
          visible={isRestBlockPickerVisible}
          initialSeconds={restBlock}
          title="Repos après le bloc"
          onClose={() => setIsRestBlockPickerVisible(false)}
          onConfirm={(secs: number) => setRestBlock(secs)}
        />
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
  headerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerCancelText: {
    fontSize: 16,
    fontWeight: '400',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  headerSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderBetween: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  groupedCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subScroll: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contextLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextLabelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  segmentedSmall: {
    flexDirection: 'row',
    backgroundColor: '#00000008',
    padding: 3,
    borderRadius: 10,
  },
  segmentSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentSmallText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 80,
    lineHeight: 20,
  },
  singleLineInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
  },
  primaryActionIconBox: {
    marginRight: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  secondaryActionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  blockRowCenter: {
    flex: 1,
    marginRight: 8,
  },
  blockNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  blockRowName: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  targetMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  targetMiniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  blockRowSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  blockRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconHit: {
    padding: 6,
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRowIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addMoreRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  manualDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  distanceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 100,
  },
  distanceInputField: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 50,
    paddingVertical: 0,
  },
  meterUnitText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  presetSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  presetScroll: {
    marginBottom: 4,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paramLabelBox: {
    flex: 1,
    marginRight: 12,
  },
  paramRowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  paramRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 17,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  clickableRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  clickableRowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  clickableRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  clickableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clickableRowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  librarySaveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkboxIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxSub: {
    fontSize: 12,
    marginTop: 2,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  libraryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  librarySubtitle: {
    fontSize: 12,
  },
  libraryPickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 10,
  },
  libraryPickBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  libraryTrashBtn: {
    padding: 6,
  },
});
