import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { WorkoutSession, WorkoutBlock, Exercise } from '../../workout/types';

interface WorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  workout: WorkoutSession | null;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({ visible, onClose, workout }) => {
  const theme = useTheme();

  if (!workout) return null;

  // Derive blocks if not provided natively
  const blocks: WorkoutBlock[] = workout.blocks || [
    {
      id: 'main',
      name: 'Entraînement Principal',
      exercises: workout.exercises || [],
    }
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Détails de la Séance</Text>
          <View style={styles.closeButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.titleContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.workoutName, { color: theme.colors.text }]}>{workout.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceLight }]}>
                <Feather name="clock" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                  {workout.startTime ? new Date(workout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'À définir'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceLight }]}>
                <Feather name="activity" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                  {workout.status === 'completed' ? 'Terminée' : workout.status === 'active' ? 'En cours' : 'Prévue'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.blocksContainer}>
            {blocks.map((block, index) => (
              <View key={block.id} style={styles.block}>
                <View style={styles.blockHeader}>
                  <View style={[styles.blockNumber, { backgroundColor: theme.colors.accent }]}>
                    <Text style={styles.blockNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.blockName, { color: theme.colors.text }]}>{block.name}</Text>
                </View>

                {block.exercises.map((exercise: Exercise) => (
                  <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
                    
                    {exercise.notes && (
                      <Text style={[styles.exerciseNotes, { color: theme.colors.textSecondary }]}>
                        {exercise.notes}
                      </Text>
                    )}

                    <View style={styles.setsContainer}>
                      {exercise.sets.map((set, setIndex) => {
                        // Only show fields that have values (Minimalist UX requested)
                        const setDetails = [];
                        if (set.reps) setDetails.push(`${set.reps} reps`);
                        if (set.distance) setDetails.push(`${set.distance}m`);
                        if (set.duration) setDetails.push(set.duration);
                        if (set.weight) setDetails.push(`${set.weight}kg`);
                        if (set.restSeconds) setDetails.push(`Réc: ${set.restSeconds}s`);

                        return (
                          <View key={set.id} style={styles.setRow}>
                            <Text style={[styles.setNumber, { color: theme.colors.textMuted }]}>{setIndex + 1}</Text>
                            <Text style={[styles.setDetails, { color: theme.colors.text }]}>
                              {setDetails.join('  •  ')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  titleContainer: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  blocksContainer: {
    gap: 32,
  },
  block: {
    gap: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  blockNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockName: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exerciseNotes: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumber: {
    width: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  setDetails: {
    fontSize: 15,
  },
});
