import { create } from 'zustand';
import uuid from 'react-native-uuid';
import { animateLayout } from '../shared/utils/animations';

export type WorkoutCategory = 'Lactique' | 'Musculation' | 'Aérobie' | 'Escalier' | 'Technique';

export interface BuilderSet {
  id: string;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: string; // e.g. "00:30"
  steps?: number;
  restSeconds: number;
}

export interface BuilderExercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  tags: string[];
  sets: BuilderSet[];
}

export interface LibraryExercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  tags: string[];
}

interface WorkoutBuilderState {
  currentSessionName: string;
  category: WorkoutCategory;
  exercises: BuilderExercise[];
  targetAthleteId: string | null;
  
  // Library
  exerciseLibrary: LibraryExercise[];
  
  // Actions
  initBuilder: (athleteId: string) => void;
  setSessionName: (name: string) => void;
  setCategory: (cat: WorkoutCategory) => void;
  addExerciseFromLibrary: (libEx: LibraryExercise) => void;
  addCustomExercise: (name: string) => void;
  removeExercise: (id: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<BuilderSet>) => void;
  resetBuilder: () => void;
}

const DEFAULT_LIBRARY: LibraryExercise[] = [
  { id: 'l1', name: 'Squat', category: 'Musculation', tags: ['Bas du corps', 'Quadri'] },
  { id: 'l2', name: 'Développé Couché', category: 'Musculation', tags: ['Haut du corps'] },
  { id: 'l3', name: '400m Sprint', category: 'Lactique', tags: ['Bas du corps'] },
  { id: 'l4', name: 'Course de fond', category: 'Aérobie', tags: ['Bas du corps'] },
  { id: 'l5', name: 'Escaliers Puissance', category: 'Escalier', tags: ['Bas du corps'] },
  { id: 'l6', name: 'Technique Départ', category: 'Technique', tags: ['Haut du corps', 'Bas du corps'] },
  { id: 'l7', name: 'Soulevé de terre', category: 'Musculation', tags: ['Bas du corps', 'Ischios', 'Haltérophilie'] },
];

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set) => ({
  currentSessionName: 'Nouvelle Séance',
  category: 'Musculation',
  exercises: [],
  targetAthleteId: null,
  exerciseLibrary: DEFAULT_LIBRARY,

  initBuilder: (athleteId) => set({ 
    targetAthleteId: athleteId, 
    exercises: [], 
    currentSessionName: 'Nouvelle Séance',
    category: 'Musculation'
  }),

  setSessionName: (name) => set({ currentSessionName: name }),
  setCategory: (category) => {
    animateLayout();
    set({ category, exercises: [] });
  },

  addExerciseFromLibrary: (libEx) => {
    animateLayout();
    set((state) => ({
      exercises: [
        ...state.exercises,
        {
          id: uuid.v4() as string,
          name: libEx.name,
          category: libEx.category,
          tags: libEx.tags,
          sets: [createDefaultSet(libEx.category)]
        }
      ]
    }));
  },

  addCustomExercise: (name) => {
    animateLayout();
    set((state) => ({
      exercises: [
        ...state.exercises,
        {
          id: uuid.v4() as string,
          name,
          category: state.category,
          tags: [],
          sets: [createDefaultSet(state.category)]
        }
      ]
    }));
  },

  removeExercise: (id) => {
    animateLayout();
    set((state) => ({
      exercises: state.exercises.filter(ex => ex.id !== id)
    }));
  },

  addSet: (exerciseId) => {
    animateLayout();
    set((state) => ({
      exercises: state.exercises.map(ex => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [...ex.sets, { ...lastSet, id: uuidv4() }]
          };
        }
        return ex;
      })
    }));
  },

  removeSet: (exerciseId, setId) => {
    animateLayout();
    set((state) => ({
      exercises: state.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
        }
        return ex;
      })
    }));
  },

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

  resetBuilder: () => set({ 
    exercises: [], 
    targetAthleteId: null, 
    currentSessionName: 'Nouvelle Séance',
    category: 'Musculation'
  }),
}));

function createDefaultSet(category: WorkoutCategory): BuilderSet {
  const base = { id: uuid.v4() as string, restSeconds: 60 };
  switch (category) {
    case 'Musculation': return { ...base, reps: 10, weight: 0 };
    case 'Aérobie':
    case 'Lactique': return { ...base, distance: 400, duration: '00:00' };
    case 'Escalier': return { ...base, steps: 50 };
    default: return { ...base, reps: 10 };
  }
}
