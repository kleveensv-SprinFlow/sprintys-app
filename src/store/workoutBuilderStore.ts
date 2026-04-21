import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface BuilderSet {
  id: string;
  reps: number;
  weight: number;
  restSeconds: number;
}

export interface BuilderExercise {
  id: string;
  name: string;
  sets: BuilderSet[];
}

interface WorkoutBuilderState {
  currentSessionName: string;
  exercises: BuilderExercise[];
  targetAthleteId: string | null;
  
  // Actions
  initBuilder: (athleteId: string) => void;
  setSessionName: (name: string) => void;
  addExercise: (name: string) => void;
  removeExercise: (id: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<BuilderSet>) => void;
  resetBuilder: () => void;
}

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set) => ({
  currentSessionName: 'Nouvelle Séance',
  exercises: [],
  targetAthleteId: null,

  initBuilder: (athleteId) => set({ 
    targetAthleteId: athleteId, 
    exercises: [], 
    currentSessionName: 'Nouvelle Séance' 
  }),

  setSessionName: (name) => set({ currentSessionName: name }),

  addExercise: (name) => set((state) => ({
    exercises: [
      ...state.exercises,
      {
        id: uuidv4(),
        name,
        sets: [{ id: uuidv4(), reps: 10, weight: 0, restSeconds: 60 }]
      }
    ]
  })),

  removeExercise: (id) => set((state) => ({
    exercises: state.exercises.filter(ex => ex.id !== id)
  })),

  addSet: (exerciseId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { 
              id: uuidv4(), 
              reps: lastSet?.reps || 10, 
              weight: lastSet?.weight || 0, 
              restSeconds: lastSet?.restSeconds || 60 
            }
          ]
        };
      }
      return ex;
    })
  })),

  removeSet: (exerciseId, setId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
      }
      return ex;
    })
  })),

  updateSet: (exerciseId, setId, updates) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
        };
      }
      return ex;
    })
  })),

  resetBuilder: () => set({ exercises: [], targetAthleteId: null, currentSessionName: 'Nouvelle Séance' }),
}));
