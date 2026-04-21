import { create } from 'zustand';
import { Workout, WorkoutExercise, Set } from '../features/workouts/types';
import { useRecordsStore } from './useRecordsStore';
import uuid from 'react-native-uuid';

interface WorkoutState {
  activeWorkout: Workout | null;
  workoutHistory: Workout[];
  
  // Builder/Active actions
  startWorkout: (name: string) => void;
  addExercise: (exercise: any) => void;
  removeExercise: (workoutExerciseId: string) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<Set>) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  completeSet: (workoutExerciseId: string, setId: string) => void;
  finishWorkout: (rpe?: number, notes?: string) => void;
  cancelWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  workoutHistory: [],

  startWorkout: (name) => {
    set({
      activeWorkout: {
        id: uuid.v4().toString(),
        name,
        date: new Date(),
        exercises: [],
        isCompleted: false,
      },
    });
  },

  addExercise: (exercise) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const newWorkoutExercise: WorkoutExercise = {
      id: uuid.v4().toString(),
      exerciseId: exercise.id,
      exercise,
      sets: [
        { id: uuid.v4().toString(), reps: 0, weight: 0, isCompleted: false }
      ],
      restTimerSeconds: 90, // default rest
    };

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, newWorkoutExercise],
      },
    });
  },

  removeExercise: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: activeWorkout.exercises.filter((e) => e.id !== workoutExerciseId),
      },
    });
  },

  addSet: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((e) => {
      if (e.id === workoutExerciseId) {
        const lastSet = e.sets[e.sets.length - 1];
        const newSet: Set = {
          id: uuid.v4().toString(),
          reps: lastSet ? lastSet.reps : 0,
          weight: lastSet ? lastSet.weight : 0,
          isCompleted: false,
        };
        return { ...e, sets: [...e.sets, newSet] };
      }
      return e;
    });

    set({ activeWorkout: { ...activeWorkout, exercises: updatedExercises } });
  },

  updateSet: (workoutExerciseId, setId, updates) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((e) => {
      if (e.id === workoutExerciseId) {
        const updatedSets = e.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s));
        return { ...e, sets: updatedSets };
      }
      return e;
    });

    set({ activeWorkout: { ...activeWorkout, exercises: updatedExercises } });
  },

  removeSet: (workoutExerciseId, setId) => {
      const { activeWorkout } = get();
      if (!activeWorkout) return;

      const updatedExercises = activeWorkout.exercises.map((e) => {
        if (e.id === workoutExerciseId) {
            const updatedSets = e.sets.filter((s) => s.id !== setId);
            return { ...e, sets: updatedSets };
        }
        return e;
      });

      set({ activeWorkout: { ...activeWorkout, exercises: updatedExercises } });
  },

  completeSet: (workoutExerciseId, setId) => {
    const { activeWorkout, updateSet } = get();
    if (!activeWorkout) return;
    
    // Toggle completed status
    const exercise = activeWorkout.exercises.find(e => e.id === workoutExerciseId);
    if(exercise) {
        const currentSet = exercise.sets.find(s => s.id === setId);
        if(currentSet) {
             updateSet(workoutExerciseId, setId, { isCompleted: !currentSet.isCompleted });
        }
    }
  },

  finishWorkout: (rpe, notes) => {
    const { activeWorkout, workoutHistory } = get();
    if (!activeWorkout) return;

    // Calculate total volume and duration
    let volumeTotal = 0;
    activeWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isCompleted) {
          volumeTotal += s.reps * s.weight;
        }
      });
    });

    const durationMinutes = Math.floor((new Date().getTime() - activeWorkout.date.getTime()) / 60000);

    const completedWorkout: Workout = {
      ...activeWorkout,
      isCompleted: true,
      volumeTotal,
      durationMinutes,
      overallRpe: rpe,
      notes,
    };

    // Check for PRs
    useRecordsStore.getState().checkAndSaveRecords(completedWorkout);

    set({
      activeWorkout: null,
      workoutHistory: [completedWorkout, ...workoutHistory],
    });
  },

  cancelWorkout: () => {
    set({ activeWorkout: null });
  },
}));
