import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActiveWorkoutSession } from '../../src/features/workout/components/ActiveWorkoutSession';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Button } from '../../src/shared/components/Button';
import { theme } from '../../src/core/theme';
import { useRouter } from 'expo-router';

export default function WorkoutScreen() {
  const { activeSession, startWorkout } = useWorkoutStore();
  const router = useRouter();

  if (!activeSession) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Prêt pour le combat ?</Text>
        <Text style={styles.emptySubtitle}>Aucune séance active pour le moment.</Text>
        <Button
          title="COMMENCER MAINTENANT"
          onPress={() => startWorkout('Séance Musculation')}
          style={styles.startBtn}
        />
        <Button
          title="RETOUR AU DASHBOARD"
          onPress={() => router.replace('/')}
          variant="ghost"
        />
      </View>
    );
  }

  return <ActiveWorkoutSession />;
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  startBtn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
});
