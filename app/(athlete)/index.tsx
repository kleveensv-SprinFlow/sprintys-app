import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { WorkoutHistory } from '../../src/features/workout/components/WorkoutHistory';
import { Button } from '../../src/shared/components/Button';
import { Card } from '../../src/shared/components/Card';
import { GlowView } from '../../src/shared/components/GlowView';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useAuthStore } from '../../src/store/authStore';
import { workoutService } from '../../src/services/workoutService';
import { theme } from '../../src/core/theme';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { startWorkout, startAssignedWorkout } = useWorkoutStore();
  const { user } = useAuthStore();
  const [pendingWorkout, setPendingWorkout] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const workout = await workoutService.fetchPendingWorkout(user.id);
      setPendingWorkout(workout);
    } catch (error) {
      console.error('Failed to fetch pending workout', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleStartAssigned = () => {
    if (pendingWorkout) {
      startAssignedWorkout(pendingWorkout);
      router.push('/workout');
    }
  };

  const handleStartFree = () => {
    startWorkout('Séance Libre');
    router.push('/workout');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadData} tintColor={theme.colors.accent} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>BIENVENUE, {user?.name.split(' ')[0].toUpperCase()}</Text>
          <Text style={styles.title}>Votre Performance</Text>
        </View>

        {pendingWorkout && (
          <GlowView active variant="surface" style={styles.glow}>
            <Card variant="glass" style={styles.assignedCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>PLAN DU JOUR</Text>
                <Text style={styles.cardTitle}>{pendingWorkout.type_seance}</Text>
              </View>
              <Text style={styles.cardDesc}>
                Votre coach vous a assigné une séance. Prêt à relever le défi ?
              </Text>
              <Button
                title="DÉMARRER LA SÉANCE"
                onPress={handleStartAssigned}
                variant="primary"
              />
            </Card>
          </GlowView>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HISTORIQUE RÉCENT</Text>
          <WorkoutHistory />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!pendingWorkout && (
          <Button
            title="SÉANCE LIBRE"
            onPress={handleStartFree}
            variant="outline"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
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
  glow: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  assignedCard: {
    padding: theme.spacing.lg,
  },
  cardHeader: {
    marginBottom: theme.spacing.md,
  },
  cardLabel: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  cardDesc: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  section: {
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
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: theme.spacing.xl,
    paddingBottom: 30,
  },
});
