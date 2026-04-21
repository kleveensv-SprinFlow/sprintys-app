import { create } from 'zustand';
import { WorkoutSession, Exercise, Set, WorkoutHistoryItem } from '../features/workout/types';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutState {
  activeSession: WorkoutSession | null;
  history: WorkoutHistoryItem[];
  timer: number; // seconds
  
  // Actions
  startWorkout: (name: string) => void;
  addExercise: (name: string) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Set>) => void;
  toggleSetCompletion: (exerciseId: string, setId: string) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;
  tickTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  history: [],
  timer: 0,

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

  addExercise: (name) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const newExercise: Exercise = {
      id: uuidv4(),
      name,
      sets: [{ id: uuidv4(), weight: 0, reps: 0, isCompleted: false }],
    };

    set({
      activeSession: {
        ...activeSession,
        exercises: [...activeSession.exercises, newExercise],
      },
    });
  },

  addSet: (exerciseId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { 
              id: uuidv4(), 
              weight: lastSet?.weight || 0, 
              reps: lastSet?.reps || 0, 
              isCompleted: false 
            },
          ],
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

    const updatedExercises = activeSession.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map((s) => 
            s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s
          ),
        };
      }
      return ex;
    });

    set({ activeSession: { ...activeSession, exercises: updatedExercises } });
  },

  finishWorkout: () => {
    const { activeSession, timer, history } = get();
    if (!activeSession) return;

    // Calculate total volume
    let totalVolume = 0;
    activeSession.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isCompleted) totalVolume += s.weight * s.reps;
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
    });
  },

  cancelWorkout: () => set({ activeSession: null, timer: 0 }),

  tickTimer: () => set((state) => ({ timer: state.timer + 1 })),
}));
