import { create } from 'zustand';
import { Record } from '../features/records/types';
import { Workout } from '../features/workouts/types';
import uuid from 'react-native-uuid';

interface RecordsState {
  records: Record[];
  checkAndSaveRecords: (workout: Workout) => Record[]; // Returns new PRs
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],

  checkAndSaveRecords: (workout) => {
    const { records } = get();
    const newRecords: Record[] = [];
    const updatedRecords = [...records];

    workout.exercises.forEach((workoutEx) => {
      let maxWeightForEx = 0;
      let bestSetForMaxWeight = null;

      // Find the best set for this exercise in the current workout
      workoutEx.sets.forEach(set => {
        if (set.isCompleted && set.weight > maxWeightForEx) {
          maxWeightForEx = set.weight;
          bestSetForMaxWeight = set;
        }
      });

      if (bestSetForMaxWeight) {
        // Check if it beats existing record
        const existingRecord = updatedRecords.find(r => r.exerciseId === workoutEx.exerciseId);

        if (!existingRecord || maxWeightForEx > existingRecord.weight) {
          const newPr: Record = {
            id: uuid.v4().toString(),
            exerciseId: workoutEx.exerciseId,
            weight: maxWeightForEx,
            reps: bestSetForMaxWeight.reps,
            date: workout.date,
            workoutId: workout.id,
          };
          
          newRecords.push(newPr);
          
          // Remove old record if it exists
          if (existingRecord) {
            const index = updatedRecords.indexOf(existingRecord);
            updatedRecords.splice(index, 1);
          }
          updatedRecords.push(newPr);
        }
      }
    });

    if (newRecords.length > 0) {
      set({ records: updatedRecords });
    }

    return newRecords;
  }
}));
