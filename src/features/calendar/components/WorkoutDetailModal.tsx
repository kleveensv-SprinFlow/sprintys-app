import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform, StatusBar, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { WorkoutBlock, Exercise } from '../../workout/types';
import { useAuthStore } from '../../../store/authStore';
import { workoutService } from '../../../services/workoutService';
import { supabase } from '../../../services/supabase';

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
  const { user } = useAuthStore();
  const isCoach = user?.role === 'coach';

  const [athleteResults, setAthleteResults] = React.useState<Record<string, string>>({});
  const [athleteNotes, setAthleteNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const submitAthleteWorkout = async () => {
    if (!user || !workout.id) return;
    setIsSubmitting(true);
    try {
      // Build efforts array from athleteResults
      const efforts = [];
      const blocks = workout.blocks || [{ id: 'main', exercises: workout.exercises || [] }];
      
      let setOrderGlobal = 0;
      for (const block of blocks) {
        for (const exercise of block.exercises) {
          for (let i = 0; i < exercise.sets.length; i++) {
            const key = `${exercise.id}_${i}`;
            const val = athleteResults[key];
            if (val) {
              efforts.push({
                workout_id: workout.id,
                exercise_catalog_id: exercise.catalog_id || null, // Assuming catalog_id exists
                exercise_category: workout.type_seance,
                actual_extra: { value: val },
                set_order: setOrderGlobal
              });
            }
            setOrderGlobal++;
          }
        }
      }

      await workoutService.submitWorkoutResults(workout.id, efforts);
      
      if (athleteNotes.trim()) {
        const updatedMeasures = { ...(workout.measures || {}), athlete_notes: athleteNotes.trim() };
        await supabase.from('workouts').update({ measures: updatedMeasures }).eq('id', workout.id);
      }
      
      await workoutService.completeWorkout(workout.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Bravo !', 'Ta séance a été validée avec succès.');
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de valider la séance.');
    } finally {
      setIsSubmitting(false);
    }
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
  const isRestDay = sessionTitle.toLowerCase().includes('repos');
  const isTechnical = sessionTitle.toLowerCase().includes('technique');
  const technicalNotes = workout.measures?.technical_notes;

  const surfaceMeta = workout.measures?.surface || 
    (workout.description?.includes('Côte') ? 'cote' : workout.description?.includes('Piste') ? 'piste' : null);
  const equipmentMeta = workout.measures?.equipment ||
    (workout.description?.includes('Pointes') ? 'pointes' : workout.description?.includes('Baskets') ? 'baskets' : null);

  const cleanDescription = workout.description
    ? (isTechnical ? workout.description.trim() : workout.description.replace(/^\[.*?\]\s*/, '').trim())
    : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}>
            <Feather name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Détails de la Séance</Text>
          {isCoach ? (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.closeButton, { backgroundColor: '#FEE2E2' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={18} color="#DC2626" />
            </TouchableOpacity>
          ) : <View style={styles.closeButtonPlaceholder} />}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card with Title and Actions */}
          <View style={[styles.titleContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.workoutName, { color: theme.colors.text }]}>{sessionTitle}</Text>
            
            {!isRestDay && (surfaceMeta || equipmentMeta) && (
              <View style={styles.metaRow}>
                {surfaceMeta && (
                  <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                    <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                      {surfaceMeta === 'cote' ? '⛰️ Côte' : '🏟️ Piste'}
                    </Text>
                  </View>
                )}
                {equipmentMeta && (
                  <View style={[styles.metaPill, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                    <Text style={[styles.metaPillText, { color: theme.colors.accent }]}>
                      {equipmentMeta === 'pointes' ? '👟 Pointes' : '👟 Baskets'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isCoach && (
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
            )}
          </View>

          {/* Consignes / Notes if provided (for non-technical sessions) */}
          {!isTechnical && cleanDescription ? (
            <View style={[styles.consignesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.consignesHeader}>
                <Feather name="file-text" size={14} color={theme.colors.accent} />
                <Text style={[styles.consignesCaption, { color: theme.colors.accent }]}>
                  {isRestDay ? 'NOTE DE RÉCUPÉRATION' : 'CONSIGNES DE SÉANCE'}
                </Text>
              </View>
              <Text style={[styles.consignesBody, { color: theme.colors.text }]}>{cleanDescription}</Text>
            </View>
          ) : null}

          {isRestDay ? (
            <View style={[styles.restDayCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.restDayIconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="cafe-outline" size={30} color="#475569" />
              </View>
              <Text style={[styles.restDayTitle, { color: theme.colors.text }]}>Jour de repos</Text>
              <Text style={[styles.restDaySubtitle, { color: theme.colors.textSecondary }]}>
                Aucun entraînement programmé. Priorité à la récupération et au repos.
              </Text>
            </View>
          ) : isTechnical ? (
            <View style={styles.technicalContainer}>
              <View style={styles.technicalSectionHeader}>
                <View style={[styles.technicalIconBox, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="git-merge-outline" size={16} color="#047857" />
                </View>
                <Text style={[styles.technicalSectionTitle, { color: theme.colors.text }]}>
                  CONSIGNES & ATELIERS TECHNIQUES
                </Text>
              </View>

              {Array.isArray(technicalNotes) && technicalNotes.length > 0 ? (
                technicalNotes.map((note: any, idx: number) => {
                  const isTeam = note.targetType === 'team';
                  const isSubgroup = note.targetType === 'subgroup';
                  const badgeBg = isTeam ? '#E0E7FF' : isSubgroup ? '#D1FAE5' : '#FEF3C7';
                  const badgeText = isTeam ? '#4338CA' : isSubgroup ? '#047857' : '#B45309';
                  const badgeIcon = isTeam ? 'people' : isSubgroup ? 'git-branch' : 'person';
                  const targetLabel = note.targetName || (isTeam ? 'Tout le groupe' : isSubgroup ? 'Sous-groupe' : 'Athlète');

                  return (
                    <View
                      key={note.id || idx}
                      style={[styles.technicalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.technicalCardTop}>
                        <View style={[styles.technicalBadge, { backgroundColor: badgeBg }]}>
                          <Ionicons name={badgeIcon as any} size={12} color={badgeText} />
                          <Text style={[styles.technicalBadgeText, { color: badgeText }]}>
                            {targetLabel}
                          </Text>
                        </View>
                        <Text style={[styles.technicalIndex, { color: theme.colors.textSecondary }]}>
                          Atelier #{idx + 1}
                        </Text>
                      </View>

                      {note.title ? (
                        <Text style={[styles.technicalNoteTitle, { color: theme.colors.text }]}>
                          {note.title}
                        </Text>
                      ) : null}

                      <Text style={[styles.technicalNoteContent, { color: theme.colors.text }]}>
                        {note.content}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.technicalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.technicalNoteContent, { color: theme.colors.text }]}>
                    {cleanDescription || 'Aucune consigne technique renseignée.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
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
                        if ((set as any).intensity) setDetails.push(`${(set as any).intensity}%`);
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

                        const isMuscu = sessionTitle.toLowerCase().includes('musculation');
                        const isCourse = sessionTitle.toLowerCase().includes('course') || sessionTitle.toLowerCase().includes('sprint');
                        const needsInput = !isCoach && (isMuscu || isCourse);
                        const inputPlaceholder = isMuscu ? "Poids (kg)" : "Chrono";
                        const resultKey = `${exercise.id}_${setIndex}`;

                        return (
                          <View key={set.id} style={[styles.setRow, needsInput && { flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.setNumber, { color: theme.colors.textMuted }]}>{setIndex + 1}</Text>
                              <Text style={[styles.setDetails, { color: theme.colors.text }]}>
                                {setDetails.join('  •  ')}
                              </Text>
                            </View>
                            {needsInput && (
                              <View style={{ marginTop: 8, marginLeft: 28, flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                                <Feather name="corner-down-right" size={14} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                                <TextInput
                                  style={{
                                    backgroundColor: theme.colors.background,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    flex: 1,
                                    color: theme.colors.text,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    fontSize: 14
                                  }}
                                  placeholder={inputPlaceholder}
                                  placeholderTextColor={theme.colors.textMuted}
                                  value={athleteResults[resultKey] || ''}
                                  onChangeText={(val) => setAthleteResults(prev => ({ ...prev, [resultKey]: val }))}
                                  keyboardType={isMuscu ? "decimal-pad" : "default"}
                                />
                              </View>
                            )}
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
        )}

        {!isCoach && (
          <View style={{ marginTop: 24, gap: 16 }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 8, color: theme.colors.text }}>Commentaires (Optionnel)</Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  fontSize: 15
                }}
                placeholder="Comment s'est passée la séance ?"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={athleteNotes}
                onChangeText={setAthleteNotes}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: workout.status === 'completed' ? theme.colors.success : theme.colors.accent,
                padding: 16,
                borderRadius: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onPress={submitAthleteWorkout}
              disabled={isSubmitting}
            >
              <Feather name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {isSubmitting ? 'Validation...' : (workout.status === 'completed' ? 'Mettre à jour' : 'Valider la séance')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
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
  restDayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  restDayIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  restDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  restDaySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
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
  technicalContainer: {
    gap: 14,
  },
  technicalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  technicalIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  technicalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  technicalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  technicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  technicalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  technicalIndex: {
    fontSize: 12,
    fontWeight: '600',
  },
  technicalNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  technicalNoteContent: {
    fontSize: 14,
    lineHeight: 21,
  },
});
