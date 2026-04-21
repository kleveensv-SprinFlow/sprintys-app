import { create } from 'zustand';
import { WorkoutSession, Exercise, Set, WorkoutHistoryItem } from '../features/workout/types';
import { workoutService } from '../services/workoutService';
import { useInsightStore } from './insightStore';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutState {
  activeSession: WorkoutSession | null;
  history: WorkoutHistoryItem[];
  timer: number;
  isLoading: boolean;
  
  // Actions
  startWorkout: (name: string) => void;
  startAssignedWorkout: (supabaseWorkout: any) => void;
  addExercise: (name: string) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Set>) => void;
  toggleSetCompletion: (exerciseId: string, setId: string) => void;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => void;
  tickTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  history: [],
  timer: 0,
  isLoading: false,

  startWorkout: (name) => {
    set({
      activeSession: {
        id: uuidv4(),
        name,
        startTime: Date.now(),
        exercises: [],
        status: 'active',
      },
      timer: 0,
    });
  },

  startAssignedWorkout: (sw) => {
    // Map Supabase JSONB to local session
    const localExercises: Exercise[] = sw.exercises.map((ex: any) => ({
      ...ex,
      sets: ex.sets.map((s: any) => ({ ...s, isCompleted: false }))
    }));

    set({
      activeSession: {
        id: sw.id, // Keep Supabase ID
        name: sw.type_seance,
        startTime: Date.now(),
        exercises: localExercises,
        status: 'active',
      },
      timer: 0,
    });
  },

  addExercise: (name) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const newExercise: Exercise = {
      id: uuidv4(),
      name,
      sets: [{ id: uuidv4(), weight: 0, reps: 0, isCompleted: false }],
    };
    set({ activeSession: { ...activeSession, exercises: [...activeSession.exercises, newExercise] } });
  },

  addSet: (exerciseId) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { 
            id: uuidv4(), 
            weight: lastSet?.weight || 0, 
            reps: lastSet?.reps || 0, 
            isCompleted: false 
          }],
        };
      }
      return ex;
    });
    set({ activeSession: { ...activeSession, exercises: updatedExercises } });
  },

  updateSet: (exerciseId, setId, updates) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
        };
      }
      return ex;
    });
    set({ activeSession: { ...activeSession, exercises: updatedExercises } });
  },

  toggleSetCompletion: (exerciseId, setId) => {
    const { activeSession } = get();
    if (!activeSession) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updatedExercises = activeSession.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map((s) => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s),
        };
      }
      return ex;
    });
    set({ activeSession: { ...activeSession, exercises: updatedExercises } });
  },

  finishWorkout: async () => {
    const { activeSession, timer, history } = get();
    if (!activeSession) return;

    set({ isLoading: true });

    try {
      // If it was an assigned workout (has uuid), update Supabase
      if (activeSession.id.length > 20) { // Simple UUID check
        await workoutService.completeWorkout(activeSession.id);
      }

      let totalVolume = 0;
      activeSession.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (s.isCompleted) totalVolume += (s.weight || 0) * (s.reps || 0);
        });
      });

      const historyItem: WorkoutHistoryItem = {
        id: activeSession.id,
        name: activeSession.name,
        date: new Date().toISOString(),
        durationMinutes: Math.floor(timer / 60),
        totalVolume,
      };

      set({
        activeSession: null,
        timer: 0,
        history: [historyItem, ...history],
        isLoading: false,
      });

      // Trigger Intelligent Analysis
      useInsightStore.getState().runAnalysis();
    } catch (error) {
      console.error('Failed to complete workout:', error);
      set({ isLoading: false });
    }
  },

  cancelWorkout: () => set({ activeSession: null, timer: 0 }),
  tickTimer: () => set((state) => ({ timer: state.timer + 1 })),
}));
