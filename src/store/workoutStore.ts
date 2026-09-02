import { create } from 'zustand';
import { WorkoutSession, WorkoutHistoryItem } from '../features/workout/types';
import { workoutService } from '../services/workoutService';
import { useSprintyStore } from './sprintyStore';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { WorkoutBlock, WorkoutExercise, WorkoutSet } from '../types/workout';

export interface ActiveSet extends WorkoutSet {
  isCompleted: boolean;
}

export interface ActiveBlock extends Omit<WorkoutBlock, 'exercises'> {
  exercises: (Omit<WorkoutExercise, 'sets'> & { sets: ActiveSet[] })[];
}

export interface ActiveWorkoutSession {
  id: string;
  name: string;
  startTime: number;
  status: 'active';
  blocks: ActiveBlock[];
}

interface WorkoutState {
  activeSession: ActiveWorkoutSession | null;
  pendingWorkout: any | null;
  upcomingWorkouts: any[];
  history: WorkoutHistoryItem[];
  timer: number;
  isLoading: boolean;
  
  // Actions
  loadPendingWorkout: (athleteId: string) => Promise<void>;
  loadUpcomingWorkouts: (athleteId: string) => Promise<void>;
  startWorkout: (name: string) => void;
  startAssignedWorkout: (supabaseWorkout: any) => void;
  addExercise: (name: string, category?: 'strength'|'run'|'jump'|'metrics') => void;
  addSet: (blockId: string, exerciseId: string) => void;
  updateSet: (blockId: string, exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void;
  toggleSetCompletion: (blockId: string, exerciseId: string, setId: string) => void;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => void;
  tickTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  pendingWorkout: null,
  upcomingWorkouts: [],
  history: [],
  timer: 0,
  isLoading: false,

  loadPendingWorkout: async (athleteId) => {
    set({ isLoading: true });
    try {
      const workout = await workoutService.fetchPendingWorkout(athleteId);
      set({ pendingWorkout: workout, isLoading: false });
    } catch (error) {
      useSprintyStore.getState().showFeedback('error', "Impossible de récupérer votre séance planifiée.");
      set({ isLoading: false });
    }
  },

  loadUpcomingWorkouts: async (athleteId) => {
    try {
      const workouts = await workoutService.fetchUpcomingWorkouts(athleteId);
      set({ upcomingWorkouts: workouts });
    } catch (error) {
      console.error(error);
    }
  },

  startWorkout: (name) => {
    set({
      activeSession: {
        id: uuid.v4() as string,
        name,
        startTime: Date.now(),
        blocks: [],
        status: 'active',
      },
      timer: 0,
    });
  },

  startAssignedWorkout: (sw) => {
    let activeBlocks: ActiveBlock[] = [];

    // LECTURE PROGRESSIVE (ADAPTER PATTERN)
    // 1. Nouveau format par blocs JSON
    if (sw.blocks && Array.isArray(sw.blocks) && sw.blocks.length > 0) {
      activeBlocks = sw.blocks.map((b: any) => ({
        ...b,
        exercises: b.exercises.map((ex: any) => ({
          ...ex,
          sets: ex.sets.map((s: any) => ({ 
            ...s, 
            isCompleted: false,
            actual_reps: s.planned_reps, 
            actual_weight_kg: s.planned_weight_kg,
            actual_distance_m: s.planned_distance_m,
            actual_time_ms: s.planned_time_ms
          }))
        }))
      }));
    } 
    // 2. Ancien format (rétrocompatibilité)
    else if (sw.exercises && Array.isArray(sw.exercises) && sw.exercises.length > 0) {
      activeBlocks = [{
        id: uuid.v4() as string,
        type: 'free',
        name: 'Série Principale',
        exercises: sw.exercises.map((ex: any) => ({
          id: ex.id || uuid.v4() as string,
          catalog_id: null,
          name: ex.name,
          category: 'strength', // L'ancien format était 100% muscu
          sets: ex.sets.map((s: any, idx: number) => ({
            id: s.id || uuid.v4() as string,
            set_index: idx + 1,
            planned_reps: s.reps,
            planned_weight_kg: s.weight,
            actual_reps: s.reps,
            actual_weight_kg: s.weight,
            isCompleted: false,
          }))
        }))
      }];
    }

    set({
      activeSession: {
        id: sw.id,
        name: sw.type_seance,
        startTime: Date.now(),
        blocks: activeBlocks,
        status: 'active',
      },
      timer: 0,
    });
  },

  addExercise: (name, category = 'strength') => {
    const { activeSession } = get();
    if (!activeSession) return;
    const newEx = {
      id: uuid.v4() as string,
      catalog_id: null,
      name,
      category,
      sets: [{ id: uuid.v4() as string, set_index: 1, isCompleted: false, actual_reps: 0, actual_weight_kg: 0 }]
    };
    const updatedBlocks = [...activeSession.blocks];
    if (updatedBlocks.length > 0) {
      updatedBlocks[updatedBlocks.length - 1].exercises.push(newEx as any);
    } else {
      updatedBlocks.push({ id: uuid.v4() as string, type: 'free', name: 'Exercices Libres', exercises: [newEx as any] });
    }
    set({ activeSession: { ...activeSession, blocks: updatedBlocks } });
  },

  addSet: (blockId, exerciseId) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const updatedBlocks = activeSession.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exerciseId) {
              const lastSet = ex.sets[ex.sets.length - 1];
              return {
                ...ex,
                sets: [...ex.sets, {
                  id: uuid.v4() as string,
                  set_index: ex.sets.length + 1,
                  isCompleted: false,
                  actual_reps: lastSet?.actual_reps || 0,
                  actual_weight_kg: lastSet?.actual_weight_kg || 0,
                  actual_distance_m: lastSet?.actual_distance_m || 0,
                  actual_time_ms: lastSet?.actual_time_ms || 0,
                  planned_reps: lastSet?.planned_reps,
                  planned_weight_kg: lastSet?.planned_weight_kg,
                  planned_distance_m: lastSet?.planned_distance_m,
                  planned_time_ms: lastSet?.planned_time_ms,
                }]
              };
            }
            return ex;
          })
        };
      }
      return b;
    });
    set({ activeSession: { ...activeSession, blocks: updatedBlocks } });
  },

  updateSet: (blockId, exerciseId, setId, updates) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedBlocks = activeSession.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
              };
            }
            return ex;
          })
        };
      }
      return b;
    });

    set({ activeSession: { ...activeSession, blocks: updatedBlocks } });
  },

  toggleSetCompletion: (blockId, exerciseId, setId) => {
    const { activeSession } = get();
    if (!activeSession) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updatedBlocks = activeSession.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)
              };
            }
            return ex;
          })
        };
      }
      return b;
    });

    set({ activeSession: { ...activeSession, blocks: updatedBlocks } });
  },

  finishWorkout: async () => {
    const { activeSession, timer, history } = get();
    if (!activeSession) return;

    set({ isLoading: true });

    try {
      if (activeSession.id.length > 20) {
        const effortsToSubmit: any[] = [];
        let bIdx = 1;
        for (const block of activeSession.blocks) {
          for (const ex of block.exercises) {
            for (const set of ex.sets) {
              effortsToSubmit.push({
                exercise_catalog_id: ex.catalog_id,
                block_order: bIdx,
                set_order: set.set_index,
                exercise_category: ex.category,
                planned_reps: set.planned_reps,
                planned_weight_kg: set.planned_weight_kg,
                planned_distance_m: set.planned_distance_m,
                planned_time_ms: set.planned_time_ms,
                planned_rest_ms: set.planned_rest_ms,
                planned_height_cm: set.planned_height_cm,
                actual_reps: set.isCompleted ? set.actual_reps : null,
                actual_weight_kg: set.isCompleted ? set.actual_weight_kg : null,
                actual_distance_m: set.isCompleted ? set.actual_distance_m : null,
                actual_time_ms: set.isCompleted ? set.actual_time_ms : null,
                actual_rest_ms: set.isCompleted ? set.actual_rest_ms : null,
                actual_height_cm: set.isCompleted ? set.actual_height_cm : null,
                planned_intensity: set.planned_intensity,
                actual_intensity: set.isCompleted ? (set.actual_intensity || null) : null
              });
            }
          }
          bIdx++;
        }
        await workoutService.submitWorkoutResults(activeSession.id, effortsToSubmit);
      }
      
      const historyItem = { id: activeSession.id, name: activeSession.name, date: new Date().toISOString(), durationMinutes: Math.floor(timer / 60), totalVolume: 0 };
      set({ activeSession: null, timer: 0, history: [historyItem, ...history], isLoading: false });
    } catch (error) {
      console.error(error);
      useSprintyStore.getState().showFeedback('error', 'Echec de la synchronisation');
      set({ isLoading: false });
    }
  },

  cancelWorkout: () => set({ activeSession: null, timer: 0 }),
  tickTimer: () => set((state) => ({ timer: state.timer + 1 })),
}));
