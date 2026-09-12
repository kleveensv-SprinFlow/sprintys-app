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

export interface RunItem {
  id: string;
  distance: number;
  intensity: number; // 5% to 100%
}

export interface RunBlockItem {
  id: string;
  name: string;
  mode: 'identical' | 'varied';
  distance: number; // Used in identical mode
  repsCount: number; // Used in identical mode
  intensity: number; // Used in identical mode
  runs: RunItem[]; // Used in varied mode
  restReps: number; // in seconds
  restBlock: number; // in seconds
  target: ExerciseTarget;
}

export interface WorkoutTemplateItem {
  id: string;
  name: string;
  surface: 'piste' | 'cote';
  equipment: 'pointes' | 'baskets';
  description?: string;
  blocks: RunBlockItem[];
  created_at?: string;
}

const STORAGE_RUN_SURFACE_KEY = '@sprintflow_run_last_surface';
const STORAGE_RUN_EQUIPMENT_KEY = '@sprintflow_run_last_equipment';
const STORAGE_RUN_DISTANCE_KEY = '@sprintflow_run_last_distance';
const STORAGE_RUN_REPS_KEY = '@sprintflow_run_last_reps';
const STORAGE_RUN_INTENSITY_KEY = '@sprintflow_run_last_intensity';
const STORAGE_RUN_REST_REPS_KEY = '@sprintflow_run_last_rest_reps';
const STORAGE_RUN_REST_BLOCK_KEY = '@sprintflow_run_last_rest_block';
const STORAGE_RUN_FAVORITES_KEY = '@sprintflow_run_favorites_cache';

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

  // Add / Edit Block Sheet
  const [isBlockSheetVisible, setIsBlockSheetVisible] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Block Form State
  const [blockMode, setBlockMode] = useState<'identical' | 'varied'>('identical');
  const [blockName, setBlockName] = useState('');
  const [manualDistanceText, setManualDistanceText] = useState('120');
  const [repsCount, setRepsCount] = useState<number>(3);
  const [intensity, setIntensity] = useState<number>(95);
  const [variedRuns, setVariedRuns] = useState<RunItem[]>([
    { id: '1', distance: 120, intensity: 95 },
    { id: '2', distance: 150, intensity: 95 },
    { id: '3', distance: 120, intensity: 95 },
  ]);
  const [restReps, setRestReps] = useState<number>(180);
  const [restBlock, setRestBlock] = useState<number>(360);

  // Target override per block
  const [blockTargetScope, setBlockTargetScope] = useState<'inherit' | 'subgroup' | 'athlete'>('inherit');
  const [blockTargetSubgroupId, setBlockTargetSubgroupId] = useState<string | null>(null);
  const [blockTargetAthleteId, setBlockTargetAthleteId] = useState<string | null>(null);

  // Rest Picker Modals
  const [isRestRepsPickerVisible, setIsRestRepsPickerVisible] = useState(false);
  const [isRestBlockPickerVisible, setIsRestBlockPickerVisible] = useState(false);

  // Séances Types Modal
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [templatesTab, setTemplatesTab] = useState<'favorites' | 'recents'>('favorites');
  const [favoriteTemplates, setFavoriteTemplates] = useState<WorkoutTemplateItem[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Save Favorite Modal
  const [isSaveFavoriteModalVisible, setIsSaveFavoriteModalVisible] = useState(false);
  const [favoriteTitleInput, setFavoriteTitleInput] = useState('');
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approved athletes
  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved');
  }, [teamMembers]);

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
      if (savedInt) setIntensity(Math.min(100, Math.max(5, parseInt(savedInt, 10) || 95)));
      if (savedRestReps) setRestReps(Math.max(10, parseInt(savedRestReps, 10) || 180));
      if (savedRestBlk) setRestBlock(Math.max(0, parseInt(savedRestBlk, 10) || 360));
    } catch (e) {
      console.warn('Error loading run memory:', e);
    }
  };

  // Convert raw block from DB into RunBlockItem
  const parseRawBlock = (blk: any, idx: number): RunBlockItem => {
    const exercises = blk.exercises || [];
    const firstEx = exercises[0] || {};
    const sets = firstEx.sets || [];

    // Check if distances in sets differ
    const distances = sets.map((s: any) => s.distance || 100);
    const isVaried = distances.length > 1 && distances.some((d: number) => d !== distances[0]);

    if (isVaried) {
      const runs: RunItem[] = sets.map((s: any) => ({
        id: s.id || String(uuid.v4()),
        distance: s.distance || 100,
        intensity: s.intensity || 95,
      }));
      return {
        id: blk.id || String(uuid.v4()),
        name: blk.name || `Bloc ${idx + 1}`,
        mode: 'varied',
        distance: runs[0]?.distance || 100,
        repsCount: runs.length,
        intensity: runs[0]?.intensity || 95,
        runs,
        restReps: sets[0]?.restSeconds || 180,
        restBlock: blk.restAfterBlock || 360,
        target: firstEx.target || { type: 'all', id: null, name: 'Tout le groupe' },
      };
    } else {
      const firstSet = sets[0] || {};
      const dist = firstSet.distance || 100;
      const reps = sets.length || 3;
      const intens = firstSet.intensity || 95;
      return {
        id: blk.id || String(uuid.v4()),
        name: blk.name || `Bloc ${idx + 1}`,
        mode: 'identical',
        distance: dist,
        repsCount: reps,
        intensity: intens,
        runs: [],
        restReps: firstSet.restSeconds || 180,
        restBlock: blk.restAfterBlock || 360,
        target: firstEx.target || { type: 'all', id: null, name: 'Tout le groupe' },
      };
    }
  };

  // Initialize on modal open
  useEffect(() => {
    if (visible) {
      loadRunMemory();

      if (initialWorkout) {
        const desc = initialWorkout.description || '';
        setSessionNotes(desc);

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

        if (initialWorkout.subgroup_id) {
          setTargetType('subgroup');
          setSelectedSubgroupId(initialWorkout.subgroup_id);
        } else if (initialWorkout.athlete_id && !initialWorkout.group_assignment_id) {
          setTargetType('athlete');
          setSelectedAthleteId(initialWorkout.athlete_id);
        } else {
          setTargetType('team');
        }

        if (initialWorkout.blocks && Array.isArray(initialWorkout.blocks) && initialWorkout.blocks.length > 0) {
          setBlocks(initialWorkout.blocks.map(parseRawBlock));
        } else if (initialWorkout.exercises && Array.isArray(initialWorkout.exercises)) {
          const fakeBlock = {
            id: String(uuid.v4()),
            name: 'Corps de séance',
            exercises: initialWorkout.exercises,
          };
          setBlocks([parseRawBlock(fakeBlock, 0)]);
        }
      } else {
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

  const getBlockSummary = (blk: RunBlockItem) => {
    if (blk.mode === 'varied' && blk.runs && blk.runs.length > 0) {
      const distStr = blk.runs.map((r) => `${r.distance}m`).join(' - ');
      return `${distStr}  •  Rép: ${formatRestDisplay(blk.restReps)}  •  Bloc: ${formatRestDisplay(blk.restBlock)}`;
    }
    return `${blk.repsCount} × ${blk.distance}m  •  ${blk.intensity}%  •  Rép: ${formatRestDisplay(blk.restReps)}  •  Bloc: ${formatRestDisplay(blk.restBlock)}`;
  };

  // Open Add Sheet
  const handleOpenAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBlockId(null);
    setBlockMode('identical');
    setBlockName(`Bloc ${blocks.length + 1}`);
    setBlockTargetScope('inherit');
    setBlockTargetSubgroupId(subgroups[0]?.id || null);
    setBlockTargetAthleteId(approvedMembers[0]?.user_id || null);
    setVariedRuns([
      { id: String(uuid.v4()), distance: 120, intensity: 95 },
      { id: String(uuid.v4()), distance: 150, intensity: 95 },
      { id: String(uuid.v4()), distance: 120, intensity: 95 },
    ]);
    setIsBlockSheetVisible(true);
  };

  // Open Edit Sheet
  const handleStartEdit = (block: RunBlockItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBlockId(block.id);
    setBlockMode(block.mode || 'identical');
    setBlockName(block.name);
    setManualDistanceText(String(block.distance));
    setRepsCount(block.repsCount);
    setIntensity(block.intensity);
    if (block.runs && block.runs.length > 0) {
      setVariedRuns(block.runs.map((r) => ({ ...r })));
    } else {
      setVariedRuns([
        { id: String(uuid.v4()), distance: block.distance, intensity: block.intensity },
      ]);
    }
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

    setIsBlockSheetVisible(true);
  };

  const handleRemoveBlock = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // Varied Runs Management inside Block Sheet
  const handleAddRunToBlock = () => {
    Haptics.selectionAsync();
    const lastRun = variedRuns[variedRuns.length - 1];
    const nextDist = lastRun ? lastRun.distance : 120;
    const nextInt = lastRun ? lastRun.intensity : 95;
    setVariedRuns((prev) => [
      ...prev,
      { id: String(uuid.v4()), distance: nextDist, intensity: nextInt },
    ]);
  };

  const handleRemoveRunFromBlock = (runId: string) => {
    Haptics.selectionAsync();
    if (variedRuns.length <= 1) {
      Alert.alert('Attention', 'Un bloc doit comporter au moins une course.');
      return;
    }
    setVariedRuns((prev) => prev.filter((r) => r.id !== runId));
  };

  const handleUpdateRunField = (runId: string, field: 'distance' | 'intensity', val: number) => {
    setVariedRuns((prev) =>
      prev.map((r) => (r.id === runId ? { ...r, [field]: val } : r))
    );
  };

  // Submit Block Sheet
  const handleSaveBlockSheet = () => {
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

    if (blockMode === 'identical') {
      const distNum = parseInt(manualDistanceText, 10);
      if (isNaN(distNum) || distNum <= 0) {
        Alert.alert('Distance invalide', 'Veuillez saisir une distance valide en mètres.');
        return;
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
                  mode: 'identical',
                  distance: distNum,
                  repsCount,
                  intensity,
                  runs: [],
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
          mode: 'identical',
          distance: distNum,
          repsCount,
          intensity,
          runs: [],
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
    } else {
      // Varied mode
      if (variedRuns.length === 0) {
        Alert.alert('Bloc vide', 'Veuillez ajouter au moins une course.');
        return;
      }

      const distSummary = variedRuns.map((r) => `${r.distance}m`).join(' - ');
      const finalName = blockName.trim() || `Bloc : ${distSummary}`;

      if (editingBlockId) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === editingBlockId
              ? {
                  ...b,
                  name: finalName,
                  mode: 'varied',
                  distance: variedRuns[0].distance,
                  repsCount: variedRuns.length,
                  intensity: variedRuns[0].intensity,
                  runs: variedRuns,
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
          mode: 'varied',
          distance: variedRuns[0].distance,
          repsCount: variedRuns.length,
          intensity: variedRuns[0].intensity,
          runs: variedRuns,
          restReps,
          restBlock,
          target,
        };
        setBlocks((prev) => [...prev, newBlock]);
      }

      AsyncStorage.setItem(STORAGE_RUN_REST_REPS_KEY, String(restReps));
      AsyncStorage.setItem(STORAGE_RUN_REST_BLOCK_KEY, String(restBlock));
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsBlockSheetVisible(false);
  };

  // Séances Types: Load Templates & Recents
  const loadTemplatesData = async () => {
    if (!user?.id) return;
    setIsLoadingTemplates(true);
    try {
      // 1. Favorites from Supabase + Cache
      const supaFavorites = await workoutService.fetchWorkoutTemplates(user.id);
      if (supaFavorites && supaFavorites.length > 0) {
        const mapped: WorkoutTemplateItem[] = supaFavorites.map((t: any) => ({
          id: t.id,
          name: t.name,
          surface: t.measures?.surface || 'piste',
          equipment: t.measures?.equipment || 'pointes',
          description: t.description,
          blocks: (t.blocks || []).map(parseRawBlock),
          created_at: t.created_at,
        }));
        setFavoriteTemplates(mapped);
        AsyncStorage.setItem(STORAGE_RUN_FAVORITES_KEY, JSON.stringify(mapped));
      } else {
        const cached = await AsyncStorage.getItem(STORAGE_RUN_FAVORITES_KEY);
        if (cached) setFavoriteTemplates(JSON.parse(cached));
      }

      // 2. Recents (last 5 running workouts)
      const recents = await workoutService.fetchRecentWorkoutsForCoach(user.id, 5);
      setRecentWorkouts(recents || []);
    } catch (e) {
      console.warn('Error loading templates data:', e);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleOpenTemplatesModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadTemplatesData();
    setIsTemplatesModalVisible(true);
  };

  const handleApplyTemplate = (tpl: WorkoutTemplateItem | any, isRecent: boolean = false) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isRecent) {
      const rawBlocks = tpl.blocks || [];
      const parsed = rawBlocks.map(parseRawBlock);
      setBlocks(parsed);

      const desc = tpl.description || '';
      setSessionNotes(desc.replace(/^\[.*?\]\s*/, '').trim());

      const s = tpl.measures?.surface || (tpl.type_seance?.toLowerCase().includes('côte') ? 'cote' : 'piste');
      const e = tpl.measures?.equipment || (desc.toLowerCase().includes('basket') ? 'baskets' : 'pointes');
      setSurface(s);
      setEquipment(e);
    } else {
      setBlocks(tpl.blocks || []);
      setSurface(tpl.surface || 'piste');
      setEquipment(tpl.equipment || 'pointes');
      if (tpl.description) setSessionNotes(tpl.description);
    }

    setIsTemplatesModalVisible(false);
  };

  const handleDeleteFavorite = async (tplId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await workoutService.deleteWorkoutTemplate(tplId);
      const updated = favoriteTemplates.filter((t) => t.id !== tplId);
      setFavoriteTemplates(updated);
      AsyncStorage.setItem(STORAGE_RUN_FAVORITES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting favorite template:', e);
      Alert.alert('Erreur', 'Impossible de supprimer ce favori.');
    }
  };

  // Save Current Session as Favorite
  const handleOpenSaveFavoriteModal = () => {
    if (blocks.length === 0) {
      Alert.alert('Séance vide', 'Ajoutez au moins un bloc avant d’enregistrer la séance en favori.');
      return;
    }
    const defaultTitle = `Séance ${surface === 'cote' ? 'Côte' : 'Piste'} - ${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`;
    setFavoriteTitleInput(defaultTitle);
    setIsSaveFavoriteModalVisible(true);
  };

  const handleConfirmSaveFavorite = async () => {
    if (!user?.id) return;
    const cleanTitle = favoriteTitleInput.trim();
    if (!cleanTitle) {
      Alert.alert('Titre requis', 'Veuillez saisir un nom pour identifier cette séance type.');
      return;
    }

    setIsSavingFavorite(true);
    try {
      const mappedBlocks = mapBlocksToPayload(blocks);
      const payload = {
        coach_id: user.id,
        name: cleanTitle,
        type_seance: surface === 'cote' ? 'Côte' : 'Piste',
        description: sessionNotes.trim() || undefined,
        blocks: mappedBlocks,
        measures: {
          surface,
          equipment,
        },
      };

      const saved = await workoutService.saveWorkoutTemplate(payload);
      const newTemplateItem: WorkoutTemplateItem = {
        id: saved?.[0]?.id || String(uuid.v4()),
        name: cleanTitle,
        surface,
        equipment,
        description: sessionNotes.trim(),
        blocks: [...blocks],
        created_at: new Date().toISOString(),
      };

      const updated = [newTemplateItem, ...favoriteTemplates];
      setFavoriteTemplates(updated);
      AsyncStorage.setItem(STORAGE_RUN_FAVORITES_KEY, JSON.stringify(updated));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSaveFavoriteModalVisible(false);
      Alert.alert('Succès', 'Séance enregistrée dans vos séances types favorites !');
    } catch (err) {
      console.error('Error saving favorite template:', err);
      Alert.alert('Erreur', "Impossible d'enregistrer le favori.");
    } finally {
      setIsSavingFavorite(false);
    }
  };

  // Mapping blocks to database payload
  const mapBlocksToPayload = (items: RunBlockItem[]) => {
    return items.map((blk, idx) => {
      const isLastBlock = idx === items.length - 1;
      const exerciseId = uuid.v4() as string;

      let sets: any[] = [];
      let summaryName = '';

      if (blk.mode === 'varied' && blk.runs && blk.runs.length > 0) {
        summaryName = blk.runs.map((r) => `${r.distance}m`).join(' - ');
        sets = blk.runs.map((r, sIdx) => {
          const isLastRun = sIdx === blk.runs.length - 1;
          return {
            id: uuid.v4() as string,
            distance: r.distance,
            intensity: r.intensity,
            restSeconds: isLastRun ? blk.restBlock : blk.restReps,
          };
        });
      } else {
        summaryName = `${blk.repsCount} × ${blk.distance}m`;
        sets = Array.from({ length: blk.repsCount }).map((_, sIdx) => {
          const isLastRep = sIdx === blk.repsCount - 1;
          return {
            id: uuid.v4() as string,
            distance: blk.distance,
            intensity: blk.intensity,
            restSeconds: isLastRep ? blk.restBlock : blk.restReps,
          };
        });
      }

      return {
        id: blk.id || (uuid.v4() as string),
        name: blk.name || `Bloc ${idx + 1} : ${summaryName}`,
        type: 'sprint',
        restAfterBlock: blk.restBlock,
        exercises: [
          {
            id: exerciseId,
            name: summaryName,
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

      AsyncStorage.setItem(STORAGE_RUN_SURFACE_KEY, surface);
      AsyncStorage.setItem(STORAGE_RUN_EQUIPMENT_KEY, equipment);

      if (initialWorkout?.id) {
        await workoutService.deleteWorkout(
          initialWorkout.id,
          initialWorkout.group_assignment_id || undefined
        );
      }

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
          Alert.alert('Aucun athlète', "Aucun athlète validé n'a été trouvé dans votre équipe.");
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
          Alert.alert('Information', 'Aucun athlète ne correspond aux cibles choisies.');
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
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer la séance.");
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
            {/* Lieu */}
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
              placeholder="Ajouter une consigne pour les athlètes (ex: départ arrêté, relance aux 50m)..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Section: BLOCS */}
          <View style={styles.sectionHeaderBetweenRow}>
            <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
              BLOCS DE COURSE ({blocks.length})
            </Text>

            {blocks.length > 0 && (
              <TouchableOpacity
                style={styles.saveFavHeaderLink}
                onPress={handleOpenSaveFavoriteModal}
                activeOpacity={0.7}
              >
                <Feather name="star" size={13} color={theme.colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.saveFavHeaderText, { color: theme.colors.accent }]}>
                  Enregistrer en séance type
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {blocks.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="zap" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun bloc ajouté</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Créez vos répétitions de course ou chargez une séance type en un clic.
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

                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={handleOpenTemplatesModal}
                  activeOpacity={0.7}
                >
                  <View style={[styles.secondaryActionIconBox, { backgroundColor: theme.colors.accent + '15' }]}>
                    <Feather name="copy" size={15} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>
                    Séances types
                  </Text>
                </TouchableOpacity>
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
                        {getBlockSummary(item)}
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

              {/* Séances Types Row */}
              <TouchableOpacity
                style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                onPress={handleOpenTemplatesModal}
                activeOpacity={0.7}
              >
                <View style={[styles.actionRowIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                  <Feather name="copy" size={13} color={theme.colors.accent} />
                </View>
                <Text style={[styles.addMoreRowText, { color: theme.colors.text }]}>
                  Séances types (Favoris & Récents)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ========================================================================= */}
        {/* SHEET MODAL: ADD / EDIT BLOCK (Pure minimalist form)                      */}
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
                    placeholder={`Ex: Bloc ${blocks.length + 1} ou Vitesse max`}
                    placeholderTextColor={theme.colors.textMuted}
                    value={blockName}
                    onChangeText={setBlockName}
                  />
                </View>

                {/* 2. MODE DU BLOC (IDENTIQUE VS VARIÉ) */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>STRUCTURE DU BLOC</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, blockMode === 'identical' && { backgroundColor: theme.colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBlockMode('identical');
                      }}
                    >
                      <Text style={[styles.segmentBtnText, { color: blockMode === 'identical' ? '#FFFFFF' : theme.colors.text }]}>
                        Répétitions identiques
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.segmentBtn, blockMode === 'varied' && { backgroundColor: theme.colors.accent }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setBlockMode('varied');
                      }}
                    >
                      <Text style={[styles.segmentBtnText, { color: blockMode === 'varied' ? '#FFFFFF' : theme.colors.text }]}>
                        Enchaînement varié
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* --- MODE A: RÉPÉTITIONS IDENTIQUES --- */}
                {blockMode === 'identical' ? (
                  <>
                    {/* Distance Manuelle pure (aucune pilule superflue) */}
                    <View style={styles.sectionHeaderBetween}>
                      <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>DISTANCE (MÈTRES)</Text>
                    </View>
                    <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 16 }]}>
                      <View style={styles.manualDistanceRow}>
                        <Text style={[styles.distanceLabel, { color: theme.colors.text }]}>Distance de course</Text>
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
                    </View>

                    {/* Répétitions & Intensité (5% à 100% bloqué) */}
                    <View style={styles.sectionHeaderBetween}>
                      <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>RÉPÉTITIONS & INTENSITÉ</Text>
                    </View>
                    <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      {/* Reps Stepper */}
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

                      {/* Intensity Stepper (5% à 100% max) */}
                      <View style={styles.paramRow}>
                        <View style={styles.paramLabelBox}>
                          <Text style={[styles.paramRowTitle, { color: theme.colors.text }]}>Intensité</Text>
                          <Text style={[styles.paramRowSub, { color: theme.colors.textSecondary }]}>De 5% à 100% max</Text>
                        </View>
                        <View style={styles.stepperBox}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: theme.colors.surfaceLight }]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setIntensity((i) => Math.max(5, i - 5));
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
                    </View>
                  </>
                ) : (
                  /* --- MODE B: ENCHAÎNEMENT VARIÉ (ex: 120m, 150m, 120m) --- */
                  <>
                    <View style={styles.sectionHeaderBetweenRow}>
                      <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>
                        COURSES DU BLOC ({variedRuns.length})
                      </Text>
                      <TouchableOpacity onPress={handleAddRunToBlock} style={styles.addRunHeaderBtn}>
                        <Feather name="plus-circle" size={14} color={theme.colors.accent} style={{ marginRight: 4 }} />
                        <Text style={[styles.addRunHeaderBtnText, { color: theme.colors.accent }]}>Ajouter une course</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      {variedRuns.map((runItem, runIdx) => {
                        const isLastRun = runIdx === variedRuns.length - 1;
                        return (
                          <View
                            key={runItem.id}
                            style={[
                              styles.variedRunRow,
                              !isLastRun && [styles.rowDivider, { borderBottomColor: theme.colors.border }],
                            ]}
                          >
                            <View style={[styles.variedIndexBadge, { backgroundColor: theme.colors.accent + '15' }]}>
                              <Text style={[styles.variedIndexText, { color: theme.colors.accent }]}>{runIdx + 1}</Text>
                            </View>

                            {/* Distance field */}
                            <View style={styles.variedFieldCol}>
                              <Text style={[styles.variedFieldSub, { color: theme.colors.textSecondary }]}>Distance</Text>
                              <View style={[styles.variedInputBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                                <TextInput
                                  style={[styles.variedInput, { color: theme.colors.text }]}
                                  keyboardType="number-pad"
                                  value={String(runItem.distance)}
                                  onChangeText={(t) => {
                                    const parsed = parseInt(t, 10);
                                    handleUpdateRunField(runItem.id, 'distance', isNaN(parsed) ? 0 : parsed);
                                  }}
                                  maxLength={5}
                                  selectTextOnFocus
                                />
                                <Text style={[styles.meterUnitText, { color: theme.colors.accent }]}>m</Text>
                              </View>
                            </View>

                            {/* Intensity field */}
                            <View style={styles.variedFieldCol}>
                              <Text style={[styles.variedFieldSub, { color: theme.colors.textSecondary }]}>Intensité</Text>
                              <View style={[styles.variedInputBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                                <TextInput
                                  style={[styles.variedInput, { color: theme.colors.text }]}
                                  keyboardType="number-pad"
                                  value={String(runItem.intensity)}
                                  onChangeText={(t) => {
                                    const parsed = parseInt(t, 10);
                                    const bounded = isNaN(parsed) ? 5 : Math.min(100, Math.max(5, parsed));
                                    handleUpdateRunField(runItem.id, 'intensity', bounded);
                                  }}
                                  maxLength={3}
                                  selectTextOnFocus
                                />
                                <Text style={[styles.meterUnitText, { color: theme.colors.accent }]}>%</Text>
                              </View>
                            </View>

                            {/* Delete run button */}
                            {variedRuns.length > 1 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveRunFromBlock(runItem.id)}
                                style={styles.iconHit}
                              >
                                <Feather name="trash-2" size={15} color={theme.colors.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}

                      <TouchableOpacity
                        style={[styles.addMoreRow, { borderTopColor: theme.colors.border }]}
                        onPress={handleAddRunToBlock}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.actionRowIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                          <Feather name="plus" size={14} color={theme.colors.accent} />
                        </View>
                        <Text style={[styles.addMoreRowText, { color: theme.colors.accent }]}>
                          Ajouter une course dans ce bloc
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* 4. TEMPS DE REPOS */}
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>TEMPS DE RÉCUPÉRATION</Text>
                </View>
                <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={styles.clickableRow}
                    onPress={() => setIsRestRepsPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clickableRowLeft}>
                      <Text style={[styles.clickableRowTitle, { color: theme.colors.text }]}>Repos entre répétitions</Text>
                      <Text style={[styles.clickableRowSub, { color: theme.colors.textSecondary }]}>
                        Entre chaque course du bloc
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

                {/* 5. CIBLE DU BLOC */}
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

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL: SÉANCES TYPES (Favoris & 5 Dernières créées)                       */}
        {/* ========================================================================= */}
        <Modal
          visible={isTemplatesModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsTemplatesModalVisible(false)}
        >
          <View style={[styles.sheetContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.sheetHeader, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setIsTemplatesModalVisible(false)} style={styles.headerTextBtn}>
                <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Fermer</Text>
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Séances types</Text>

              <View style={{ width: 60 }} />
            </View>

            {/* Segmented: Favoris vs Récents */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
              <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.segmentedRow}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, templatesTab === 'favorites' && { backgroundColor: theme.colors.accent }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTemplatesTab('favorites');
                    }}
                  >
                    <Text style={[styles.segmentBtnText, { color: templatesTab === 'favorites' ? '#FFFFFF' : theme.colors.text }]}>
                      ⭐ Favoris ({favoriteTemplates.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.segmentBtn, templatesTab === 'recents' && { backgroundColor: theme.colors.accent }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTemplatesTab('recents');
                    }}
                  >
                    <Text style={[styles.segmentBtnText, { color: templatesTab === 'recents' ? '#FFFFFF' : theme.colors.text }]}>
                      🕒 5 Récents ({recentWorkouts.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {isLoadingTemplates ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
              </View>
            ) : (
              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
              >
                {/* TAB 1: FAVORIS */}
                {templatesTab === 'favorites' && (
                  <>
                    {favoriteTemplates.length === 0 ? (
                      <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Feather name="star" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucun favori enregistré</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                          Créez une séance de course et touchez « Enregistrer en séance type » pour la retrouver ici avec votre nom personnalisé.
                        </Text>
                      </View>
                    ) : (
                      favoriteTemplates.map((tpl) => (
                        <View
                          key={tpl.id}
                          style={[
                            styles.templateCard,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          ]}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={[styles.templateCardTitle, { color: theme.colors.text }]}>{tpl.name}</Text>
                            <TouchableOpacity onPress={() => handleDeleteFavorite(tpl.id)} style={styles.iconHit}>
                              <Feather name="trash-2" size={15} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.metaRow}>
                            <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                              <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                                {tpl.surface === 'cote' ? '⛰️ Côte' : '🏟️ Piste'}
                              </Text>
                            </View>
                            <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                              <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                                {tpl.equipment === 'pointes' ? '👟 Pointes' : '👟 Baskets'}
                              </Text>
                            </View>
                            <View style={[styles.metaPill, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
                              <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>
                                {tpl.blocks?.length || 0} bloc{tpl.blocks?.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>

                          {/* Blocks summary */}
                          <View style={styles.templateBlocksPreview}>
                            {(tpl.blocks || []).map((b, bIdx) => (
                              <Text key={b.id || bIdx} style={[styles.templateBlockPreviewLine, { color: theme.colors.textSecondary }]}>
                                • {b.name || getBlockSummary(b)}
                              </Text>
                            ))}
                          </View>

                          <TouchableOpacity
                            style={[styles.applyTemplateBtn, { backgroundColor: theme.colors.accent }]}
                            onPress={() => handleApplyTemplate(tpl, false)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.applyTemplateBtnText}>Appliquer cette séance</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </>
                )}

                {/* TAB 2: RÉCENTS */}
                {templatesTab === 'recents' && (
                  <>
                    {recentWorkouts.length === 0 ? (
                      <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Feather name="clock" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Aucune séance récente</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                          Vos 5 dernières séances créées apparaîtront ici pour être réutilisées d'un simple geste.
                        </Text>
                      </View>
                    ) : (
                      recentWorkouts.map((w, wIdx) => {
                        const dateFormatted = new Date(w.date_prevue).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        });
                        const blocksCount = w.blocks?.length || 1;
                        const surfaceVal = w.measures?.surface || (w.type_seance?.toLowerCase().includes('côte') ? 'cote' : 'piste');
                        const equipVal = w.measures?.equipment || (w.description?.toLowerCase().includes('basket') ? 'baskets' : 'pointes');

                        return (
                          <View
                            key={w.id || wIdx}
                            style={[
                              styles.templateCard,
                              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            ]}
                          >
                            <View style={styles.templateCardHeader}>
                              <Text style={[styles.templateCardTitle, { color: theme.colors.text }]}>
                                Séance du {dateFormatted}
                              </Text>
                            </View>

                            <View style={styles.metaRow}>
                              <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                                <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                                  {surfaceVal === 'cote' ? '⛰️ Côte' : '🏟️ Piste'}
                                </Text>
                              </View>
                              <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                                <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                                  {equipVal === 'pointes' ? '👟 Pointes' : '👟 Baskets'}
                                </Text>
                              </View>
                              <View style={[styles.metaPill, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
                                <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>
                                  {blocksCount} bloc{blocksCount > 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>

                            {/* Summary lines */}
                            <View style={styles.templateBlocksPreview}>
                              {(w.blocks || []).slice(0, 3).map((b: any, bIdx: number) => (
                                <Text key={b.id || bIdx} style={[styles.templateBlockPreviewLine, { color: theme.colors.textSecondary }]}>
                                  • {b.name || `Bloc ${bIdx + 1}`}
                                </Text>
                              ))}
                            </View>

                            <TouchableOpacity
                              style={[styles.applyTemplateBtn, { backgroundColor: theme.colors.accent }]}
                              onPress={() => handleApplyTemplate(w, true)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.applyTemplateBtnText}>Appliquer cette séance</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL: ENREGISTRER COMME SÉANCE TYPE FAVORITE                             */}
        {/* ========================================================================= */}
        <Modal
          visible={isSaveFavoriteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSaveFavoriteModalVisible(false)}
        >
          <View style={styles.alertBackdrop}>
            <View style={[styles.alertModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.alertIconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                <Feather name="star" size={24} color={theme.colors.accent} />
              </View>

              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Enregistrer en séance type</Text>
              <Text style={[styles.alertSubtitle, { color: theme.colors.textSecondary }]}>
                Donnez un titre à cette séance pour la retrouver facilement dans vos favoris.
              </Text>

              <TextInput
                style={[styles.alertInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                value={favoriteTitleInput}
                onChangeText={setFavoriteTitleInput}
                placeholder="Ex: Lactique 120-150-120 ou Vitesse 4x60m"
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
                selectTextOnFocus
              />

              <View style={styles.alertActionsRow}>
                <TouchableOpacity
                  style={[styles.alertCancelBtn, { borderColor: theme.colors.border }]}
                  onPress={() => setIsSaveFavoriteModalVisible(false)}
                  disabled={isSavingFavorite}
                >
                  <Text style={[styles.alertCancelBtnText, { color: theme.colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.alertConfirmBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={handleConfirmSaveFavorite}
                  disabled={isSavingFavorite}
                >
                  {isSavingFavorite ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.alertConfirmBtnText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
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
  sectionHeaderBetweenRow: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveFavHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveFavHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addRunHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addRunHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  distanceLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  distanceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 110,
  },
  distanceInputField: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 0,
  },
  meterUnitText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 17,
    fontWeight: '700',
    minWidth: 48,
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
  variedRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  variedIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variedIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  variedFieldCol: {
    flex: 1,
  },
  variedFieldSub: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  variedInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  variedInput: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    paddingVertical: 0,
  },
  templateCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  templateCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  templateBlocksPreview: {
    marginBottom: 14,
    paddingLeft: 4,
  },
  templateBlockPreviewLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  applyTemplateBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyTemplateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  alertSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  alertInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  alertActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  alertCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
