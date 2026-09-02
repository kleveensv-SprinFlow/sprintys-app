import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useWorkoutStore } from '../../../store/workoutStore';
import { useSprintyStore } from '../../../store/sprintyStore';
import { useInsightStore } from '../../../store/insightStore';
import { ExerciseRow } from './ExerciseRow';
import { Button } from '../../../shared/components/Button';
import { theme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';

export const ActiveWorkoutSession: React.FC = () => {
  const { activeSession, timer, tickTimer, addExercise, finishWorkout, cancelWorkout, isLoading } = useWorkoutStore();
  const showFeedback = useSprintyStore(state => state.showFeedback);
  const runAnalysis = useInsightStore(state => state.runAnalysis);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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
        {activeSession.blocks.map((block) => (
          <View key={block.id} style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>{block.name}</Text>
            </View>
            <View style={styles.exercisesContainer}>
              {block.exercises.map((ex) => (
                <ExerciseRow key={ex.id} blockId={block.id} exercise={ex as any} />
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseBtn} 
          onPress={() => {
            Alert.alert(
              "Ajouter un exercice libre",
              "Choisissez le type",
              [
                { text: "Musculation", onPress: () => addExercise('Nouvel Exo', 'strength') },
                { text: "Course / Piste", onPress: () => addExercise('Nouvel Exo', 'run') },
                { text: "Annuler", style: "cancel" }
              ]
            );
          }}
        >
          <Feather name="plus-circle" size={18} color={theme.colors.accent} />
          <Text style={styles.addExerciseText}>AJOUTER UN EXERCICE</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.border },
  sessionName: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  timerText: { color: theme.colors.text, fontSize: 48, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  scrollContent: { padding: theme.spacing.md, paddingBottom: 120 },
  
  blockCard: { backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  blockHeader: { padding: 12, backgroundColor: theme.colors.surfaceLight, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  blockTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  exercisesContainer: { padding: 12 },

  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.accent + '50', borderStyle: 'dashed', borderRadius: 12, gap: 8, backgroundColor: theme.colors.accent + '05' },
  addExerciseText: { color: theme.colors.accent, fontWeight: 'bold', fontSize: 14 },
  
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: theme.spacing.xl, backgroundColor: 'rgba(5, 5, 5, 0.95)', borderTopWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', gap: theme.spacing.md },
  finishBtn: { flex: 2 },
  cancelBtn: { flex: 1 },
});
