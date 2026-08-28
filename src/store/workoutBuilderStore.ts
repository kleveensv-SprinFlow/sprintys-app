import { create } from 'zustand';
import uuid from 'react-native-uuid';
import { animateLayout } from '../shared/utils/animations';
export type WorkoutCategory = 'Général' | 'Musculation' | 'Lactique' | 'Aérobie' | 'Escalier' | string;

export interface BuilderSet {
  id: string;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: string; // e.g. "00:30"
  restSeconds?: number;
}

export interface BuilderExercise {
  id: string;
  name: string;
  category?: string;
  notes?: string;
  sets: BuilderSet[];
}

export interface BuilderBlock {
  id: string;
  name: string;
  exercises: BuilderExercise[];
}

export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  tags: string[];
}

interface WorkoutBuilderState {
  currentSessionName: string;
  category: WorkoutCategory | string;
  blocks: BuilderBlock[];
  targetAthleteId: string | null;
  
  // Actions
  initBuilder: (athleteId?: string) => void;
  setSessionName: (name: string) => void;
  setCategory: (cat: string) => void;
  addBlock: (name: string) => void;
  removeBlock: (blockId: string) => void;
  addExerciseToBlock: (blockId: string, name: string, category?: string) => void;
  removeExerciseFromBlock: (blockId: string, exerciseId: string) => void;
  updateExerciseNotes: (blockId: string, exerciseId: string, notes: string) => void;
  addSetToExercise: (blockId: string, exerciseId: string) => void;
  removeSetFromExercise: (blockId: string, exerciseId: string, setId: string) => void;
  updateSet: (blockId: string, exerciseId: string, setId: string, updates: Partial<BuilderSet>) => void;
  resetBuilder: () => void;
}

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set) => ({
  currentSessionName: 'Nouvelle Séance',
  category: 'Général',
  blocks: [],
  targetAthleteId: null,

  initBuilder: (athleteId) => set({ 
    targetAthleteId: athleteId || null, 
    blocks: [], 
    currentSessionName: 'Nouvelle Séance',
    category: 'Général'
  }),

  setSessionName: (name) => set({ currentSessionName: name }),
  setCategory: (category) => set({ category }),

  addBlock: (name) => {
    animateLayout();
    set((state) => ({
      blocks: [...state.blocks, { id: uuid.v4() as string, name, exercises: [] }]
    }));
  },

  removeBlock: (blockId) => {
    animateLayout();
    set((state) => ({
      blocks: state.blocks.filter(b => b.id !== blockId)
    }));
  },

  addExerciseToBlock: (blockId, name, category) => {
    animateLayout();
    set((state) => ({
      blocks: state.blocks.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            exercises: [
              ...b.exercises,
              {
                id: uuid.v4() as string,
                name,
                category,
                sets: [{ id: uuid.v4() as string, reps: 0, restSeconds: 60 }]
              }
            ]
          };
        }
        return b;
      })
    }));
  },

  removeExerciseFromBlock: (blockId, exerciseId) => {
    animateLayout();
    set((state) => ({
      blocks: state.blocks.map(b => {
        if (b.id === blockId) {
          return { ...b, exercises: b.exercises.filter(ex => ex.id !== exerciseId) };
        }
        return b;
      })
    }));
  },

  updateExerciseNotes: (blockId, exerciseId, notes) => set((state) => ({
    blocks: state.blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          exercises: b.exercises.map(ex => ex.id === exerciseId ? { ...ex, notes } : ex)
        };
      }
      return b;
    })
  })),

  addSetToExercise: (blockId, exerciseId) => {
    animateLayout();
    set((state) => ({
      blocks: state.blocks.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            exercises: b.exercises.map(ex => {
              if (ex.id === exerciseId) {
                const lastSet = ex.sets[ex.sets.length - 1];
                return {
                  ...ex,
                  sets: [...ex.sets, { ...lastSet, id: uuid.v4() as string }]
                };
              }
              return ex;
            })
          };
        }
        return b;
      })
    }));
  },

  removeSetFromExercise: (blockId, exerciseId, setId) => {
    animateLayout();
    set((state) => ({
      blocks: state.blocks.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            exercises: b.exercises.map(ex => {
              if (ex.id === exerciseId) {
                return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
              }
              return ex;
            })
          };
        }
        return b;
      })
    }));
  },

  updateSet: (blockId, exerciseId, setId, updates) => set((state) => ({
    blocks: state.blocks.map(b => {
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
    })
  })),

  resetBuilder: () => set({ 
    blocks: [], 
    targetAthleteId: null, 
    currentSessionName: 'Nouvelle Séance',
    category: 'Général'
  }),
}));
