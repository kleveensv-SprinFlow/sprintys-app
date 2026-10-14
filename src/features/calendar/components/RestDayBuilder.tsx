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
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { TimeField, useSessionTime } from './TimeField';

export interface RestDayBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

type RestTarget = 'team' | 'subgroup' | 'athlete';

const TARGET_OPTIONS: { key: RestTarget; label: string }[] = [
  { key: 'team', label: 'Équipe entière' },
  { key: 'subgroup', label: 'Sous-groupe' },
  { key: 'athlete', label: 'Athlète' },
];

export const RestDayBuilder: React.FC<RestDayBuilderProps> = ({
  visible,
  date,
  onClose,
  onSave,
  initialWorkout,
}) => {
  const sessionTime = useSessionTime(visible, initialWorkout);
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  const { user } = useAuthStore();
  const { teams, subgroups, teamMembers, fetchTeamMembers, fetchSubgroups } = useCoachStore();

  // Target
  const [targetType, setTargetType] = useState<RestTarget>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Note
  const [restNote, setRestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved');
  }, [teamMembers]);

  useEffect(() => {
    if (visible && teams.length > 0) {
      const activeTeamId = teams[0].id;
      if (teamMembers.length === 0) fetchTeamMembers(activeTeamId);
      if (subgroups.length === 0) fetchSubgroups(activeTeamId);
    }
  }, [visible, teams, teamMembers.length, subgroups.length]);

  useEffect(() => {
    if (visible) {
      setFormError(null);
      if (initialWorkout) {
        setRestNote(initialWorkout.description || '');
        if (initialWorkout.subgroup_id) {
          setTargetType('subgroup');
          setSelectedSubgroupId(initialWorkout.subgroup_id);
        } else if (initialWorkout.athlete_id && !initialWorkout.group_assignment_id) {
          setTargetType('athlete');
          setSelectedAthleteId(initialWorkout.athlete_id);
        } else {
          setTargetType('team');
        }
      } else {
        setRestNote('');
        setTargetType('team');
        setSelectedSubgroupId(null);
        setSelectedAthleteId(null);
      }
    }
  }, [visible, initialWorkout]);

  const handleChangeTarget = (next: RestTarget) => {
    setFormError(null);
    setTargetType(next);
    if (next === 'subgroup' && subgroups.length > 0 && !selectedSubgroupId) setSelectedSubgroupId(subgroups[0].id);
    if (next === 'athlete' && approvedMembers.length > 0 && !selectedAthleteId) setSelectedAthleteId(approvedMembers[0].user_id);
  };

  const handleSaveRestDay = async () => {
    if (!user?.id) return;

    // Field-level validation, shown inline
    if (targetType === 'subgroup' && !selectedSubgroupId) {
      setFormError('Choisis un sous-groupe.');
      return;
    }
    if (targetType === 'athlete' && !selectedAthleteId) {
      setFormError('Choisis un athlète.');
      return;
    }
    const activeTeamId = teams.length > 0 ? teams[0].id : null;
    // Checked before anything is deleted: editing must never lose the existing rest day
    if (targetType === 'team' && !activeTeamId) {
      setFormError('Crée d’abord un groupe pour planifier un jour de repos.');
      return;
    }
    if (targetType === 'team' && approvedMembers.length === 0) {
      setFormError('Aucun athlète validé dans ton groupe pour l’instant.');
      return;
    }
    if (targetType === 'subgroup' && !approvedMembers.some((m) => m.subgroup_id === selectedSubgroupId)) {
      setFormError('Ce sous-groupe ne contient encore aucun athlète.');
      return;
    }
    setFormError(null);

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const targetDate = new Date(date);
      targetDate.setTime(sessionTime.applyTo(targetDate, 12).getTime());
      const targetDateIso = targetDate.toISOString();

      // Existing rows are updated in place (ids kept) and new ones inserted in one batch
      const payloads: any[] = [];

      const cleanNote = restNote.trim() || 'Jour de repos';

      if (targetType === 'team') {
        const sharedAssignmentId = uuid.v4() as string;
        let assignedCount = 0;

        for (const member of approvedMembers) {
          const athletePayload = {
            type_seance: 'Jour de repos',
            coach_id: user.id,
            team_id: activeTeamId,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: cleanNote,
            status: 'pending',
            exercises: [],
            blocks: [],
          };
          (athletePayload as any).measures = sessionTime.flag();
          payloads.push(athletePayload);
          assignedCount++;
        }
      } else if (targetType === 'subgroup') {
        const subMembers = approvedMembers.filter((m) => m.subgroup_id === selectedSubgroupId);

        const sharedAssignmentId = uuid.v4() as string;
        for (const member of subMembers) {
          const athletePayload = {
            type_seance: 'Jour de repos',
            coach_id: user.id,
            team_id: activeTeamId,
            subgroup_id: selectedSubgroupId,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: cleanNote,
            status: 'pending',
            exercises: [],
            blocks: [],
          };
          (athletePayload as any).measures = sessionTime.flag();
          payloads.push(athletePayload);
        }
      } else {
        const athletePayload = {
          type_seance: 'Jour de repos',
          coach_id: user.id,
          team_id: activeTeamId,
          athlete_id: selectedAthleteId!,
          date_prevue: targetDateIso,
          description: cleanNote,
          status: 'pending',
          exercises: [],
          blocks: [],
        };
        (athletePayload as any).measures = sessionTime.flag();
        payloads.push({ ...athletePayload, group_assignment_id: uuid.v4() as string });
      }

      if (payloads.length === 0) {
        setFormError('Aucun athlète validé ne correspond à ta sélection.');
        return;
      }
      await workoutService.smartUpdateWorkouts(initialWorkout?.group_assignment_id || undefined, payloads, initialWorkout?.id);

      toast('success', 'Jour de repos enregistré.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement jour de repos:', err);
      appAlert('Erreur', err?.message || 'Impossible d’enregistrer le jour de repos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChip = (key: string, label: string, isSelected: boolean, onPress: () => void) => (
    <PressableScale
      key={key}
      haptic="selection"
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => {
        setFormError(null);
        onPress();
      }}
      style={[styles.chip, isSelected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipText, { color: isSelected ? theme.colors.sprintyBlue : theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: safeTop }]}>
            <IconButton icon="x" accessibilityLabel="Fermer" onPress={onClose} />

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>Jour de repos</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>

            <PressableScale
              haptic="none"
              onPress={handleSaveRestDay}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.savePill}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.savePillText}>Enregistrer</Text>
              )}
            </PressableScale>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <TimeField time={sessionTime.time} onChange={sessionTime.setTime} />
            {/* Banner */}
            <View style={[glassCard, styles.bannerCard]}>
              <View style={styles.iconCircle}>
                <Feather name="coffee" size={24} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.bannerTitle}>Journée de récupération</Text>
              <Text style={styles.bannerSubtitle}>
                Programme un jour de repos pour tes athlètes, avec si besoin des consignes d’hydratation ou d’étirements.
              </Text>
            </View>

            {formError && (
              <View style={styles.errorNotice}>
                <Feather name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorNoticeText}>{formError}</Text>
              </View>
            )}

            {/* Target */}
            <Text style={styles.sectionCaption}>Cible</Text>
            <View style={glassCard}>
              <SegmentedControl options={TARGET_OPTIONS} value={targetType} onChange={handleChangeTarget} />

              {targetType === 'subgroup' && (
                subgroups.length === 0 ? (
                  <Text style={styles.emptyHint}>Aucun sous-groupe dans ton équipe.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subScrollContent}>
                    {subgroups.map((sg) =>
                      renderChip(sg.id, sg.name, selectedSubgroupId === sg.id, () => setSelectedSubgroupId(sg.id))
                    )}
                  </ScrollView>
                )
              )}

              {targetType === 'athlete' && (
                approvedMembers.length === 0 ? (
                  <Text style={styles.emptyHint}>Aucun athlète validé dans ton équipe.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subScrollContent}>
                    {approvedMembers.map((m) => {
                      const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                      const name = prof?.full_name?.trim() || 'Athlète';
                      return renderChip(m.user_id, name, selectedAthleteId === m.user_id, () => setSelectedAthleteId(m.user_id));
                    })}
                  </ScrollView>
                )
              )}
            </View>

            {/* Notes */}
            <Text style={styles.sectionCaption}>Consignes et recommandations</Text>
            <View style={[glassCard, styles.notesCard]}>
              <TextInput
                style={styles.notesInput}
                placeholder="Ex. : repos complet, bien s’hydrater (2 L d’eau), sommeil réparateur, étirements doux…"
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.sprintyBlue}
                multiline
                value={restNote}
                onChangeText={setRestNote}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: theme.colors.backdrop,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
    color: theme.colors.textSecondary,
  },
  savePill: {
    minHeight: 36,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sprintyBlue,
  },
  savePillText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 56,
  },
  bannerCard: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
    color: theme.colors.text,
  },
  bannerSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    color: theme.colors.textSecondary,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  subScroll: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  subScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: theme.colors.glassFill,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    borderColor: theme.colors.sprintyBlue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesCard: {
    padding: 0,
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 21,
    color: theme.colors.text,
  },
});
