import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import * as Haptics from 'expo-haptics';
import uuid from 'react-native-uuid';
import { useAuthStore } from '../../../store/authStore';
import { useCoachStore } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { PressableScale } from '../../../shared/components/PressableScale';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';

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

type TargetType = TechnicalNoteItem['targetType'];
type NoteErrors = Record<string, { content?: string; target?: string }>;

const TARGET_OPTIONS: { key: TargetType; label: string }[] = [
  { key: 'team', label: 'Tout le groupe' },
  { key: 'subgroup', label: 'Sous-groupe' },
  { key: 'athlete', label: 'Athlète' },
];

export const TechnicalWorkoutBuilder: React.FC<TechnicalWorkoutBuilderProps> = ({
  visible,
  date,
  onClose,
  onSave,
  initialWorkout,
}) => {
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
  const [noteErrors, setNoteErrors] = useState<NoteErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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
      setNoteErrors({});
      setFormError(null);
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

          const noteId = uuid.v4() as string;
          setNotes([
            {
              id: noteId,
              targetType,
              targetId,
              targetName,
              title: '',
              content: initialWorkout.description || '',
            },
          ]);
          // A single row can't tell one athlete from the whole team: resolve from the sibling rows
          workoutService.resolveAssignmentTarget(initialWorkout, user?.id).then((t) => {
            const name =
              t.type === 'subgroup'
                ? subgroups.find((sg) => sg.id === t.id)?.name || 'Sous-groupe'
                : t.type === 'athlete'
                ? (() => {
                    const mem = approvedMembers.find((m) => m.user_id === t.id);
                    return mem ? getMemberName(mem) : 'Athlète';
                  })()
                : 'Tout le groupe';
            setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, targetType: t.type, targetId: t.id, targetName: name } : n)));
          });
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
    setFormError(null);
    setNoteErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleTargetTypeChange = (id: string, next: TargetType) => {
    if (next === 'team') {
      updateNote(id, { targetType: 'team', targetId: null, targetName: 'Tout le groupe' });
    } else if (next === 'subgroup') {
      const firstSg = subgroups[0];
      updateNote(id, {
        targetType: 'subgroup',
        targetId: firstSg ? firstSg.id : null,
        targetName: firstSg ? firstSg.name : 'Sous-groupe',
      });
    } else {
      const firstAth = approvedMembers[0];
      updateNote(id, {
        targetType: 'athlete',
        targetId: firstAth ? firstAth.user_id : null,
        targetName: firstAth ? getMemberName(firstAth) : 'Athlète',
      });
    }
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
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSaveWorkout = async () => {
    if (!user?.id) return;

    const validNotes = notes.filter((n) => n.content.trim().length > 0);
    if (validNotes.length === 0) {
      if (notes[0]) setNoteErrors({ [notes[0].id]: { content: 'Écris au moins une consigne technique.' } });
      else setFormError('Ajoute au moins une consigne technique.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const targetErrors: NoteErrors = {};
    for (const n of validNotes) {
      if (n.targetType === 'subgroup' && !n.targetId) targetErrors[n.id] = { target: 'Choisis un sous-groupe.' };
      if (n.targetType === 'athlete' && !n.targetId) targetErrors[n.id] = { target: 'Choisis un athlète.' };
    }
    if (Object.keys(targetErrors).length > 0) {
      setNoteErrors(targetErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;
      const targetDate = new Date(date);
      targetDate.setHours(12, 0, 0, 0);
      const targetDateIso = targetDate.toISOString();

      // We NO LONGER delete it here to preserve IDs and efforts!
      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
      const payloadsToUpdate: any[] = [];

      if (approvedMembers.length === 0) {
        setFormError('Aucun athlète validé dans ton équipe.');
        setIsSubmitting(false);
        return;
      }

      const sharedAssignmentId = uuid.v4() as string;

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

          payloadsToUpdate.push({
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
          });
        }
      }

      if (payloadsToUpdate.length === 0) {
        setFormError('Aucun athlète de ton équipe ne correspond aux sous-groupes ou athlètes choisis.');
        setIsSubmitting(false);
        return;
      }

      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('success', initialWorkout ? 'Séance technique mise à jour.' : 'Séance technique enregistrée.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement séance technique:', err);
      appAlert('Erreur', err?.message || 'Impossible d’enregistrer la séance technique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChip = (key: string, label: string, isSelected: boolean, onPress: () => void) => (
    <PressableScale
      key={key}
      haptic="selection"
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={[styles.chip, isSelected && styles.chipActive]}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Sheet header */}
          <View style={[styles.header, { paddingTop: safeTop }]}>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>Séance technique</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <PressableScale
              haptic="none"
              onPress={handleSaveWorkout}
              disabled={isSubmitting}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer"
              style={[styles.headerSaveBtn, isSubmitting && styles.headerSaveBtnBusy]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.headerSaveBtnText}>Enregistrer</Text>
              )}
            </PressableScale>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {formError && (
              <View style={[styles.errorNotice, styles.formErrorNotice]}>
                <Feather name="alert-circle" size={15} color={theme.colors.error} />
                <Text style={styles.errorNoticeText}>{formError}</Text>
              </View>
            )}

            {/* Intro */}
            <View style={[glassCard, styles.bannerCard]}>
              <View style={styles.iconCircle}>
                <Feather name="crosshair" size={24} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.bannerTitle}>Consignes et ateliers techniques</Text>
              <Text style={styles.bannerSubtitle}>
                Rédige des consignes pour tout le groupe, ou personnalise les ateliers par sous-groupe ou par athlète dans la même séance.
              </Text>
            </View>

            {/* Note cards */}
            {notes.map((note, index) => {
              const errors = noteErrors[note.id];
              return (
                <View key={note.id} style={[glassCard, styles.noteCard]}>
                  <View style={styles.noteCardHeader}>
                    <View style={styles.noteNumberBadge}>
                      <View style={styles.noteDot} />
                      <Text style={styles.noteNumberText}>Atelier {index + 1}</Text>
                    </View>

                    {notes.length > 1 && (
                      <IconButton
                        icon="trash-2"
                        tone="danger"
                        size={34}
                        onPress={() => handleRemoveNoteItem(note.id)}
                        accessibilityLabel={`Supprimer l’atelier ${index + 1}`}
                      />
                    )}
                  </View>

                  <Text style={styles.fieldCaption}>Destinataire</Text>
                  <SegmentedControl
                    options={TARGET_OPTIONS}
                    value={note.targetType}
                    onChange={(next) => handleTargetTypeChange(note.id, next)}
                  />

                  {note.targetType === 'subgroup' && (
                    <View style={styles.chipsWrapper}>
                      {subgroups.length === 0 ? (
                        <Text style={styles.emptyHintText}>Aucun sous-groupe créé pour cette équipe.</Text>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                          {subgroups.map((sg) =>
                            renderChip(sg.id, sg.name, note.targetId === sg.id, () =>
                              updateNote(note.id, { targetId: sg.id, targetName: sg.name })
                            )
                          )}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {note.targetType === 'athlete' && (
                    <View style={styles.chipsWrapper}>
                      {approvedMembers.length === 0 ? (
                        <Text style={styles.emptyHintText}>Aucun athlète validé dans cette équipe.</Text>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                          {approvedMembers.map((m) => {
                            const name = getMemberName(m);
                            return renderChip(m.user_id, name, note.targetId === m.user_id, () =>
                              updateNote(note.id, { targetId: m.user_id, targetName: name })
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {errors?.target && <Text style={styles.fieldError}>{errors.target}</Text>}

                  <Input
                    label="Thème ou titre (facultatif)"
                    placeholder="Ex. : haies, virage, départ en starting-blocks…"
                    value={note.title}
                    onChangeText={(val) => updateNote(note.id, { title: val })}
                    maxLength={60}
                    containerStyle={styles.titleInputContainer}
                  />

                  <Text style={styles.fieldCaption}>Consigne technique</Text>
                  <TextInput
                    style={[styles.contentInput, errors?.content && styles.contentInputError]}
                    placeholder="Ex. : travaille la vitesse d’attaque sur les 3 premières haies, regard vers l’avant, reprise d’appui active…"
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={theme.colors.sprintyBlue}
                    multiline
                    value={note.content}
                    onChangeText={(val) => updateNote(note.id, { content: val })}
                    textAlignVertical="top"
                  />
                  {errors?.content && <Text style={styles.fieldError}>{errors.content}</Text>}
                </View>
              );
            })}

            {/* Add note */}
            <PressableScale
              onPress={handleAddNoteItem}
              haptic="none"
              accessibilityRole="button"
              style={styles.addNoteBtn}
            >
              <View style={styles.addNoteIconCircle}>
                <Feather name="plus" size={18} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.addNoteBtnText}>Ajouter une consigne pour un autre groupe ou athlète</Text>
            </PressableScale>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },

  // Sheet header (shared pattern with CompetitionBuilder / HybridWorkoutBuilder)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
    backgroundColor: theme.colors.backdrop,
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.text },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  headerSaveBtn: {
    height: 38,
    minWidth: 108,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sprintyBlue,
  },
  headerSaveBtnBusy: { opacity: 0.7 },
  headerSaveBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  bannerCard: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    color: theme.colors.text,
  },
  bannerSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    color: theme.colors.textSecondary,
  },

  noteCard: { marginBottom: 16 },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    marginBottom: 12,
  },
  noteNumberBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.sprintyBlue },
  noteNumberText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.text,
  },

  fieldCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  fieldError: { fontSize: 12, fontWeight: '500', marginTop: 6, color: theme.colors.error },

  chipsWrapper: { marginTop: 12 },
  chipsRow: { gap: 8, paddingVertical: 2 },
  emptyHintText: { fontSize: 13, color: theme.colors.textSecondary, paddingVertical: 6 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
  },
  chipActive: { backgroundColor: 'rgba(0, 105, 232, 0.1)', borderColor: theme.colors.sprintyBlue },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.sprintyBlue, fontWeight: '700' },

  titleInputContainer: { marginTop: 16, marginBottom: 14 },
  contentInput: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 110,
    lineHeight: 21,
  },
  contentInputError: { borderColor: theme.colors.error },

  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  formErrorNotice: { marginBottom: 16 },
  errorNoticeText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.error },

  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    padding: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 105, 232, 0.3)',
    backgroundColor: 'rgba(0, 105, 232, 0.05)',
    marginTop: 4,
  },
  addNoteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
  },
  addNoteBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
});
