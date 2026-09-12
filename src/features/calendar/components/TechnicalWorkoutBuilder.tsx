import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';

export interface TechnicalNoteItem {
  id: string;
  targetType: 'team' | 'subgroup' | 'athlete';
  targetId: string | null;
  targetName: string;
  title: string;
  content: string;
}

export interface TechnicalWorkoutBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

export const TechnicalWorkoutBuilder: React.FC<TechnicalWorkoutBuilderProps> = ({
  visible,
  date,
  onClose,
  onSave,
  initialWorkout,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers, fetchTeams, fetchTeamMembers, fetchSubgroups } = useCoachStore();

  const [notes, setNotes] = useState<TechnicalNoteItem[]>([
    {
      id: uuid.v4() as string,
      targetType: 'team',
      targetId: null,
      targetName: 'Tout le groupe',
      title: '',
      content: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved');
  }, [teamMembers]);

  const getMemberName = (m: any) => {
    const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
    return prof?.full_name?.trim() || prof?.email?.split('@')[0] || 'Athlète';
  };

  useEffect(() => {
    if (visible && teams.length > 0) {
      const activeTeamId = teams[0].id;
      if (teamMembers.length === 0) fetchTeamMembers(activeTeamId);
      if (subgroups.length === 0) fetchSubgroups(activeTeamId);
    }
  }, [visible, teams, teamMembers.length, subgroups.length]);

  useEffect(() => {
    if (visible) {
      if (initialWorkout) {
        if (
          initialWorkout.measures?.technical_notes &&
          Array.isArray(initialWorkout.measures.technical_notes) &&
          initialWorkout.measures.technical_notes.length > 0
        ) {
          setNotes(
            initialWorkout.measures.technical_notes.map((n: any) => ({
              id: n.id || (uuid.v4() as string),
              targetType: n.targetType || 'team',
              targetId: n.targetId || null,
              targetName: n.targetName || 'Tout le groupe',
              title: n.title || '',
              content: n.content || '',
            }))
          );
        } else {
          // Fallback if imported from legacy or single description
          const targetType: 'team' | 'subgroup' | 'athlete' = initialWorkout.subgroup_id
            ? 'subgroup'
            : initialWorkout.athlete_id && !initialWorkout.group_assignment_id
            ? 'athlete'
            : 'team';
          const targetId = initialWorkout.subgroup_id || initialWorkout.athlete_id || null;
          let targetName = 'Tout le groupe';
          if (targetType === 'subgroup') {
            const sg = subgroups.find((s) => s.id === targetId);
            targetName = sg?.name || 'Sous-groupe';
          } else if (targetType === 'athlete') {
            const mem = approvedMembers.find((m) => m.user_id === targetId);
            targetName = mem ? getMemberName(mem) : 'Athlète';
          }

          setNotes([
            {
              id: uuid.v4() as string,
              targetType,
              targetId,
              targetName,
              title: '',
              content: initialWorkout.description || '',
            },
          ]);
        }
      } else {
        setNotes([
          {
            id: uuid.v4() as string,
            targetType: 'team',
            targetId: null,
            targetName: 'Tout le groupe',
            title: '',
            content: '',
          },
        ]);
      }
    }
  }, [visible, initialWorkout, subgroups, approvedMembers]);

  const updateNote = (id: string, updates: Partial<TechnicalNoteItem>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const handleAddNoteItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const defaultTargetType: 'team' | 'subgroup' | 'athlete' =
      subgroups.length > 0 ? 'subgroup' : 'team';
    const defaultSubgroupId = subgroups.length > 0 ? subgroups[0].id : null;
    const defaultSubgroupName = subgroups.length > 0 ? subgroups[0].name : 'Sous-groupe';

    setNotes((prev) => [
      ...prev,
      {
        id: uuid.v4() as string,
        targetType: defaultTargetType,
        targetId: defaultTargetType === 'subgroup' ? defaultSubgroupId : null,
        targetName: defaultTargetType === 'subgroup' ? defaultSubgroupName : 'Tout le groupe',
        title: '',
        content: '',
      },
    ]);
  };

  const handleRemoveNoteItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSaveWorkout = async () => {
    if (!user?.id) return;

    const validNotes = notes.filter((n) => n.content.trim().length > 0);
    if (validNotes.length === 0) {
      Alert.alert('Consigne requise', 'Veuillez saisir au moins une consigne technique.');
      return;
    }

    for (let i = 0; i < validNotes.length; i++) {
      const n = validNotes[i];
      if (n.targetType === 'subgroup' && !n.targetId) {
        Alert.alert('Sous-groupe requis', `Veuillez sélectionner un sous-groupe pour la consigne #${i + 1}.`);
        return;
      }
      if (n.targetType === 'athlete' && !n.targetId) {
        Alert.alert('Athlète requis', `Veuillez sélectionner un athlète pour la consigne #${i + 1}.`);
        return;
      }
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;
      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0);
      const targetDateIso = targetDate.toISOString();

      if (initialWorkout?.id) {
        await workoutService.deleteWorkout(
          initialWorkout.id,
          initialWorkout.group_assignment_id || undefined
        );
      }

      if (approvedMembers.length === 0) {
        Alert.alert('Aucun athlète', "Aucun athlète validé n'a été trouvé dans votre équipe.");
        setIsSubmitting(false);
        return;
      }

      const sharedAssignmentId = uuid.v4() as string;
      let assignedCount = 0;

      for (const member of approvedMembers) {
        // Collect notes that apply to this athlete
        const memberNotes = validNotes.filter((n) => {
          if (n.targetType === 'team') return true;
          if (n.targetType === 'subgroup' && n.targetId === member.subgroup_id) return true;
          if (n.targetType === 'athlete' && n.targetId === member.user_id) return true;
          return false;
        });

        if (memberNotes.length > 0) {
          const athleteDescription = memberNotes
            .map((n) => {
              const label = n.title?.trim() ? n.title.trim() : n.targetName;
              return `[${label}]\n${n.content.trim()}`;
            })
            .join('\n\n');

          const athletePayload = {
            type_seance: 'Séance Technique',
            coach_id: user.id,
            team_id: activeTeamId,
            subgroup_id: member.subgroup_id || null,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: athleteDescription,
            status: 'pending',
            exercises: [],
            blocks: [],
            measures: {
              technical_notes: validNotes,
              athlete_notes: memberNotes,
            },
          };

          await workoutService.createPlannedWorkout(athletePayload);
          assignedCount++;
        }
      }

      if (assignedCount === 0) {
        Alert.alert(
          'Aucun athlète ciblé',
          "Aucun athlète de votre équipe ne correspond aux sous-groupes ou athlètes sélectionnés."
        );
        setIsSubmitting(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement séance technique:', err);
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer la séance technique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerTextBtn}>
              <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Séance Technique</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveWorkout}
              disabled={isSubmitting}
              style={[styles.headerSaveBtn, { backgroundColor: '#10B981' }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.headerSaveBtnText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Emerald Banner card */}
            <View style={[styles.bannerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="git-merge-outline" size={26} color="#047857" />
              </View>
              <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>Consignes & Ateliers Techniques</Text>
              <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                Rédigez des consignes pour l'ensemble du groupe, ou personnalisez les ateliers par sous-groupe ou par athlète au sein de la même séance.
              </Text>
            </View>

            {/* Note Cards List */}
            {notes.map((note, index) => (
              <View
                key={note.id}
                style={[
                  styles.noteCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                {/* Note Card Header */}
                <View style={styles.noteCardHeader}>
                  <View style={styles.noteNumberBadge}>
                    <View style={styles.emeraldDot} />
                    <Text style={[styles.noteNumberText, { color: theme.colors.text }]}>
                      ATELIER #{index + 1}
                    </Text>
                  </View>

                  {notes.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveNoteItem(note.id)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Target Segmented Row */}
                <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary }]}>DESTINATAIRE</Text>
                <View style={[styles.segmentedRow, { backgroundColor: theme.colors.background }]}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      note.targetType === 'team' && [styles.segmentBtnActive, { backgroundColor: '#10B981' }],
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateNote(note.id, {
                        targetType: 'team',
                        targetId: null,
                        targetName: 'Tout le groupe',
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: note.targetType === 'team' ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Tout le groupe
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      note.targetType === 'subgroup' && [styles.segmentBtnActive, { backgroundColor: '#10B981' }],
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      const firstSg = subgroups[0];
                      updateNote(note.id, {
                        targetType: 'subgroup',
                        targetId: firstSg ? firstSg.id : null,
                        targetName: firstSg ? firstSg.name : 'Sous-groupe',
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: note.targetType === 'subgroup' ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Sous-groupe
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      note.targetType === 'athlete' && [styles.segmentBtnActive, { backgroundColor: '#10B981' }],
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      const firstAth = approvedMembers[0];
                      updateNote(note.id, {
                        targetType: 'athlete',
                        targetId: firstAth ? firstAth.user_id : null,
                        targetName: firstAth ? getMemberName(firstAth) : 'Athlète',
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: note.targetType === 'athlete' ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Athlète
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Subgroup Selector Chips */}
                {note.targetType === 'subgroup' && (
                  <View style={styles.subScrollWrapper}>
                    {subgroups.length === 0 ? (
                      <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>
                        Aucun sous-groupe créé pour cette équipe.
                      </Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                        {subgroups.map((sg) => {
                          const isSelected = note.targetId === sg.id;
                          return (
                            <TouchableOpacity
                              key={sg.id}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: isSelected ? '#D1FAE5' : theme.colors.background,
                                  borderColor: isSelected ? '#10B981' : theme.colors.border,
                                },
                              ]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                updateNote(note.id, { targetId: sg.id, targetName: sg.name });
                              }}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: isSelected ? '#047857' : theme.colors.text, fontWeight: isSelected ? '700' : '500' },
                                ]}
                              >
                                {sg.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Athlete Selector Chips */}
                {note.targetType === 'athlete' && (
                  <View style={styles.subScrollWrapper}>
                    {approvedMembers.length === 0 ? (
                      <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>
                        Aucun athlète validé dans cette équipe.
                      </Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                        {approvedMembers.map((m) => {
                          const isSelected = note.targetId === m.user_id;
                          const name = getMemberName(m);
                          return (
                            <TouchableOpacity
                              key={m.user_id}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: isSelected ? '#D1FAE5' : theme.colors.background,
                                  borderColor: isSelected ? '#10B981' : theme.colors.border,
                                },
                              ]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                updateNote(note.id, { targetId: m.user_id, targetName: name });
                              }}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: isSelected ? '#047857' : theme.colors.text, fontWeight: isSelected ? '700' : '500' },
                                ]}
                              >
                                {name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Title / Theme Field (Optional) */}
                <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary, marginTop: 14 }]}>
                  THÈME / TITRE (OPTIONNEL)
                </Text>
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      color: theme.colors.text,
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Ex: Haies, Virage, Départ en starting-blocks..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={note.title}
                  onChangeText={(val) => updateNote(note.id, { title: val })}
                  maxLength={60}
                />

                {/* Instruction multiline text */}
                <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary, marginTop: 14 }]}>
                  CONSIGNE TECHNIQUE
                </Text>
                <TextInput
                  style={[
                    styles.contentInput,
                    {
                      color: theme.colors.text,
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Ex: Travailler la vitesse d'attaque sur les 3 premières haies, regard fixé vers l'avant, reprise d'appui active..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  value={note.content}
                  onChangeText={(val) => updateNote(note.id, { content: val })}
                  textAlignVertical="top"
                />
              </View>
            ))}

            {/* Add note button */}
            <TouchableOpacity
              style={[
                styles.addNoteBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleAddNoteItem}
              activeOpacity={0.7}
            >
              <View style={[styles.addNoteIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Feather name="plus" size={18} color="#047857" />
              </View>
              <Text style={[styles.addNoteBtnText, { color: theme.colors.text }]}>
                Ajouter une consigne pour un autre groupe / athlète
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTextBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  headerSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },

  bannerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  noteCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  noteNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emeraldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  noteNumberText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardInputCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subScrollWrapper: {
    marginTop: 10,
  },
  subScroll: {
    flexDirection: 'row',
  },
  emptyHintText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
  },

  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 96,
    lineHeight: 20,
  },

  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addNoteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addNoteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
});
