import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { FastWorkoutBuilder } from '../../calendar/components/FastWorkoutBuilder';
import { theme } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { useWorkoutBuilderStore } from '../../../store/workoutBuilderStore';

interface Props {
  athleteId: string;
}

export const WorkoutBuilder: React.FC<Props> = ({ athleteId }) => {
  const router = useRouter();
  const initBuilder = useWorkoutBuilderStore(s => s.initBuilder);

  useEffect(() => {
    initBuilder(athleteId);
  }, [athleteId]);

  const handleClose = () => {
    router.back();
  };

  const handleSave = () => {
    router.replace('/(coach)/calendar');
  };

  return (
    <SafeAreaView style={styles.container}>
      <FastWorkoutBuilder 
        athleteId={athleteId} 
        date={new Date()} 
        onClose={handleClose} 
        onSave={handleSave} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  }
});
