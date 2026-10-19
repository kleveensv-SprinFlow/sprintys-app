import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Platform, StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { timeLabelOf } from './TimeField';
import { sessionKindOf, entryCategoryOf, effortCategoryOf } from '../../workout/sessionKind';
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
import { ProgramModal } from './ProgramModal';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { formatSeconds, formatValue } from '../../performance/format';
import { resultsOutbox, isNetworkError, useOutboxStore } from '../../../services/resultsOutbox';
import { maxesService, exerciseKey, loadFromPercent, formatLoad, AthleteMax } from '../../../services/maxesService';
import { MaxEditSheet } from '../../performance/MaxEditSheet';
import { syncSessionReminders } from '../../../services/notifications';
import { previousResultsService, courseKey, EMPTY_PREV, PrevResults } from '../../../services/previousResultsService';
import { CoachReplyBox, CoachFeedback } from './CoachReplyBox';
import { chronoToSeconds, isPlausibleChrono } from '../../workout/chrono';

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

/** Athlete's own comment. Technical sessions keep the coach's per-athlete instructions in measures.athlete_notes (an array), so the comment lives in athlete_feedback. */
const readFeedback = (m: any): string =>
  typeof m?.athlete_feedback === 'string' ? m.athlete_feedback : typeof m?.athlete_notes === 'string' ? m.athlete_notes : '';

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({ visible, onClose, workout, onDelete, onEdit, onUpdated, readOnlyAthleteId }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subgroups, teamMembers } = useCoachStore();
  const isCoach = user?.role === 'coach' && !readOnlyAthleteId;
  const isReadOnly = !!readOnlyAthleteId;
  // A coach looking at one athlete's day sees that athlete's results but cannot enter or validate anything
  const canEdit = !isCoach && !isReadOnly;
  const resultsOwnerId = readOnlyAthleteId || user?.id;

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
  // Felt effort (1-10) and duration: together they give the session load that the coach follows
  const [rpe, setRpe] = React.useState<number | null>(null);
  const [durationMin, setDurationMin] = React.useState('');
  // Per-athlete validation of a group session (coach view)
  const [validations, setValidations] = React.useState<{ athlete_id: string; status: string }[]>([]);
  const draftReady = React.useRef(false);
  // Rest timer started when a set is entered (uses the set's planned rest)
  const [restEnd, setRestEnd] = React.useState<number | null>(null);
  const [restLeft, setRestLeft] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isValidated, setIsValidated] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);
  // Results typed offline and not sent yet
  // The coach's answer under this session (written by the coach looking at one athlete, read by the athlete)
  const [coachReply, setCoachReply] = React.useState<CoachFeedback | null>(null);
  React.useEffect(() => {
    const fb = workout?.measures?.coach_feedback;
    setCoachReply(fb && typeof fb.text === 'string' && fb.text ? { text: fb.text, at: fb.at } : null);
  }, [workout?.id, visible]);
  // What the athlete did last time on these exercises / distances (shown under each set)
  const [prev, setPrev] = React.useState<PrevResults>(EMPTY_PREV);
  // Reference maxima (1RM) of the athlete: turn a prescribed "% 1RM" into kilos
  const [maxes, setMaxes] = React.useState<Record<string, AthleteMax>>({});
  const [maxEdit, setMaxEdit] = React.useState<{ key: string; label: string } | null>(null);
  const loadMaxes = React.useCallback(async () => {
    if (!resultsOwnerId) return;
    try {
      const list = await maxesService.fetch(resultsOwnerId);
      setMaxes(Object.fromEntries(list.map((m) => [m.key, m])));
    } catch {
      /* the percentage is still shown without kilos */
    }
  }, [resultsOwnerId]);
  const awaitingSend = useOutboxStore((st) => !!workout?.id && st.pendingIds.includes(workout.id));
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  // Copy/Repeat modal state (coach only)
  const [showCopyModal, setShowCopyModal] = React.useState(false);
  const [showRepeatModal, setShowRepeatModal] = React.useState(false);
  const [showProgramModal, setShowProgramModal] = React.useState(false);
  const [showTemplateName, setShowTemplateName] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const [savingTemplate, setSavingTemplate] = React.useState(false);

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
  const sessionCategory = entryCategoryOf(workout);
  const needsDataEntry = (!isCoach || isReadOnly) && (sessionCategory === 'muscu' || sessionCategory === 'course');

  // Load existing athlete data when workout changes. State is reset first: the same modal instance is reused
  // from one session to the next and must never show (or save) another session's values.
  React.useEffect(() => {
    setSetData({});
    setAthleteNotes('');
    setRpe(null);
    setDurationMin('');
    draftReady.current = false;
    wasAwaiting.current = false;
    setJustSaved(false);
    setActiveKeypad(null);
    setRestEnd(null);
    setIsValidated(workout?.status === 'completed');
    if (visible && workout && (!isCoach || isReadOnly) && resultsOwnerId) {
      loadExistingData();
    }
  }, [visible, workout?.id, resultsOwnerId]);

  React.useEffect(() => {
    setPrev(EMPTY_PREV);
    if (!visible || !workout?.id || !resultsOwnerId || (isCoach && !isReadOnly)) return;
    let alive = true;
    previousResultsService
      .fetch(resultsOwnerId, workout.id)
      .then((r) => alive && setPrev(r))
      .catch(() => undefined); // the hint is a bonus
    return () => {
      alive = false;
    };
  }, [visible, workout?.id, resultsOwnerId]);

  const hasPercentSets = React.useMemo(
    () => JSON.stringify(workout?.blocks ?? workout?.exercises ?? '').includes('percent_1rm'),
    [workout?.id, workout?.blocks, workout?.exercises],
  );
  React.useEffect(() => {
    setMaxes({});
    if (visible && hasPercentSets && resultsOwnerId && (!isCoach || isReadOnly)) loadMaxes();
  }, [visible, workout?.id, hasPercentSets, resultsOwnerId]);

  // The results typed offline just left the phone: show them as validated
  const wasAwaiting = React.useRef(false);
  React.useEffect(() => {
    if (awaitingSend) {
      wasAwaiting.current = true;
      return;
    }
    if (wasAwaiting.current) {
      wasAwaiting.current = false;
      if (visible && workout?.id && useOutboxStore.getState().sentIds.includes(workout.id)) {
        workout.status = 'completed';
        setIsValidated(true);
        loadExistingData();
        onUpdated?.();
      }
      // Dropped by the server (session deleted…): the draft stays, nothing is shown as validated
    }
  }, [awaitingSend]);

  const loadSeq = React.useRef(0);
  const loadExistingData = async () => {
    if (!workout?.id || !resultsOwnerId) return;
    const workoutId = workout.id;
    const seq = ++loadSeq.current;
    setIsLoadingData(true);
    try {
      // Load athlete_efforts for this workout
      const { data: efforts } = await supabase
        .from('athlete_efforts')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('athlete_id', resultsOwnerId)
        .order('set_order', { ascending: true });

      if (seq !== loadSeq.current) return; // another session was opened meanwhile
      if (efforts && efforts.length > 0) {
        const loaded: Record<string, any> = {};
        // Efforts saved since this version carry the exercise/set they belong to; older ones only the global position
        const byId = new Map<string, any>();
        const legacy: any[] = [];
        for (const e of efforts) {
          const pe = (e as any).planned_extra;
          if (pe && pe.exercise_id != null) byId.set(`${pe.exercise_id}_${pe.set_index}`, e);
          else legacy.push(e);
        }
        const blocks = workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }];
        let globalIdx = 0;
        for (const block of blocks) {
          for (const exercise of (block.exercises || [])) {
            for (let si = 0; si < (exercise.sets || []).length; si++) {
              const key = `${exercise.id}_${si}`;
              const effort = byId.get(key) ?? legacy.find((e: any) => e.set_order === globalIdx);
              if (effort) {
                const extra = effort.actual_extra || {};
                loaded[key] = {
                  weight: extra.weight || (effort.actual_weight_kg != null ? String(effort.actual_weight_kg) : ''),
                  repsOk: extra.repsOk !== undefined ? extra.repsOk : true,
                  chrono: extra.chrono || '',
                  pr: !!(effort as any).is_pr,
                };
              }
              globalIdx++;
            }
          }
        }
        setSetData(loaded);
      }

      setAthleteNotes(readFeedback(workout.measures));
      const m = workout.measures || {};
      setRpe(typeof m.rpe === 'number' ? m.rpe : null);
      setDurationMin(typeof m.duration_min === 'number' ? String(m.duration_min) : '');
      setIsValidated(workout.status === 'completed');

      // A session that was started but not validated comes back as it was left (lost connection, app closed...)
      if (canEdit && workout.status !== 'completed') {
        try {
          const raw = await AsyncStorage.getItem(`session-draft:${resultsOwnerId}:${workoutId}`);
          if (raw && seq === loadSeq.current) {
            const draft = JSON.parse(raw);
            if (draft?.setData && Object.keys(draft.setData).length) setSetData(draft.setData);
            if (typeof draft?.notes === 'string') setAthleteNotes(draft.notes);
            if (typeof draft?.rpe === 'number') setRpe(draft.rpe);
            if (typeof draft?.durationMin === 'string') setDurationMin(draft.durationMin);
          }
        } catch { /* a missing draft is not an error */ }
      }
      if (seq === loadSeq.current) draftReady.current = true;
    } catch (e) {
      console.error('Error loading athlete data:', e);
    } finally {
      if (seq === loadSeq.current) setIsLoadingData(false);
    }
  };

  // Rest countdown: ticks every second, buzzes at zero
  React.useEffect(() => {
    if (restEnd == null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
      setRestLeft(left);
      if (left === 0) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setTimeout(() => setRestEnd((cur) => (cur === restEnd ? null : cur)), 2500);
        return true;
      }
      return false;
    };
    if (tick()) return;
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [restEnd]);

  // Keep what the athlete typed until the session is validated
  React.useEffect(() => {
    if (!canEdit || !visible || !workout?.id || !resultsOwnerId || !draftReady.current || isValidated) return;
    const key = `session-draft:${resultsOwnerId}:${workout.id}`;
    const empty = !Object.keys(setData).length && !athleteNotes && rpe == null && !durationMin;
    // Written right away: a delayed write would be lost when the sheet closes or the app goes to the background
    (empty ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify({ setData, notes: athleteNotes, rpe, durationMin }))).catch(() => undefined);
  }, [setData, athleteNotes, rpe, durationMin, isValidated, visible, workout?.id]);

  // Coach: who has validated a group session
  React.useEffect(() => {
    setValidations([]);
    if (!visible || !isCoach || !workout?.group_assignment_id) return;
    let alive = true;
    supabase
      .from('workouts')
      .select('athlete_id, status, measures')
      .eq('group_assignment_id', workout.group_assignment_id)
      .then(({ data }) => {
        if (!alive || !data) return;
        setValidations(data.filter((r: any) => r.measures?.is_master !== true).map((r: any) => ({ athlete_id: r.athlete_id, status: r.status })));
      });
    return () => {
      alive = false;
    };
  }, [visible, isCoach, workout?.id, workout?.group_assignment_id]);

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

  const handleEdit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let hasResults = workout.status === 'completed';
    if (!hasResults && workout.group_assignment_id) {
      try {
        const { count } = await supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('group_assignment_id', workout.group_assignment_id)
          .eq('status', 'completed');
        hasResults = (count ?? 0) > 0;
      } catch { /* no warning rather than a blocked edit */ }
    }
    if (hasResults) {
      const ok = await confirmAsync({
        title: 'Séance déjà validée',
        message: 'Au moins un athlète a déjà saisi ses résultats. Ses données sont conservées, mais si tu ajoutes, retires ou réordonnes des séries ou des exercices, elles peuvent ne plus correspondre. Modifier quand même ?',
        confirmText: 'Modifier',
        icon: 'edit-2',
      });
      if (!ok) return;
    }
    onEdit?.(workout);
  };

  const submitAthleteWorkout = async () => {
    if (!user || !workout?.id || !canEdit) return;
    const sc = entryCategoryOf(workout);
    const hasAnyValue = Object.values(setData).some((d: any) => d && (String(d.weight || '').trim() || String(d.chrono || '').trim()));
    if (sc !== 'other' && !hasAnyValue && !athleteNotes.trim()) {
      const ok = await confirmAsync({
        title: 'Aucun résultat saisi',
        message: 'Tu n’as rien renseigné pour cette séance. La valider quand même ?',
        confirmText: 'Valider',
        icon: 'check-circle',
      });
      if (!ok) return;
    }
    const minutes = durationMin.trim() ? parseInt(durationMin.trim(), 10) : null;
    if (minutes != null && (!Number.isFinite(minutes) || minutes < 1 || minutes > 600)) {
      appAlert('Durée', 'Indique une durée en minutes entre 1 et 600, ou laisse le champ vide.');
      return;
    }
    // A time no runner can have run (typed with a missing digit) is confirmed before it ends up in the records
    if (sc === 'course') {
      const odd: string[] = [];
      for (const b of workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }]) {
        for (const ex of b.exercises || []) {
          (ex.sets || []).forEach((st: any, i: number) => {
            const v = setData[`${ex.id}_${i}`]?.chrono;
            const sec = v ? chronoToSeconds(v, st?.distance) : null;
            if (v && st?.distance && !isPlausibleChrono(sec, st.distance)) odd.push(`série ${i + 1} : ${v} sur ${st.distance} m`);
          });
        }
      }
      if (odd.length > 0) {
        const ok = await confirmAsync({
          title: 'Chrono inhabituel',
          message: `${odd.slice(0, 3).join(', ')}${odd.length > 3 ? '…' : ''}. Vérifie que tu as bien saisi le temps (minutes, secondes et centièmes). Valider quand même ?`,
          confirmText: 'Valider quand même',
          cancelText: 'Corriger',
          icon: 'clock',
        });
        if (!ok) return;
      }
    }
    // Une charge qu'aucun athlète ne soulève (chiffre en trop) est confirmée avant de devenir un record
    if (sc === 'muscu') {
      const heavy: string[] = [];
      for (const b of workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }]) {
        for (const ex of b.exercises || []) {
          (ex.sets || []).forEach((_st: any, i: number) => {
            const kg = parseFloat(String(setData[`${ex.id}_${i}`]?.weight ?? '').replace(',', '.'));
            if (Number.isFinite(kg) && (kg > 500 || kg < 0)) heavy.push(`${ex.name || 'Exercice'} série ${i + 1} : ${kg} kg`);
          });
        }
      }
      if (heavy.length > 0) {
        const ok = await confirmAsync({
          title: 'Charge inhabituelle',
          message: `${heavy.slice(0, 3).join(', ')}${heavy.length > 3 ? '…' : ''}. Vérifie la charge saisie. Valider quand même ?`,
          confirmText: 'Valider quand même',
          cancelText: 'Corriger',
          icon: 'alert-triangle',
        });
        if (!ok) return;
      }
    }
    setIsSubmitting(true);
    try {
      const efforts: any[] = [];
      // Results belong to the day of the session (not the day they are typed in), never in the future
      const planned = workout.date_prevue ? new Date(workout.date_prevue) : null;
      const effortDate = (planned && !Number.isNaN(planned.getTime()) && planned.getTime() < Date.now() ? planned : new Date()).toISOString();
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
              exercise_category: effortCategoryOf(workout),
              date_achieved: effortDate,
              block_order: bIdx,
              set_order: setOrderGlobal,
              planned_extra: { exercise_id: exercise.id, set_index: i, set_id: set?.id ?? null, exercise_name: exercise.name ?? null },
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
                  exercise: exercise.name ?? null,
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
      const feedback = athleteNotes.trim() || null;
      const updatedMeasures: any = { ...(workout.measures || {}), athlete_feedback: feedback, rpe: rpe ?? null, duration_min: minutes };
      // Technical sessions keep the coach's instructions (an array) in athlete_notes: never overwrite them
      if (!Array.isArray(updatedMeasures.athlete_notes)) updatedMeasures.athlete_notes = feedback;

      // Atomic RPC call: saves efforts, updates measures and marks status = 'completed'
      try {
        await workoutService.submitWorkoutResults(workout.id, efforts, updatedMeasures);
      } catch (netErr: any) {
        if (!isNetworkError(netErr) || !resultsOwnerId) throw netErr;
        // No connection: keep the results on the phone, they are sent as soon as the network is back
        const kept = await resultsOutbox.enqueue(resultsOwnerId, { workoutId: workout.id, efforts, measures: updatedMeasures });
        if (!kept) throw netErr;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        toast('info', 'Pas de connexion : tes résultats sont gardés sur ton téléphone et partiront dès que le réseau revient.', 'Enregistré hors ligne');
        return;
      }
      // Sent now: an older copy waiting in the outbox must not overwrite it later
      if (resultsOwnerId) resultsOutbox.drop(resultsOwnerId, workout.id);
      // Today's reminder is no longer needed once the session is validated
      if (resultsOwnerId && !isCoach) syncSessionReminders(resultsOwnerId);
      
      // Update local workout properties so UI updates immediately
      workout.status = 'completed';
      workout.measures = updatedMeasures;

      setIsValidated(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
      AsyncStorage.removeItem(`session-draft:${user.id}:${workout.id}`).catch(() => undefined);

      // Records set during this session (computed by the database when the results are saved)
      let recordLines: string[] = [];
      try {
        const { data: prs } = await supabase
          .from('athlete_efforts')
          .select('exercise_category, actual_distance_m, actual_time_ms, actual_weight_kg, actual_extra, planned_extra, set_order')
          .eq('workout_id', workout.id)
          .eq('is_pr', true)
          .order('set_order');
        // Best value per label: the fastest time of a distance, the heaviest load of an exercise
        const best = new Map<string, { run: boolean; v: number }>();
        for (const r of prs || []) {
          const x: any = r;
          const isRun = x.actual_time_ms != null && x.actual_distance_m;
          const label = isRun ? `${Number(x.actual_distance_m)} m` : String(x.actual_extra?.exercise ?? x.planned_extra?.exercise_name ?? 'Exercice');
          const v = isRun ? x.actual_time_ms / 1000 : Number(x.actual_weight_kg ?? x.actual_extra?.weight);
          if (!Number.isFinite(v)) continue;
          const cur = best.get(label);
          if (!cur || (isRun ? v < cur.v : v > cur.v)) best.set(label, { run: !!isRun, v });
        }
        recordLines = [...best.entries()].map(([label, b]) => `${label} : ${formatValue(b.v, b.run ? 's' : 'kg')}`);
      } catch { /* the celebration is a bonus */ }
      loadExistingData();

      onUpdated?.();
      if (recordLines.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast('success', recordLines.slice(0, 2).join(' · '), recordLines.length > 1 ? `${recordLines.length} nouveaux records` : 'Nouveau record');
        return;
      }

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
  const kind = sessionKindOf(workout);
  const isRestDay = kind === 'rest';
  const isTechnical = kind === 'technical';
  const isCompetition = kind === 'competition';
  // An athlete only sees the instructions meant for them, the coach sees all of them
  const forMe = (n: any) =>
    n?.targetType === 'team' ||
    (n?.targetType === 'subgroup' && !!workout.subgroup_id && n?.targetId === workout.subgroup_id) ||
    (n?.targetType === 'athlete' && n?.targetId === workout.athlete_id);
  const allTechnicalNotes = workout.measures?.technical_notes;
  const technicalNotes = isCoach
    ? allTechnicalNotes
    : Array.isArray(workout.measures?.athlete_notes)
      ? workout.measures.athlete_notes
      : Array.isArray(allTechnicalNotes)
        ? allTechnicalNotes.filter(forMe)
        : allTechnicalNotes;

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
    // Planned rest after this set starts the timer (nothing after the last set of the session)
    const planned = allSets[activeKeypad.flattenedIndex];
    const restSeconds = Number(planned?.set?.restSeconds ?? 0);
    const upcoming = allSets[activeKeypad.flattenedIndex + 1];
    // Going from one exercise of a superset to its partner is done without resting
    const sameSuperset = !!upcoming && upcoming.exercise !== planned?.exercise
      && !!(planned?.exercise as any)?.superset && (planned?.exercise as any).superset === (upcoming.exercise as any)?.superset;
    if (value && restSeconds > 0 && !sameSuperset && activeKeypad.flattenedIndex < allSets.length - 1) {
      setRestEnd(Date.now() + restSeconds * 1000);
    }
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

                {kind === 'strength' && (
                  <PressableScale
                    containerStyle={styles.actionBtnContainer}
                    style={styles.actionBtn}
                    onPress={() => setShowProgramModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Programmer plusieurs semaines avec progression"
                  >
                    <Feather name="trending-up" size={15} color={theme.colors.sprintyBlue} />
                    <Text style={styles.actionBtnText}>Cycle</Text>
                  </PressableScale>
                )}

                <PressableScale
                  containerStyle={styles.actionBtnContainer}
                  style={styles.actionBtn}
                  onPress={() => {
                    setTemplateName(workout.type_seance || 'Ma séance');
                    setShowTemplateName(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Enregistrer en séance type"
                >
                  <Feather name="star" size={15} color={theme.colors.sprintyBlue} />
                  <Text style={styles.actionBtnText}>Type</Text>
                </PressableScale>
              </View>
            )}
          </View>

          {/* Coach: who validated this group session */}
          {isCoach && validations.length > 1 && (
            <View style={styles.validationsCard}>
              <View style={styles.validationsHeader}>
                <Feather name="check-circle" size={14} color={theme.colors.success} />
                <Text style={styles.validationsTitle}>
                  {validations.filter((v) => v.status === 'completed').length}/{validations.length} athlètes ont validé
                </Text>
              </View>
              <View style={styles.validationsChips}>
                {validations.map((v) => {
                  const mem = teamMembers.find((m) => m.user_id === v.athlete_id);
                  const name = mem?.profile?.first_name || mem?.profile?.full_name?.split(' ')[0] || 'Athlète';
                  const done = v.status === 'completed';
                  return (
                    <View key={v.athlete_id} style={[styles.validationChip, done ? styles.validationChipDone : styles.validationChipTodo]}>
                      <Feather name={done ? 'check' : 'clock'} size={11} color={done ? theme.colors.success : theme.colors.textSecondary} />
                      <Text style={[styles.validationChipText, { color: done ? theme.colors.success : theme.colors.textSecondary }]}>{name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

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

                    {(() => {
                      const ex: any = exercise;
                      const group = ex.superset ? (block.exercises || []).filter((e: any) => e.superset === ex.superset) : [];
                      const superset = group.length > 1 ? `${ex.superset}${group.indexOf(exercise) + 1}` : null;
                      if (!superset && !ex.tempo && !ex.rpe_target) return null;
                      return (
                        <View style={styles.execMetaRow}>
                          {!!superset && (
                            <View style={styles.execMetaChip}>
                              <Feather name="link" size={11} color={theme.colors.sprintyBlue} />
                              <Text style={styles.execMetaText}>Superset {superset}</Text>
                            </View>
                          )}
                          {!!ex.tempo && (
                            <View style={styles.execMetaChip}>
                              <Feather name="clock" size={11} color={theme.colors.sprintyBlue} />
                              <Text style={styles.execMetaText}>Tempo {ex.tempo}</Text>
                            </View>
                          )}
                          {!!ex.rpe_target && (
                            <View style={styles.execMetaChip}>
                              <Feather name="activity" size={11} color={theme.colors.sprintyBlue} />
                              <Text style={styles.execMetaText}>RPE {ex.rpe_target}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}

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
                          <Text style={[styles.athleteHeaderText, { width: 32 }]}>N°</Text>
                          <Text style={[styles.athleteHeaderText, { flex: 1 }]}>Objectif</Text>
                          {sessionCategory === 'muscu' && (
                            <Text style={[styles.athleteHeaderText, { width: 90 }]}>Charge</Text>
                          )}
                          {sessionCategory === 'course' && (
                            <Text style={[styles.athleteHeaderText, { width: 90 }]}>Chrono</Text>
                          )}
                        </View>
                      )}

                      {canEdit && (exercise.sets || []).some((st: any) => (st.weight_type || st.weightType) === 'percent_1rm') && (() => {
                        const mx = maxes[exerciseKey(exercise as any)];
                        const label = exercise.name || 'Exercice';
                        return (
                          <PressableScale
                            haptic="selection"
                            onPress={() => setMaxEdit({ key: exerciseKey(exercise as any), label })}
                            accessibilityRole="button"
                            accessibilityLabel={mx?.best_kg ? `Max ${label} : ${mx.best_kg} kg. Modifier` : `Renseigner mon max pour ${label}`}
                            style={styles.maxChip}
                          >
                            <Feather name="sliders" size={12} color={theme.colors.sprintyBlue} />
                            <Text style={[styles.maxChipText, { color: theme.colors.sprintyBlue }]}>
                              {mx?.best_kg ? `Mon max : ${formatLoad(mx.best_kg)}${mx.manual_kg == null ? ' (estimé)' : ''}` : 'Renseigne ton max pour voir les kilos'}
                            </Text>
                          </PressableScale>
                        );
                      })()}

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
                        if ((set as any).target_time_s) setDetails.push(`objectif ${formatSeconds(Number((set as any).target_time_s))}`);
                        if (set.duration) setDetails.push(set.duration);
                        if (set.weight !== undefined && set.weight !== null) {
                          const wType = (set as any).weight_type || (set as any).weightType;
                          if (wType === 'percent_1rm' || String(set.weight).includes('%')) {
                            const pct = parseFloat(String(set.weight).replace('%', '').replace(',', '.'));
                            const mx = maxes[exerciseKey(exercise as any)];
                            const oneRm = mx?.best_kg ?? null;
                            setDetails.push(
                              oneRm && Number.isFinite(pct) && pct > 0 ? `${set.weight}% 1RM ≈ ${formatLoad(loadFromPercent(oneRm, pct))}` : `${set.weight}% 1RM`,
                            );
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
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.athleteObjective, { flex: 0 }]} numberOfLines={2}>
                                  {setDetails.join(' · ')}
                                </Text>
                                {(() => {
                                  let hint: string | null = null;
                                  if (sessionCategory === 'muscu') {
                                    const p = prev.muscu[exerciseKey(exercise as any)];
                                    // Same exercise instance, matched by set position (a skipped set must not shift the others)
                                    const same = p ? p.sets.filter((x) => x.ex === p.sets[0].ex) : [];
                                    const ps = p ? same.find((x) => x.idx === setIndex) ?? same[same.length - 1] ?? null : null;
                                    if (ps) hint = `Dernière fois : ${formatLoad(ps.kg)}${ps.reps ? ` × ${ps.reps}` : ''}${ps.ok ? '' : ' ✗'}`;
                                  } else if (sessionCategory === 'course') {
                                    const k = courseKey((set as any).distance, workout?.type_seance);
                                    const p = k ? prev.course[k] : null;
                                    const prevSet = setIndex > 0 ? (exercise.sets || [])[setIndex - 1] as any : null;
                                    const sameAsPrev = !!prevSet && courseKey(prevSet.distance, workout?.type_seance) === k;
                                    if (p && !sameAsPrev) hint = `Dernier ${formatSeconds(p.last_ms / 1000)}${p.best_ms < p.last_ms ? ` · record ${formatSeconds(p.best_ms / 1000)}` : ''}`;
                                  }
                                  return hint ? <Text style={styles.prevHint} numberOfLines={1}>{hint}</Text> : null;
                                })()}
                              </View>

                              {sessionCategory === 'muscu' && (
                                <PressableScale
                                  haptic="selection"
                                  hitSlop={{ top: 4, bottom: 4 }}
                                  style={[
                                    styles.athleteValueButton,
                                    { minWidth: 90 },
                                    data.weight ? styles.athleteValueButtonFilled : null,
                                  ]}
                                  disabled={!canEdit}
                                  onPress={() => {
                                    const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                    if (idx >= 0) openKeypadAtIndex(idx);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={data.weight ? `Charge série ${setIndex + 1} : ${data.weight} kg` : `Saisir la charge de la série ${setIndex + 1}`}
                                >
                                  {!data.weight && canEdit && <Feather name="plus" size={13} color={theme.colors.textSecondary} />}
                                  {!!data.pr && <Feather name="award" size={13} color="#F59E0B" />}
                                  <Text style={[
                                    styles.athleteValueButtonText,
                                    data.weight ? styles.athleteValueFilledText : styles.athleteValuePlaceholder,
                                  ]}>
                                    {data.weight ? `${data.weight} kg${data.repsOk === false ? ' ✗' : ''}` : canEdit ? 'Poids' : '—'}
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
                                  disabled={!canEdit}
                                  onPress={() => {
                                    const idx = allSets.findIndex(s => s.exercise.id === exercise.id && s.setIndex === setIndex);
                                    if (idx >= 0) openKeypadAtIndex(idx);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={data.chrono ? `Chrono série ${setIndex + 1} : ${data.chrono}` : `Saisir le chrono de la série ${setIndex + 1}`}
                                >
                                  <Feather
                                    name={data.pr ? 'award' : 'clock'}
                                    size={13}
                                    color={data.pr ? '#F59E0B' : data.chrono ? theme.colors.sprintyBlue : theme.colors.textSecondary}
                                  />
                                  <Text style={[
                                    styles.athleteValueButtonText,
                                    data.chrono ? styles.athleteValueFilledText : styles.athleteValuePlaceholder,
                                  ]}>
                                    {data.chrono ? `${String(data.chrono).replace(".", ",")} ${(set.distance || 0) >= 800 ? 'min' : 's'}` : canEdit ? 'Chrono' : '—'}
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

        {/* ========== COACH LOOKING AT ONE ATHLETE: read-only comment ========== */}
        {isReadOnly && (!!athleteNotes.trim() || isValidated) && (
          <View style={styles.athleteBottom}>
            {!!athleteNotes.trim() && (
              <>
                <Text style={styles.sectionLabel}>Commentaire de l’athlète</Text>
                <Text style={styles.technicalNoteContent}>{athleteNotes.trim()}</Text>
              </>
            )}
            {user?.role === 'coach' && isValidated && !!workout?.id && (
              <CoachReplyBox
                workoutId={workout.id}
                value={coachReply}
                editable
                onSaved={(fb) => {
                  workout.measures = { ...(workout.measures || {}), coach_feedback: fb };
                  setCoachReply(fb);
                }}
              />
            )}
          </View>
        )}

        {/* ========== ATHLETE: the coach's answer ========== */}
        {canEdit && !!coachReply?.text && !!workout?.id && (
          <View style={styles.athleteBottom}>
            <CoachReplyBox workoutId={workout.id} value={coachReply} editable={false} onSaved={() => undefined} />
          </View>
        )}

        {/* ========== ATHLETE BOTTOM SECTION ========== */}
        {canEdit && (
          <View style={styles.athleteBottom}>
            {/* Felt effort and duration: session load */}
            {kind !== 'rest' && kind !== 'competition' && (
              <View>
                <Text style={styles.sectionLabel}>Effort ressenti (facultatif)</Text>
                <View style={styles.rpeRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <PressableScale
                      key={n}
                      haptic="selection"
                      containerStyle={styles.rpeCellContainer}
                      style={[styles.rpeCell, rpe === n && styles.rpeCellActive]}
                      onPress={() => setRpe(rpe === n ? null : n)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: rpe === n }}
                      accessibilityLabel={`Effort ressenti ${n} sur 10`}
                    >
                      <Text style={[styles.rpeText, rpe === n && styles.rpeTextActive]}>{n}</Text>
                    </PressableScale>
                  ))}
                </View>
                <View style={styles.rpeLegend}>
                  <Text style={styles.rpeLegendText}>Très facile</Text>
                  <Text style={styles.rpeLegendText}>Maximal</Text>
                </View>
                <View style={styles.durationRow}>
                  <Feather name="clock" size={15} color={theme.colors.textSecondary} />
                  <Text style={styles.durationLabel}>Durée de la séance</Text>
                  <TextInput
                    style={styles.durationInput}
                    value={durationMin}
                    onChangeText={(t) => setDurationMin(t.replace(/[^0-9]/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={theme.colors.sprintyBlue}
                    accessibilityLabel="Durée de la séance en minutes"
                  />
                  <Text style={styles.durationUnit}>min</Text>
                </View>
              </View>
            )}

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

            {awaitingSend && (
              <View style={styles.validatedHint}>
                <Feather name="clock" size={14} color={theme.colors.warning} />
                <Text style={styles.validatedHintText}>
                  Enregistré sur ce téléphone : il sera envoyé à ton coach dès que le réseau revient.
                </Text>
              </View>
            )}

            {isValidated && !awaitingSend && (
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

        {restEnd != null && !activeKeypad && (
          <View style={styles.restBanner} pointerEvents="box-none">
            <View style={styles.restPill}>
              <Feather name="pause-circle" size={16} color={restLeft === 0 ? theme.colors.success : theme.colors.sprintyBlue} />
              <Text style={styles.restText}>
                {restLeft === 0 ? 'C’est reparti !' : `Récupération ${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, '0')}`}
              </Text>
              <PressableScale haptic="selection" onPress={() => setRestEnd(null)} accessibilityRole="button" accessibilityLabel="Arrêter le minuteur" hitSlop={8}>
                <Text style={styles.restSkip}>{restLeft === 0 ? 'OK' : 'Passer'}</Text>
              </PressableScale>
            </View>
          </View>
        )}

        {activeKeypad && (
          <AthleteValueKeypadModal
            visible={!!activeKeypad}
            onClose={() => setActiveKeypad(null)}
            onSave={handleKeypadSave}
            onNext={handleKeypadNext}
            hasNextSet={activeKeypad.flattenedIndex < allSets.length - 1}
            resetKey={activeKeypad.flattenedIndex}
            initialValue={activeKeypad.initialValue}
            initialRepsOk={activeKeypad.initialRepsOk}
            mode={activeKeypad.mode}
            distance={activeKeypad.distance}
            title={activeKeypad.title}
            subtitle={activeKeypad.subtitle}
          />
        )}

        {canEdit && resultsOwnerId && maxEdit && (
          <MaxEditSheet
            visible={!!maxEdit}
            onClose={() => setMaxEdit(null)}
            athleteId={resultsOwnerId}
            exerciseKey={maxEdit.key}
            label={maxEdit.label}
            manualKg={maxes[maxEdit.key]?.manual_kg ?? null}
            estimatedKg={maxes[maxEdit.key]?.estimated_kg ?? null}
            onSaved={loadMaxes}
          />
        )}

        {/* Copy/Repeat Modals (Coach only) */}
        {isCoach && (
          <>
            <Modal visible={showTemplateName} transparent animationType="fade" onRequestClose={() => setShowTemplateName(false)}>
              <FeedbackHost />
              <View style={styles.nameBackdrop}>
                <View style={styles.nameCard}>
                  <Text style={styles.nameTitle}>Enregistrer en séance type</Text>
                  <Text style={styles.nameHint}>Tu pourras la reprogrammer sur n’importe quel jour depuis « Séances types ».</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={templateName}
                    onChangeText={setTemplateName}
                    placeholder="Nom de la séance type"
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={theme.colors.sprintyBlue}
                    maxLength={60}
                    autoFocus
                    accessibilityLabel="Nom de la séance type"
                  />
                  <View style={styles.nameActions}>
                    <PressableScale containerStyle={{ flex: 1 }} style={styles.nameCancel} onPress={() => setShowTemplateName(false)} accessibilityRole="button">
                      <Text style={styles.nameCancelText}>Annuler</Text>
                    </PressableScale>
                    <PressableScale
                      containerStyle={{ flex: 1 }}
                      style={[styles.nameConfirm, (!templateName.trim() || savingTemplate) && { opacity: 0.5 }]}
                      disabled={!templateName.trim() || savingTemplate}
                      accessibilityRole="button"
                      onPress={async () => {
                        if (!user?.id) return;
                        setSavingTemplate(true);
                        try {
                          await workoutService.saveSessionAsTemplate(user.id, templateName, workout);
                          setShowTemplateName(false);
                          toast('success', 'Séance type enregistrée.');
                        } catch {
                          appAlert('Erreur', 'Impossible d’enregistrer la séance type.');
                        } finally {
                          setSavingTemplate(false);
                        }
                      }}
                    >
                      {savingTemplate ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.nameConfirmText}>Enregistrer</Text>}
                    </PressableScale>
                  </View>
                </View>
              </View>
            </Modal>
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
            <ProgramModal
              visible={showProgramModal}
              onClose={() => setShowProgramModal(false)}
              workout={workout}
              onDone={() => {
                setShowProgramModal(false);
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
    minHeight: 54,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  actionBtnText: {
    fontSize: 12,
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
  execMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  execMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  execMetaText: { fontSize: 12, fontWeight: '700', color: theme.colors.sprintyBlue },
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
  prevHint: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginTop: 2 },
  maxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  maxChipText: { fontSize: 12, fontWeight: '700' },
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
  rpeRow: { flexDirection: 'row', gap: 4 },
  rpeCellContainer: { flex: 1 },
  rpeCell: {
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeCellActive: { backgroundColor: theme.colors.sprintyBlue },
  rpeText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, fontVariant: ['tabular-nums'] },
  rpeTextActive: { color: '#FFFFFF' },
  rpeLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rpeLegendText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  durationLabel: { flex: 1, flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  durationInput: { width: 56, textAlign: 'right', fontSize: 17, fontWeight: '800', color: theme.colors.text, padding: 0 },
  durationUnit: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  nameBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 24 },
  nameCard: { borderRadius: 24, borderCurve: 'continuous', padding: 20, gap: 12, backgroundColor: theme.colors.surface },
  nameTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.2 },
  nameHint: { fontSize: 13.5, lineHeight: 19, color: theme.colors.textSecondary },
  nameInput: { height: 48, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, fontSize: 16, fontWeight: '600', color: theme.colors.text, backgroundColor: theme.colors.glassFill },
  nameActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  nameCancel: { height: 46, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.glassFill },
  nameCancelText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  nameConfirm: { height: 46, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.sprintyBlue },
  nameConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  restBanner: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', zIndex: 50 },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  restText: { fontSize: 15, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  restSkip: { fontSize: 14, fontWeight: '700', color: theme.colors.sprintyBlue },
  validationsCard: {
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    gap: 10,
  },
  validationsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  validationsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  validationsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  validationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  validationChipDone: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  validationChipTodo: { backgroundColor: 'rgba(100, 116, 139, 0.12)' },
  validationChipText: { fontSize: 12.5, fontWeight: '700' },
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
