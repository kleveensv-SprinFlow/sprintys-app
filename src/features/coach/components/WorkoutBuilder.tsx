import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useWorkoutBuilderStore } from '../../../store/workoutBuilderStore';
import { ExerciseBuilderCard } from './ExerciseBuilderCard';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';
import { useRouter } from 'expo-router';

interface Props {
  athleteId: string;
}

export const WorkoutBuilder: React.FC<Props> = ({ athleteId }) => {
  const { 
    currentSessionName, 
    setSessionName, 
    exercises, 
    addExercise, 
    initBuilder,
    resetBuilder 
  } = useWorkoutBuilderStore();
  const router = useRouter();

  useEffect(() => {
    initBuilder(athleteId);
    return () => resetBuilder();
  }, [athleteId]);

  const handleSave = () => {
    // Logic to save to Supabase will go here
    console.log('Saving workout for', athleteId, exercises);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>BUILDER DE SÉANCE</Text>
        <Input
          placeholder="Nom de la séance (ex: Force Bas du Corps)"
          value={currentSessionName}
          onChangeText={setSessionName}
          style={styles.sessionInput}
          containerStyle={styles.sessionInputContainer}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.map((ex) => (
          <ExerciseBuilderCard key={ex.id} exercise={ex} />
        ))}

        <Button
          title="+ AJOUTER UN EXERCICE"
          variant="outline"
          onPress={() => addExercise('Nouvel Exercice')}
          style={styles.addExBtn}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="VALIDER ET ASSIGNER"
          variant="primary"
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={exercises.length === 0}
        />
        <Button
          title="ANNULER"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  welcome: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
    marginBottom: theme.spacing.md,
  },
  sessionInputContainer: {
    marginBottom: 0,
  },
  sessionInput: {
    fontSize: 20,
    fontWeight: theme.typography.fontWeights.bold as any,
    color: theme.colors.text,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  addExBtn: {
    marginTop: theme.spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  saveBtn: {
    width: '100%',
  },
});
