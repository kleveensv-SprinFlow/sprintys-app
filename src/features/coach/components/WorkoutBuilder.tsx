import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useWorkoutBuilderStore, WorkoutCategory } from '../../../store/workoutBuilderStore';
import { useAuthStore } from '../../../store/authStore';
import { useSprintyStore } from '../../../store/sprintyStore';
import { workoutService } from '../../../services/workoutService';
import { ExerciseBuilderCard } from './ExerciseBuilderCard';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { theme } from '../../../core/theme';
import { useRouter } from 'expo-router';

interface Props {
  athleteId: string;
}

const CATEGORIES: WorkoutCategory[] = ['Musculation', 'Lactique', 'Aérobie', 'Escalier', 'Technique'];

export const WorkoutBuilder: React.FC<Props> = ({ athleteId }) => {
  const { 
    currentSessionName, 
    setSessionName, 
    category,
    setCategory,
    exercises, 
    initBuilder,
    resetBuilder 
  } = useWorkoutBuilderStore();
  
  const { user } = useAuthStore();
  const showFeedback = useSprintyStore(state => state.showFeedback);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initBuilder(athleteId);
    return () => resetBuilder();
  }, [athleteId]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await workoutService.assignWorkoutToAthlete({
        coach_id: user.id,
        athlete_id: athleteId,
        type_seance: category,
        exercises: exercises,
      });

      showFeedback('success', 'Séance assignée avec succès !');
      resetBuilder();
      router.replace('/(coach)');
    } catch (error: any) {
      showFeedback('error', `Erreur: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>BUILDER DE SÉANCE D'ÉLITE</Text>
        <Input
          placeholder="Nom de la séance..."
          value={currentSessionName}
          onChangeText={setSessionName}
          style={styles.sessionInput}
          containerStyle={styles.sessionInputContainer}
        />
        
        <View style={styles.catSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catBtn,
                  category === cat && styles.catBtnActive
                ]}
              >
                <Text style={[
                  styles.catBtnText,
                  category === cat && styles.catBtnTextActive
                ]}>{cat.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.map((ex) => (
          <ExerciseBuilderCard key={ex.id} exercise={ex} />
        ))}

        <Button
          title="+ AJOUTER DEPUIS LA BIBLIOTHÈQUE"
          variant="outline"
          onPress={() => setLibraryVisible(true)}
          style={styles.addExBtn}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="VALIDER ET ASSIGNER"
          variant="primary"
          onPress={handleSave}
          style={styles.saveBtn}
          loading={isSaving}
          disabled={exercises.length === 0 || isSaving}
        />
        <Button
          title="ANNULER"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <ExerciseLibraryModal 
        visible={libraryVisible} 
        onClose={() => setLibraryVisible(false)} 
      />
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
    marginBottom: theme.spacing.md,
  },
  sessionInput: {
    fontSize: 20,
    fontWeight: theme.typography.fontWeights.bold as any,
    color: theme.colors.text,
  },
  catSelector: {
    flexDirection: 'row',
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catBtnActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  catBtnText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  catBtnTextActive: {
    color: theme.colors.accent,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 150,
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
