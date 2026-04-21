import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WorkoutHistory } from '../../src/features/workout/components/WorkoutHistory';
import { Button } from '../../src/shared/components/Button';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { theme } from '../../src/core/theme';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { startWorkout } = useWorkoutStore();
  const router = useRouter();

  const handleStart = () => {
    startWorkout('Séance Musculation');
    router.push('/workout');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>BIENVENUE, ATHLÈTE</Text>
        <Text style={styles.title}>Votre Performance</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>HISTORIQUE RÉCENT</Text>
        <WorkoutHistory />
      </View>

      <View style={styles.footer}>
        <Button
          title="DÉMARRER UNE SÉANCE"
          onPress={handleStart}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  welcome: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold as any,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.xl,
    paddingBottom: 20,
  },
});
