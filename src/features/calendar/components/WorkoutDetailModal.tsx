import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { WorkoutBlock, Exercise } from '../../workout/types';

interface WorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onDelete?: (workout: any) => void;
  onEdit?: (workout: any) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  onClose,
  workout,
  onDelete,
  onEdit,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  if (!workout) return null;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Supprimer la séance',
      'Voulez-vous vraiment supprimer cette séance ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete?.(workout);
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.(workout);
  };

  // Derive blocks if not provided natively
  const blocks: WorkoutBlock[] = workout.blocks || [
    {
      id: 'main',
      name: 'Entraînement Principal',
      exercises: workout.exercises || [],
    }
  ];

  const sessionTitle = workout.type_seance || workout.name || 'Séance';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Détails de la Séance</Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.closeButton, { backgroundColor: '#FEE2E2' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card with Title and Actions */}
          <View style={[styles.titleContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.workoutName, { color: theme.colors.text }]}>{sessionTitle}</Text>
            
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={15} color={theme.colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Modifier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Consignes / Notes if provided */}
          {workout.description ? (
            <View style={[styles.consignesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.consignesHeader}>
                <Feather name="file-text" size={14} color={theme.colors.accent} />
                <Text style={[styles.consignesCaption, { color: theme.colors.accent }]}>CONSIGNES DE SÉANCE</Text>
              </View>
              <Text style={[styles.consignesBody, { color: theme.colors.text }]}>{workout.description}</Text>
            </View>
          ) : null}

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
                    
                    {(exercise as any).target && (exercise as any).target.type !== 'all' && (
                      <View style={styles.targetBadge}>
                        <Feather name="user" size={11} color={theme.colors.accent} />
                        <Text style={[styles.targetBadgeText, { color: theme.colors.accent }]}>
                          {(exercise as any).target.name || 'Cible spécifique'}
                        </Text>
                      </View>
                    )}

                    {exercise.notes && (
                      <Text style={[styles.exerciseNotes, { color: theme.colors.textSecondary }]}>
                        {exercise.notes}
                      </Text>
                    )}

                    <View style={styles.setsContainer}>
                      {exercise.sets.map((set, setIndex) => {
                        // Only show fields that have values (Minimalist UX requested)
                        const setDetails = [];
                        if (set.steps) {
                          setDetails.push(`${set.steps} marches`);
                        } else if (set.reps) {
                          setDetails.push(`${set.reps} reps`);
                        }
                        if (set.distance) setDetails.push(`${set.distance}m`);
                        if (set.duration) setDetails.push(set.duration);
                        if (set.weight !== undefined && set.weight !== null) {
                          const wType = (set as any).weight_type || (set as any).weightType;
                          if (wType === 'percent_1rm' || String(set.weight).includes('%')) {
                            setDetails.push(`${set.weight}% 1RM`);
                          } else {
                            setDetails.push(`${set.weight}kg`);
                          }
                        }
                        if (setDetails.length === 0) {
                          setDetails.push('Libre');
                        }
                        if (set.restSeconds) {
                          const r = set.restSeconds >= 60 ? `${Math.floor(set.restSeconds / 60)}m${set.restSeconds % 60 ? (set.restSeconds % 60) : ''}` : `${set.restSeconds}s`;
                          setDetails.push(`Réc: ${r}`);
                        }

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

                    {exercise.restBetweenExercises ? (
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>
                          Repos fin d'exercice : {exercise.restBetweenExercises >= 60 ? `${Math.floor(exercise.restBetweenExercises / 60)} min` : `${exercise.restBetweenExercises}s`}
                        </Text>
                      </View>
                    ) : null}
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
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  workoutName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  consignesCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  consignesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  consignesCaption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  consignesBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  targetBadgeText: {
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
