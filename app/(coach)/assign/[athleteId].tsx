import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WorkoutBuilder } from '../../../src/features/coach/components/WorkoutBuilder';

export default function AssignWorkoutScreen() {
  const { athleteId } = useLocalSearchParams();

  return <WorkoutBuilder athleteId={athleteId as string} />;
}
