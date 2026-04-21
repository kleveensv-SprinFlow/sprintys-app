import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useSprintyStore } from '../../../store/sprintyStore';
import { useInsightStore } from '../../../store/insightStore';
import { ExerciseRow } from './ExerciseRow';
import { Button } from '../../../shared/components/Button';
import { theme } from '../../../core/theme';
import { Card } from '../../../shared/components/Card';

export const ActiveWorkoutSession: React.FC = () => {
  const { activeSession, timer, tickTimer, addExercise, finishWorkout, cancelWorkout, isLoading } = useWorkoutStore();
  const showFeedback = useSprintyStore(state => state.showFeedback);
  const runAnalysis = useInsightStore(state => state.runAnalysis);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => tickTimer(), 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) return null;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 && hrs > 0 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFinish = async () => {
    Alert.alert(
      "Terminer la séance",
      "Voulez-vous enregistrer vos performances ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Enregistrer", 
          onPress: async () => {
            await finishWorkout();
            showFeedback('success', 'Séance terminée ! Vos données sont synchronisées.');
            runAnalysis();
          }, 
          style: "default" 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sessionName}>{activeSession.name.toUpperCase()}</Text>
        <Text style={styles.timerText}>{formatTime(timer)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeSession.exercises.map((ex) => (
          <Card key={ex.id} style={styles.exerciseCard}>
            <ExerciseRow exercise={ex} />
          </Card>
        ))}

        <Button
          title="+ AJOUTER UN EXERCICE"
          variant="outline"
          onPress={() => addExercise('Nouvel Exercice')}
          style={styles.addExerciseBtn}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="TERMINER"
          variant="primary"
          onPress={handleFinish}
          style={styles.finishBtn}
          loading={isLoading}
          disabled={isLoading}
        />
        <Button
          title="ANNULER"
          variant="ghost"
          onPress={cancelWorkout}
          style={styles.cancelBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionName: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerText: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: theme.typography.fontWeights.bold as any,
    fontVariant: ['tabular-nums'],
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  exerciseCard: {
    marginBottom: theme.spacing.lg,
  },
  addExerciseBtn: {
    marginTop: theme.spacing.md,
    marginBottom: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  finishBtn: {
    flex: 2,
  },
  cancelBtn: {
    flex: 1,
  },
});
