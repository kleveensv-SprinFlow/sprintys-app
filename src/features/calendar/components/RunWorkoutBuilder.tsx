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
import { theme as staticTheme, useTheme } from '../../../core/theme';
import { glassSurface, glassCard } from '../../../core/glass';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore, useCurrentTeam } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { RestTimePickerModal } from './RestTimePickerModal';
import { MultiTargetSelectorModal, MultiTarget } from '../../../shared/components/MultiTargetSelectorModal';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast, confirmAsync } from '../../../shared/feedback/appAlert';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { TimeField, useSessionTime } from './TimeField';

const BLUE = staticTheme.colors.sprintyBlue;
const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';
const RED_TINT = 'rgba(239, 68, 68, 0.1)';
const ON_BLUE = '#FFFFFF';

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
  targets: { subgroups: string[]; athletes: string[] };
  /** Time goal per run, in seconds (identical blocks only) */
  targetTime?: number;
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
  const sessionTime = useSessionTime(visible, initialWorkout);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers, fetchTeams, fetchTeamMembers, fetchSubgroups } = useCoachStore();
  const currentTeam = useCurrentTeam();
  const ensureTeamLoaded = useCoachStore((st) => st.ensureTeamLoaded);

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
  const [targetTimeText, setTargetTimeText] = useState('');
  const [variedRuns, setVariedRuns] = useState<RunItem[]>([
    { id: '1', distance: 120, intensity: 95 },
    { id: '2', distance: 150, intensity: 95 },
    { id: '3', distance: 120, intensity: 95 },
  ]);
  const [restReps, setRestReps] = useState<number>(180);
  const [restBlock, setRestBlock] = useState<number>(360);

  // Target override per block
  const [blockTargets, setBlockTargets] = useState<{ subgroups: string[], athletes: string[] }>({ subgroups: [], athletes: [] });
  const [isMultiTargetModalVisible, setIsMultiTargetModalVisible] = useState(false);

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

  // Inline validation messages (instead of popups)
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [favoriteTitleError, setFavoriteTitleError] = useState<string | null>(null);

  // Any change to the blocks makes the previous save notice obsolete
  useEffect(() => {
    setSaveNotice(null);
  }, [blocks]);

  // Approved athletes
  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved' && (!currentTeam || m.team_id === currentTeam.id));
  }, [teamMembers, currentTeam?.id]);

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
    const intensities = sets.map((s: any) => s.intensity ?? 95);
    const isVaried =
      distances.length > 1 &&
      (distances.some((d: number) => d !== distances[0]) || intensities.some((i: number) => i !== intensities[0]));

    if (isVaried) {
      const runs: RunItem[] = sets.map((s: any) => ({
        id: s.id || String(uuid.v4()),
        distance: s.distance || 100,
        intensity: s.intensity ?? 95,
      }));
      return {
        id: blk.id || String(uuid.v4()),
        name: blk.name || `Bloc ${idx + 1}`,
        mode: 'varied',
        distance: runs[0]?.distance || 100,
        repsCount: runs.length,
        intensity: runs[0]?.intensity ?? 95,
        runs,
        restReps: sets[0]?.restSeconds ?? 180,
        restBlock: blk.restAfterBlock ?? 360,
        targets: firstEx.targets || { subgroups: [], athletes: [] },
      };
    } else {
      const firstSet = sets[0] || {};
      const dist = firstSet.distance || 100;
      const reps = sets.length || 3;
      const intens = firstSet.intensity ?? 95;
      return {
        id: blk.id || String(uuid.v4()),
        name: blk.name || `Bloc ${idx + 1}`,
        mode: 'identical',
        distance: dist,
        repsCount: reps,
        intensity: intens,
        runs: [],
        restReps: firstSet.restSeconds ?? 180,
        restBlock: blk.restAfterBlock ?? 360,
        targetTime: typeof firstSet.target_time_s === 'number' ? firstSet.target_time_s : undefined,
        targets: firstEx.targets || { subgroups: [], athletes: [] },
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
      const activeTeamId = currentTeam!.id;
      ensureTeamLoaded(activeTeamId);
    }
  }, [visible, currentTeam?.id]);

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

  // Open Add Sheet
  const handleOpenAddSheet = () => {
    setTargetTimeText('');
    setDistanceError(null);
    setEditingBlockId(null);
    setBlockMode('identical');
    setBlockName(`Bloc ${blocks.length + 1}`);
    setBlockTargets({ subgroups: [], athletes: [] });
    setVariedRuns([
      { id: String(uuid.v4()), distance: 120, intensity: 95 },
      { id: String(uuid.v4()), distance: 150, intensity: 95 },
      { id: String(uuid.v4()), distance: 120, intensity: 95 },
    ]);
    setIsBlockSheetVisible(true);
  };

  // Open Edit Sheet
  const handleStartEdit = (block: RunBlockItem) => {
    setDistanceError(null);
    setEditingBlockId(block.id);
    setBlockMode(block.mode || 'identical');
    setBlockName(block.name);
    setManualDistanceText(String(block.distance));
    setRepsCount(block.repsCount);
    setIntensity(block.intensity);
    setTargetTimeText(block.targetTime ? String(block.targetTime).replace('.', ',') : '');
    if (block.runs && block.runs.length > 0) {
      setVariedRuns(block.runs.map((r) => ({ ...r })));
    } else {
      setVariedRuns([
        { id: String(uuid.v4()), distance: block.distance, intensity: block.intensity },
      ]);
    }
    setRestReps(block.restReps);
    setRestBlock(block.restBlock);

    setBlockTargets(block.targets || { subgroups: [], athletes: [] });

    setIsBlockSheetVisible(true);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // Varied Runs Management inside Block Sheet
  const handleAddRunToBlock = () => {
    const lastRun = variedRuns[variedRuns.length - 1];
    const nextDist = lastRun ? lastRun.distance : 120;
    const nextInt = lastRun ? lastRun.intensity : 95;
    setVariedRuns((prev) => [
      ...prev,
      { id: String(uuid.v4()), distance: nextDist, intensity: nextInt },
    ]);
  };

  const handleRemoveRunFromBlock = (runId: string) => {
    if (variedRuns.length <= 1) {
      toast('warning', 'Un bloc doit comporter au moins une course.');
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
    if (blockMode === 'identical') {
      const distNum = parseInt(manualDistanceText, 10);
      if (isNaN(distNum) || distNum <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setDistanceError('Saisis une distance valide en mètres.');
        return;
      }

      const rawTarget = targetTimeText.trim().replace(',', '.');
      let parsedTarget: number | undefined;
      if (rawTarget) {
        // 7.20 or 1:05.3
        const m = rawTarget.match(/^(\d+):(\d+(?:\.\d+)?)$/);
        const v = m ? parseInt(m[1], 10) * 60 + parseFloat(m[2]) : parseFloat(rawTarget);
        if (!Number.isFinite(v) || v <= 0 || v > 3600) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          toast('warning', 'Objectif chrono invalide', 'Écris-le comme 7,20 ou 1:05,3.');
          return;
        }
        parsedTarget = Math.round(v * 100) / 100;
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
                  targets: blockTargets,
                  targetTime: parsedTarget,
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
          targets: blockTargets,
          targetTime: parsedTarget,
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
        toast('warning', 'Ajoute au moins une course à ce bloc.');
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
                  targets: blockTargets,
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
          targets: blockTargets,
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
      const supaFavorites = await workoutService.fetchWorkoutTemplates(user.id, ['Piste', 'Côte']);
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
    const tplName = favoriteTemplates.find((t) => t.id === tplId)?.name;
    const confirmed = await confirmAsync({
      title: 'Supprimer cette séance type ?',
      message: tplName
        ? `« ${tplName} » sera retirée de tes favoris.`
        : 'Elle sera retirée de tes favoris.',
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await workoutService.deleteWorkoutTemplate(tplId);
      const updated = favoriteTemplates.filter((t) => t.id !== tplId);
      setFavoriteTemplates(updated);
      AsyncStorage.setItem(STORAGE_RUN_FAVORITES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting favorite template:', e);
      appAlert('Erreur', 'Impossible de supprimer cette séance type.');
    }
  };

  // Save Current Session as Favorite
  const handleOpenSaveFavoriteModal = () => {
    if (blocks.length === 0) {
      setSaveNotice('Ajoute au moins un bloc avant d’enregistrer la séance en favori.');
      return;
    }
    const defaultTitle = `Séance ${surface === 'cote' ? 'Côte' : 'Piste'} - ${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`;
    setFavoriteTitleInput(defaultTitle);
    setFavoriteTitleError(null);
    setIsSaveFavoriteModalVisible(true);
  };

  const handleConfirmSaveFavorite = async () => {
    if (!user?.id) return;
    const cleanTitle = favoriteTitleInput.trim();
    if (!cleanTitle) {
      setFavoriteTitleError('Donne un nom à cette séance type.');
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
      toast('success', 'Séance ajoutée à tes séances types.');
    } catch (err) {
      console.error('Error saving favorite template:', err);
      appAlert('Erreur', 'Impossible d’enregistrer la séance type.');
    } finally {
      setIsSavingFavorite(false);
    }
  };

  // Mapping blocks to database payload
  const mapBlocksToPayload = (items: RunBlockItem[]) => {
    return items.map((blk, idx) => {
      const isLastBlock = idx === items.length - 1;
      const exerciseId = `${blk.id}_ex`;

      let sets: any[] = [];
      let summaryName = '';

      if (blk.mode === 'varied' && blk.runs && blk.runs.length > 0) {
        summaryName = blk.runs.map((r) => `${r.distance}m`).join(' - ');
        sets = blk.runs.map((r, sIdx) => {
          const isLastRun = sIdx === blk.runs.length - 1;
          return {
            id: `${blk.id}_set_${sIdx}`,
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
            id: `${blk.id}_set_${sIdx}`,
            distance: blk.distance,
            intensity: blk.intensity,
            ...(blk.targetTime ? { target_time_s: blk.targetTime } : {}),
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
            targets: blk.targets,
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
      setSaveNotice('Ajoute au moins un bloc de course avant d’enregistrer.');
      return;
    }

    setSaveNotice(null);
    setIsSubmitting(true);
    try {
      const activeTeamId = currentTeam?.id ?? null;
      const targetDateIso = sessionTime.applyTo(date, 12).toISOString();

      AsyncStorage.setItem(STORAGE_RUN_SURFACE_KEY, surface);
      AsyncStorage.setItem(STORAGE_RUN_EQUIPMENT_KEY, equipment);

      // We NO LONGER delete it here to preserve IDs and efforts!
      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
        const payloadsToUpdate: any[] = [];

        const surfaceLabel = surface === 'cote' ? 'Côte' : 'Piste';
        const equipmentLabel = equipment === 'pointes' ? 'Pointes' : 'Baskets';
        const finalDescription = sessionNotes.trim() || `Séance ${surfaceLabel} en ${equipmentLabel}`;
        const sessionTypeSeance = surface === 'cote' ? 'Côte' : 'Piste';

        if (!activeTeamId) {
          appAlert('Erreur', 'Aucune équipe trouvée.');
          setIsSubmitting(false);
          return;
        }

        if (approvedMembers.length === 0) {
          appAlert(
            'Aucun athlète',
            'Aucun athlète validé dans ton équipe pour recevoir cette séance.'
          );
          setIsSubmitting(false);
          return;
        }

        const sharedAssignmentId = uuid.v4() as string;

        // --- MASTER COPY FOR COACH ---
        const masterMappedBlocks = mapBlocksToPayload(blocks);
        const masterFlatExercises = masterMappedBlocks.flatMap((b) => b.exercises);
        payloadsToUpdate.push({
          type_seance: sessionTypeSeance,
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: user.id, // Coach ID so the coach can always see the full session
          group_assignment_id: sharedAssignmentId,
          date_prevue: targetDateIso,
          description: finalDescription,
          exercises: masterFlatExercises,
          blocks: masterMappedBlocks,
          measures: {
            surface,
            equipment,
            is_master: true,
          },
          status: 'pending',
        });

        for (const member of approvedMembers) {
          const athleteFilteredBlocks = blocks.filter((blk) => {
            const t = blk.targets;
            if (!t || (t.subgroups.length === 0 && t.athletes.length === 0)) return true;
            if (t.subgroups.includes(member.subgroup_id || '')) return true;
            if (t.athletes.includes(member.user_id)) return true;
            return false;
          });

          if (athleteFilteredBlocks.length > 0) {
            const mappedBlocks = mapBlocksToPayload(athleteFilteredBlocks);
            const flatExercises = mappedBlocks.flatMap((b) => b.exercises);

            payloadsToUpdate.push({
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
            });
          }
        }

        if (payloadsToUpdate.length === 0) {
          setSaveNotice('Aucun athlète ne correspond aux cibles choisies pour tes blocs.');
          setIsSubmitting(false);
          return;
        }

        payloadsToUpdate.forEach((p: any) => {
        p.measures = { ...(p.measures || {}), ...sessionTime.flag() };
      });
      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate, initialWorkout?.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('success', initialWorkout ? 'Séance mise à jour.' : 'Séance enregistrée.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving running workout:', err);
      appAlert('Erreur', err?.message || 'Impossible d’enregistrer la séance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers (plain functions, not components, so nothing remounts)
  // ---------------------------------------------------------------------------

  const renderSheetHeader = (opts: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    actionLabel?: string;
    onAction?: () => void;
    loading?: boolean;
    dimmed?: boolean;
  }) => (
    <View style={[styles.sheetHeader, { paddingTop: safeTop }]}>
      <IconButton icon="x" onPress={opts.onClose} accessibilityLabel="Fermer" />
      <View style={styles.sheetHeaderTitles}>
        <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
          {opts.title}
        </Text>
        {opts.subtitle ? (
          <Text style={styles.sheetHeaderSubtitle} numberOfLines={1}>
            {opts.subtitle}
          </Text>
        ) : null}
      </View>
      {opts.actionLabel && opts.onAction ? (
        <PressableScale
          haptic="light"
          onPress={opts.onAction}
          disabled={opts.loading}
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={opts.actionLabel}
          style={[styles.headerPill, opts.dimmed && styles.headerPillDimmed]}
        >
          {opts.loading ? (
            <ActivityIndicator size="small" color={ON_BLUE} />
          ) : (
            <Text style={styles.headerPillText}>{opts.actionLabel}</Text>
          )}
        </PressableScale>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  const renderNotice = (message: string) => (
    <View style={styles.notice} accessibilityRole="alert">
      <Feather name="alert-circle" size={16} color={theme.colors.error} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );

  const renderStepper = (value: string, label: string, onMinus: () => void, onPlus: () => void) => (
    <View style={styles.stepperBox}>
      <PressableScale
        haptic="selection"
        onPress={onMinus}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Diminuer ${label}`}
        style={styles.stepperBtn}
      >
        <Feather name="minus" size={16} color={theme.colors.text} />
      </PressableScale>
      <Text style={styles.stepperValueText}>{value}</Text>
      <PressableScale
        haptic="selection"
        onPress={onPlus}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Augmenter ${label}`}
        style={styles.stepperBtn}
      >
        <Feather name="plus" size={16} color={theme.colors.text} />
      </PressableScale>
    </View>
  );

  const renderTemplateCard = (opts: {
    key: string;
    title: string;
    surfaceVal: string;
    equipVal: string;
    blocksCount: number;
    lines: string[];
    onApply: () => void;
    onDelete?: () => void;
  }) => (
    <View key={opts.key} style={styles.templateCard}>
      <View style={styles.templateCardHeader}>
        <Text style={styles.templateCardTitle} numberOfLines={2}>
          {opts.title}
        </Text>
        {opts.onDelete && (
          <IconButton
            icon="trash-2"
            tone="danger"
            size={34}
            onPress={opts.onDelete}
            accessibilityLabel={`Supprimer ${opts.title}`}
          />
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Feather name="map-pin" size={11} color={BLUE} />
          <Text style={styles.metaPillText}>{opts.surfaceVal === 'cote' ? 'Côte' : 'Piste'}</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillText}>{opts.equipVal === 'pointes' ? 'Pointes' : 'Baskets'}</Text>
        </View>
        <View style={[styles.metaPill, styles.metaPillNeutral]}>
          <Text style={[styles.metaPillText, styles.metaPillTextNeutral]}>
            {opts.blocksCount} bloc{opts.blocksCount > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {opts.lines.length > 0 && (
        <View style={styles.templateBlocksPreview}>
          {opts.lines.map((line, idx) => (
            <View key={idx} style={styles.previewLine}>
              <View style={styles.previewDot} />
              <Text style={styles.previewLineText} numberOfLines={1}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      )}

      <PressableScale
        haptic="none"
        onPress={opts.onApply}
        accessibilityRole="button"
        style={styles.applyTemplateBtn}
      >
        <Feather name="download" size={15} color={ON_BLUE} />
        <Text style={styles.applyTemplateBtnText}>Appliquer cette séance</Text>
      </PressableScale>
    </View>
  );

  const isBlockTargeted = blockTargets.subgroups.length > 0 || blockTargets.athletes.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.container}>
        {renderSheetHeader({
          title: 'Course & sprint',
          subtitle: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
          onClose,
          actionLabel: 'Enregistrer',
          onAction: handleSaveWorkout,
          loading: isSubmitting,
          dimmed: blocks.length === 0,
        })}

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TimeField time={sessionTime.time} onChange={sessionTime.setTime} />
          {/* Section: LIEU & ÉQUIPEMENT */}
          <Text style={[styles.sectionCaption, styles.sectionCaptionFirst]}>Lieu & équipement</Text>
          <View style={styles.groupedCard}>
            <View style={styles.contextRow}>
              <View style={styles.contextLabelBox}>
                <View style={styles.rowIcon}>
                  <Feather name="map-pin" size={15} color={BLUE} />
                </View>
                <Text style={styles.rowTitle}>Lieu</Text>
              </View>
              <SegmentedControl
                options={[
                  { key: 'piste', label: 'Piste' },
                  { key: 'cote', label: 'Côte' },
                ]}
                value={surface}
                onChange={setSurface}
                style={styles.contextSegment}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.contextRow}>
              <View style={styles.contextLabelBox}>
                <View style={styles.rowIcon}>
                  <Feather name="wind" size={15} color={BLUE} />
                </View>
                <Text style={styles.rowTitle}>Chaussures</Text>
              </View>
              <SegmentedControl
                options={[
                  { key: 'pointes', label: 'Pointes' },
                  { key: 'baskets', label: 'Baskets' },
                ]}
                value={equipment}
                onChange={setEquipment}
                style={styles.contextSegment}
              />
            </View>
          </View>

          {/* Section: CONSIGNES */}
          <Text style={styles.sectionCaption}>Consignes de séance</Text>
          <View style={styles.groupedCard}>
            <TextInput
              style={styles.notesInput}
              placeholder="Ajoute une consigne pour tes athlètes (ex. : départ arrêté, relance aux 50 m)…"
              placeholderTextColor={theme.colors.textMuted}
              selectionColor={BLUE}
              multiline
              value={sessionNotes}
              onChangeText={setSessionNotes}
              textAlignVertical="top"
              accessibilityLabel="Consignes de séance"
            />
          </View>

          {/* Section: BLOCS */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionCaptionInline}>Blocs de course ({blocks.length})</Text>

            {blocks.length > 0 && (
              <PressableScale
                haptic="selection"
                onPress={handleOpenSaveFavoriteModal}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityRole="button"
                style={styles.linkBtn}
              >
                <Feather name="star" size={13} color={BLUE} />
                <Text style={styles.linkBtnText}>Enregistrer en séance type</Text>
              </PressableScale>
            )}
          </View>

          {saveNotice ? renderNotice(saveNotice) : null}

          {blocks.length === 0 ? (
            <View style={[styles.groupedCard, styles.paddedCard]}>
              <EmptyState
                compact
                icon="zap"
                title="Aucun bloc pour l’instant"
                message="Crée tes répétitions de course ou charge une séance type en un geste."
              />
              <View style={styles.actionButtonsContainer}>
                <PressableScale
                  haptic="light"
                  onPress={handleOpenAddSheet}
                  accessibilityRole="button"
                  style={styles.primaryActionBtn}
                >
                  <Feather name="plus" size={18} color={ON_BLUE} />
                  <Text style={styles.primaryActionText}>Ajouter un bloc</Text>
                </PressableScale>

                <PressableScale
                  haptic="light"
                  onPress={handleOpenTemplatesModal}
                  accessibilityRole="button"
                  style={styles.secondaryActionBtn}
                >
                  <Feather name="copy" size={16} color={BLUE} />
                  <Text style={styles.secondaryActionText}>Séances types</Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <>
              {blocks.map((item, index) => {
                const targetLabel = getTargetsLabel(item.targets);
                return (
                  <PressableScale
                    key={item.id}
                    haptic="light"
                    activeScale={0.98}
                    onPress={() => handleStartEdit(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier ${item.name}`}
                    containerStyle={styles.blockCardContainer}
                    style={styles.blockCard}
                  >
                    <View style={styles.badgeNumber}>
                      <Text style={styles.badgeNumberText}>{index + 1}</Text>
                    </View>

                    <View style={styles.blockCardCenter}>
                      <Text style={styles.blockName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.blockSummary}>{getBlockSummary(item)}</Text>
                      {targetLabel ? (
                        <View style={styles.targetBadge}>
                          <Feather name="users" size={11} color={BLUE} />
                          <Text style={styles.targetBadgeText} numberOfLines={1}>
                            {targetLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.blockActions}>
                      <IconButton
                        icon="edit-2"
                        tone="plain"
                        size={36}
                        onPress={() => handleStartEdit(item)}
                        accessibilityLabel={`Modifier ${item.name}`}
                      />
                      <IconButton
                        icon="trash-2"
                        tone="danger"
                        size={36}
                        onPress={() => handleRemoveBlock(item.id)}
                        accessibilityLabel={`Supprimer ${item.name}`}
                      />
                    </View>
                  </PressableScale>
                );
              })}

              <View style={styles.groupedCard}>
                <PressableScale
                  haptic="light"
                  activeScale={0.98}
                  onPress={handleOpenAddSheet}
                  accessibilityRole="button"
                  style={styles.actionRow}
                >
                  <View style={styles.rowIcon}>
                    <Feather name="plus" size={16} color={BLUE} />
                  </View>
                  <Text style={[styles.rowTitle, styles.rowTitleBlue]}>Ajouter un bloc</Text>
                </PressableScale>

                <View style={styles.rowDividerInset} />

                <PressableScale
                  haptic="light"
                  activeScale={0.98}
                  onPress={handleOpenTemplatesModal}
                  accessibilityRole="button"
                  style={styles.actionRow}
                >
                  <View style={styles.rowIcon}>
                    <Feather name="copy" size={15} color={BLUE} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>Séances types</Text>
                    <Text style={styles.rowSub}>Favoris et séances récentes</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                </PressableScale>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ========================================================================= */}
        {/* SHEET MODAL: ADD / EDIT BLOCK                                             */}
        {/* ========================================================================= */}
        <Modal
          visible={isBlockSheetVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsBlockSheetVisible(false)}
        >
          <FeedbackHost />
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
              {renderSheetHeader({
                title: editingBlockId ? 'Modifier le bloc' : 'Nouveau bloc',
                onClose: () => setIsBlockSheetVisible(false),
                actionLabel: editingBlockId ? 'Enregistrer' : 'Ajouter',
                onAction: handleSaveBlockSheet,
              })}

              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. NOM DU BLOC */}
                <Text style={[styles.sectionCaption, styles.sectionCaptionFirst]}>Nom du bloc (optionnel)</Text>
                <View style={styles.groupedCard}>
                  <TextInput
                    style={styles.singleLineInput}
                    placeholder={`Ex. : Bloc ${blocks.length + 1} ou Vitesse max`}
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={BLUE}
                    value={blockName}
                    onChangeText={setBlockName}
                    accessibilityLabel="Nom du bloc"
                  />
                </View>

                {/* 2. STRUCTURE DU BLOC (IDENTIQUE VS VARIÉ) */}
                <Text style={styles.sectionCaption}>Structure du bloc</Text>
                <View style={[styles.groupedCard, styles.paddedCard]}>
                  <SegmentedControl
                    options={[
                      { key: 'identical', label: 'Identiques' },
                      { key: 'varied', label: 'Enchaînement varié' },
                    ]}
                    value={blockMode}
                    onChange={setBlockMode}
                  />
                  <Text style={styles.helperText}>
                    {blockMode === 'identical'
                      ? 'Même distance et même intensité à chaque répétition.'
                      : 'Une distance et une intensité propres à chaque course.'}
                  </Text>
                </View>

                {blockMode === 'identical' ? (
                  <>
                    {/* Distance */}
                    <Text style={styles.sectionCaption}>Distance</Text>
                    <View style={[styles.groupedCard, styles.paddedCard]}>
                      <View style={styles.manualDistanceRow}>
                        <Text style={styles.rowTitle}>Distance de course</Text>
                        <View style={[styles.distanceInputBox, distanceError ? styles.inputBoxError : null]}>
                          <TextInput
                            style={styles.distanceInputField}
                            keyboardType="number-pad"
                            value={manualDistanceText}
                            onChangeText={(t) => {
                              setManualDistanceText(t);
                              if (distanceError) setDistanceError(null);
                            }}
                            maxLength={5}
                            selectTextOnFocus
                            selectionColor={BLUE}
                            accessibilityLabel="Distance en mètres"
                          />
                          <Text style={styles.unitText}>m</Text>
                        </View>
                      </View>
                      {distanceError ? (
                        <View style={styles.fieldErrorRow}>
                          <Feather name="alert-circle" size={13} color={theme.colors.error} />
                          <Text style={styles.fieldErrorText}>{distanceError}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Répétitions & Intensité (5% à 100%) */}
                    <Text style={styles.sectionCaption}>Répétitions & intensité</Text>
                    <View style={styles.groupedCard}>
                      <View style={styles.paramRow}>
                        <View style={styles.paramLabelBox}>
                          <Text style={styles.rowTitle}>Répétitions</Text>
                          <Text style={styles.rowSub}>Nombre de courses dans le bloc</Text>
                        </View>
                        {renderStepper(
                          String(repsCount),
                          'les répétitions',
                          () => setRepsCount((r) => Math.max(1, r - 1)),
                          () => setRepsCount((r) => r + 1)
                        )}
                      </View>

                      <View style={styles.rowDivider} />

                      <View style={styles.paramRow}>
                        <View style={styles.paramLabelBox}>
                          <Text style={styles.rowTitle}>Intensité</Text>
                          <Text style={styles.rowSub}>De 5 % à 100 %</Text>
                        </View>
                        {renderStepper(
                          `${intensity}%`,
                          'l’intensité',
                          () => setIntensity((i) => Math.max(5, i - 5)),
                          () => setIntensity((i) => Math.min(100, i + 5))
                        )}
                      </View>

                      <View style={styles.rowDivider} />

                      <View style={styles.paramRow}>
                        <View style={styles.paramLabelBox}>
                          <Text style={styles.rowTitle}>Objectif chrono</Text>
                          <Text style={styles.rowSub}>Facultatif, par course (ex. 7,20)</Text>
                        </View>
                        <TextInput
                          style={styles.targetTimeInput}
                          value={targetTimeText}
                          onChangeText={(t) => setTargetTimeText(t.replace(/[^0-9.,:]/g, '').slice(0, 8))}
                          keyboardType="numbers-and-punctuation"
                          placeholder="—"
                          placeholderTextColor={theme.colors.textMuted}
                          selectionColor={theme.colors.sprintyBlue}
                          accessibilityLabel="Objectif chrono par course, en secondes"
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  /* --- ENCHAÎNEMENT VARIÉ (ex: 120m, 150m, 120m) --- */
                  <>
                    <Text style={styles.sectionCaption}>Courses du bloc ({variedRuns.length})</Text>

                    <View style={styles.groupedCard}>
                      {variedRuns.map((runItem, runIdx) => {
                        const isLastRun = runIdx === variedRuns.length - 1;
                        return (
                          <View
                            key={runItem.id}
                            style={[styles.variedRunRow, !isLastRun && styles.rowDividerBottom]}
                          >
                            <View style={styles.variedIndexBadge}>
                              <Text style={styles.variedIndexText}>{runIdx + 1}</Text>
                            </View>

                            {/* Distance field */}
                            <View style={styles.variedFieldCol}>
                              <Text style={styles.variedFieldSub}>Distance</Text>
                              <View style={styles.variedInputBox}>
                                <TextInput
                                  style={styles.variedInput}
                                  keyboardType="number-pad"
                                  value={String(runItem.distance)}
                                  onChangeText={(t) => {
                                    const parsed = parseInt(t, 10);
                                    handleUpdateRunField(runItem.id, 'distance', isNaN(parsed) ? 0 : parsed);
                                  }}
                                  maxLength={5}
                                  selectTextOnFocus
                                  selectionColor={BLUE}
                                  accessibilityLabel={`Distance de la course ${runIdx + 1}`}
                                />
                                <Text style={styles.unitTextSmall}>m</Text>
                              </View>
                            </View>

                            {/* Intensity field */}
                            <View style={styles.variedFieldCol}>
                              <Text style={styles.variedFieldSub}>Intensité</Text>
                              <View style={styles.variedInputBox}>
                                <TextInput
                                  style={styles.variedInput}
                                  keyboardType="number-pad"
                                  value={String(runItem.intensity)}
                                  onChangeText={(t) => {
                                    const parsed = parseInt(t, 10);
                                    const bounded = isNaN(parsed) ? 5 : Math.min(100, Math.max(5, parsed));
                                    handleUpdateRunField(runItem.id, 'intensity', bounded);
                                  }}
                                  maxLength={3}
                                  selectTextOnFocus
                                  selectionColor={BLUE}
                                  accessibilityLabel={`Intensité de la course ${runIdx + 1}`}
                                />
                                <Text style={styles.unitTextSmall}>%</Text>
                              </View>
                            </View>

                            {variedRuns.length > 1 && (
                              <IconButton
                                icon="trash-2"
                                tone="danger"
                                size={34}
                                onPress={() => handleRemoveRunFromBlock(runItem.id)}
                                accessibilityLabel={`Supprimer la course ${runIdx + 1}`}
                                style={styles.variedDelete}
                              />
                            )}
                          </View>
                        );
                      })}

                      <PressableScale
                        haptic="selection"
                        activeScale={0.98}
                        onPress={handleAddRunToBlock}
                        accessibilityRole="button"
                        style={[styles.actionRow, styles.actionRowTopBorder]}
                      >
                        <View style={styles.rowIcon}>
                          <Feather name="plus" size={16} color={BLUE} />
                        </View>
                        <Text style={[styles.rowTitle, styles.rowTitleBlue]}>Ajouter une course</Text>
                      </PressableScale>
                    </View>
                  </>
                )}

                {/* 3. TEMPS DE RÉCUPÉRATION */}
                <Text style={styles.sectionCaption}>Temps de récupération</Text>
                <View style={styles.groupedCard}>
                  <PressableScale
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => setIsRestRepsPickerVisible(true)}
                    accessibilityRole="button"
                    style={styles.clickableRow}
                  >
                    <View style={styles.clickableRowLeft}>
                      <Text style={styles.rowTitle}>Repos entre répétitions</Text>
                      <Text style={styles.rowSub}>Entre chaque course du bloc</Text>
                    </View>
                    <View style={styles.clickableRowRight}>
                      <Text style={styles.clickableRowValue}>{formatRestDisplay(restReps)}</Text>
                      <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                    </View>
                  </PressableScale>

                  <View style={styles.rowDivider} />

                  <PressableScale
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => setIsRestBlockPickerVisible(true)}
                    accessibilityRole="button"
                    style={styles.clickableRow}
                  >
                    <View style={styles.clickableRowLeft}>
                      <Text style={styles.rowTitle}>Repos après le bloc</Text>
                      <Text style={styles.rowSub}>Avant d’attaquer le bloc suivant</Text>
                    </View>
                    <View style={styles.clickableRowRight}>
                      <Text style={styles.clickableRowValue}>{formatRestDisplay(restBlock)}</Text>
                      <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                    </View>
                  </PressableScale>
                </View>

                {/* 4. CIBLE DU BLOC */}
                <Text style={styles.sectionCaption}>Cible spécifique (optionnel)</Text>
                <View style={styles.groupedCard}>
                  <PressableScale
                    haptic="selection"
                    activeScale={0.98}
                    onPress={() => setIsMultiTargetModalVisible(true)}
                    accessibilityRole="button"
                    style={styles.clickableRow}
                  >
                    <View style={styles.rowIcon}>
                      <Feather name="users" size={15} color={BLUE} />
                    </View>
                    <View style={styles.clickableRowLeft}>
                      <Text style={styles.rowTitle}>Cibler ce bloc</Text>
                      <Text style={[styles.rowSub, isBlockTargeted && styles.rowSubBlue]}>
                        {!isBlockTargeted
                          ? 'Tout le groupe'
                          : `${blockTargets.subgroups.length} sous-groupe(s), ${blockTargets.athletes.length} athlète(s)`}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </PressableScale>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL: SÉANCES TYPES (Favoris & 5 dernières créées)                       */}
        {/* ========================================================================= */}
        <Modal
          visible={isTemplatesModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsTemplatesModalVisible(false)}
        >
          <FeedbackHost />
          <View style={styles.container}>
            {renderSheetHeader({
              title: 'Séances types',
              subtitle: 'Favoris et séances récentes',
              onClose: () => setIsTemplatesModalVisible(false),
            })}

            <View style={styles.tabsWrap}>
              <SegmentedControl
                options={[
                  { key: 'favorites', label: `Favoris (${favoriteTemplates.length})` },
                  { key: 'recents', label: `Récentes (${recentWorkouts.length})` },
                ]}
                value={templatesTab}
                onChange={setTemplatesTab}
              />
            </View>

            {isLoadingTemplates ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={BLUE} />
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.templatesScrollContent}
              >
                {/* TAB 1: FAVORIS */}
                {templatesTab === 'favorites' &&
                  (favoriteTemplates.length === 0 ? (
                    <View style={styles.groupedCard}>
                      <EmptyState
                        compact
                        icon="star"
                        title="Aucune séance type"
                        message="Crée une séance puis touche « Enregistrer en séance type » pour la retrouver ici."
                      />
                    </View>
                  ) : (
                    favoriteTemplates.map((tpl) =>
                      renderTemplateCard({
                        key: tpl.id,
                        title: tpl.name,
                        surfaceVal: tpl.surface,
                        equipVal: tpl.equipment,
                        blocksCount: tpl.blocks?.length || 0,
                        lines: (tpl.blocks || []).map((b) => b.name || getBlockSummary(b)),
                        onApply: () => handleApplyTemplate(tpl, false),
                        onDelete: () => handleDeleteFavorite(tpl.id),
                      })
                    )
                  ))}

                {/* TAB 2: RÉCENTES */}
                {templatesTab === 'recents' &&
                  (recentWorkouts.length === 0 ? (
                    <View style={styles.groupedCard}>
                      <EmptyState
                        compact
                        icon="clock"
                        title="Aucune séance récente"
                        message="Tes 5 dernières séances apparaîtront ici pour les réutiliser en un geste."
                      />
                    </View>
                  ) : (
                    recentWorkouts.map((w, wIdx) => {
                      const dateFormatted = new Date(w.date_prevue).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                      const blocksCount = w.blocks?.length || 1;
                      const surfaceVal =
                        w.measures?.surface || (w.type_seance?.toLowerCase().includes('côte') ? 'cote' : 'piste');
                      const equipVal =
                        w.measures?.equipment || (w.description?.toLowerCase().includes('basket') ? 'baskets' : 'pointes');

                      return renderTemplateCard({
                        key: String(w.id || wIdx),
                        title: `Séance du ${dateFormatted}`,
                        surfaceVal,
                        equipVal,
                        blocksCount,
                        lines: (w.blocks || [])
                          .slice(0, 3)
                          .map((b: any, bIdx: number) => b.name || `Bloc ${bIdx + 1}`),
                        onApply: () => handleApplyTemplate(w, true),
                      });
                    })
                  ))}

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
          <FeedbackHost />
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.alertBackdrop}>
              <View style={styles.alertModalCard}>
                <View style={styles.alertIconCircle}>
                  <Feather name="star" size={22} color={BLUE} />
                </View>

                <Text style={styles.alertTitle}>Enregistrer en séance type</Text>
                <Text style={styles.alertSubtitle}>
                  Donne un titre à cette séance pour la retrouver facilement dans tes favoris.
                </Text>

                <Input
                  value={favoriteTitleInput}
                  onChangeText={(t) => {
                    setFavoriteTitleInput(t);
                    if (favoriteTitleError) setFavoriteTitleError(null);
                  }}
                  placeholder="Ex. : Lactique 120-150-120 ou Vitesse 4 × 60 m"
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmSaveFavorite}
                  error={favoriteTitleError || undefined}
                  containerStyle={styles.alertInputContainer}
                  accessibilityLabel="Nom de la séance type"
                />

                <View style={styles.alertActionsRow}>
                  <Button
                    title="Annuler"
                    variant="secondary"
                    onPress={() => setIsSaveFavoriteModalVisible(false)}
                    disabled={isSavingFavorite}
                    style={styles.alertBtn}
                  />
                  <Button
                    title="Enregistrer"
                    onPress={handleConfirmSaveFavorite}
                    loading={isSavingFavorite}
                    style={styles.alertBtn}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
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

        <MultiTargetSelectorModal
          visible={isMultiTargetModalVisible}
          onClose={() => setIsMultiTargetModalVisible(false)}
          onSave={setBlockTargets}
          initialTarget={blockTargets}
          title="Cibler le bloc"
        />
      </View>
    </Modal>
  );
};

const C = staticTheme.colors;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: C.backdrop,
  },

  // Sheet header (shared by every full-screen sheet of the builder)
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.backdrop,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  sheetHeaderTitles: {
    flex: 1,
    marginHorizontal: 12,
  },
  sheetHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: C.text,
  },
  sheetHeaderSubtitle: {
    fontSize: 13,
    marginTop: 1,
    color: C.textSecondary,
    textTransform: 'capitalize',
  },
  headerPill: {
    height: 38,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPillDimmed: {
    opacity: 0.45,
  },
  headerPillText: {
    color: ON_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 38,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // Section labels
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.textSecondary,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCaptionFirst: {
    marginTop: 16,
  },
  sectionRow: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCaptionInline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.textSecondary,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },

  // Cards
  groupedCard: {
    ...glassSurface,
    borderRadius: 22,
    borderCurve: 'continuous',
  },
  paddedCard: {
    padding: 16,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
    marginHorizontal: 16,
  },
  rowDividerInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
    marginLeft: 60,
    marginRight: 16,
  },
  rowDividerBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  rowTitleBlue: {
    color: BLUE,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 13,
    marginTop: 2,
    color: C.textSecondary,
  },
  rowSubBlue: {
    color: BLUE,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.textSecondary,
    marginTop: 10,
    paddingHorizontal: 2,
  },

  // Inline notices / errors
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RED_TINT,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: C.error,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  fieldErrorText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.error,
  },
  inputBoxError: {
    borderColor: C.error,
    backgroundColor: RED_TINT,
  },

  // Context (lieu / chaussures)
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  contextLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 12,
  },
  contextSegment: {
    width: 176,
  },

  // Inputs
  notesInput: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    minHeight: 96,
    lineHeight: 21,
    color: C.text,
  },
  singleLineInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    fontSize: 15,
    color: C.text,
  },

  // Empty state actions
  actionButtonsContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: BLUE,
  },
  primaryActionText: {
    color: ON_BLUE,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE,
  },

  // Block cards
  blockCardContainer: {
    marginBottom: 10,
  },
  blockCard: {
    ...glassSurface,
    borderRadius: 22,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
  },
  badgeNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeNumberText: {
    color: ON_BLUE,
    fontSize: 13,
    fontWeight: '800',
  },
  blockCardCenter: {
    flex: 1,
    marginRight: 4,
  },
  blockName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: C.text,
  },
  blockSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    color: C.textSecondary,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
    maxWidth: '100%',
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
    flexShrink: 1,
  },
  blockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  actionRowTopBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },

  // Block sheet: distance / steppers
  manualDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: C.glassFill,
    paddingHorizontal: 14,
    height: 50,
    minWidth: 120,
  },
  distanceInputField: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    minWidth: 64,
    paddingVertical: 0,
    color: C.text,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
    color: BLUE,
  },
  unitTextSmall: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
    color: BLUE,
  },
  targetTimeInput: {
    width: 96,
    flexShrink: 0,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    backgroundColor: C.glassFill,
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
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
  },
  clickableRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  clickableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clickableRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE,
  },

  // Block sheet: varied runs
  variedRunRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  variedIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  variedIndexText: {
    fontSize: 13,
    fontWeight: '800',
    color: BLUE,
  },
  variedFieldCol: {
    flex: 1,
  },
  variedFieldSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    color: C.textSecondary,
  },
  variedInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: C.glassFill,
    paddingHorizontal: 12,
    height: 44,
  },
  variedInput: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    paddingVertical: 0,
    color: C.text,
  },
  variedDelete: {
    marginBottom: 5,
  },

  // Templates sheet
  tabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  templatesScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  templateCard: {
    ...glassCard,
    marginBottom: 12,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  templateCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
    color: C.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: BLUE_TINT,
  },
  metaPillNeutral: {
    backgroundColor: C.glassFill,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  metaPillTextNeutral: {
    color: C.textSecondary,
  },
  templateBlocksPreview: {
    marginBottom: 14,
    gap: 4,
  },
  previewLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.textMuted,
    marginRight: 8,
  },
  previewLineText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: C.textSecondary,
  },
  applyTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: BLUE,
  },
  applyTemplateBtnText: {
    color: ON_BLUE,
    fontSize: 15,
    fontWeight: '700',
  },

  // Save-as-favorite dialog
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: C.surface,
    padding: 20,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BLUE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
    color: C.text,
  },
  alertSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    color: C.textSecondary,
  },
  alertInputContainer: {
    marginBottom: 16,
  },
  alertActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertBtn: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
  },
});
