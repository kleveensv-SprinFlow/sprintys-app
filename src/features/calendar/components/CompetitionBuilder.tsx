import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
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
import { useCoachStore, useCurrentTeam } from '../../../store/coach/coachStore';
import { workoutService } from '../../../services/workoutService';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { PressableScale } from '../../../shared/components/PressableScale';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { TimeField, useSessionTime } from './TimeField';

export interface CompetitionBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

type TargetType = 'team' | 'subgroup' | 'athlete';

const TARGET_OPTIONS: { key: TargetType; label: string }[] = [
  { key: 'team', label: 'Toute l’équipe' },
  { key: 'subgroup', label: 'Sous-groupe' },
  { key: 'athlete', label: 'Athlète' },
];

export const CompetitionBuilder: React.FC<CompetitionBuilderProps> = ({
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
  const { teams, subgroups, teamMembers, fetchTeams, fetchTeamMembers, fetchSubgroups } = useCoachStore();
  const currentTeam = useCurrentTeam();
  const ensureTeamLoaded = useCoachStore((st) => st.ensureTeamLoaded);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [targetType, setTargetType] = useState<TargetType>('team');
  const [targetId, setTargetId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);

  const approvedMembers = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'approved' && (!currentTeam || m.team_id === currentTeam.id));
  }, [teamMembers, currentTeam?.id]);

  const getMemberName = (m: any) => {
    const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
    return prof?.full_name?.trim() || prof?.email?.split('@')[0] || 'Athlète';
  };

  useEffect(() => {
    if (visible && teams.length > 0) {
      const activeTeamId = currentTeam!.id;
      ensureTeamLoaded(activeTeamId);
    }
  }, [visible, currentTeam?.id]);

  useEffect(() => {
    if (visible) {
      setTitleError(null);
      setTargetError(null);
      if (initialWorkout) {
        setTitle(initialWorkout.description?.split('\n')[0] || '');
        setLocation(initialWorkout.measures?.location || '');
        setAttachmentUrl(initialWorkout.measures?.attachmentUrl || '');

        // Resolved from the sibling rows: a single row can't tell one athlete from the whole team
        setTargetType('team');
        setTargetId(null);
        workoutService.resolveAssignmentTarget(initialWorkout, user?.id).then((t) => {
          setTargetType(t.type);
          setTargetId(t.id);
        });
      } else {
        setTitle('');
        setLocation('');
        setAttachmentUrl('');
        setTargetType('team');
        setTargetId(null);
      }
    }
  }, [visible, initialWorkout]);

  const handleTargetTypeChange = (next: TargetType) => {
    setTargetError(null);
    setTargetType(next);
    if (next === 'team') setTargetId(null);
    if (next === 'subgroup') setTargetId(subgroups[0]?.id || null);
    if (next === 'athlete') setTargetId(approvedMembers[0]?.user_id || null);
  };

  const handleSaveWorkout = async () => {
    if (!user?.id) return;

    let hasError = false;
    if (title.trim().length === 0) {
      setTitleError('Donne un nom à la compétition.');
      hasError = true;
    }
    if (targetType === 'subgroup' && !targetId) {
      setTargetError('Choisis un sous-groupe.');
      hasError = true;
    }
    if (targetType === 'athlete' && !targetId) {
      setTargetError('Choisis un athlète.');
      hasError = true;
    }
    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = currentTeam?.id ?? null;
      const targetDate = new Date(date);
      targetDate.setTime(sessionTime.applyTo(targetDate, 9).getTime());
      const targetDateIso = targetDate.toISOString();

      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
      const payloadsToUpdate: any[] = [];

      if (approvedMembers.length === 0) {
        setTargetError('Aucun athlète validé dans ton équipe.');
        setIsSubmitting(false);
        return;
      }

      const sharedAssignmentId = uuid.v4() as string;
      // Stored format read by the athlete screens: "<title>\n📍 <location>"
      const formattedDescription = `${title.trim()}\n${location ? `📍 ${location}` : ''}`;

      for (const member of approvedMembers) {
        let isTargeted = false;
        if (targetType === 'team') isTargeted = true;
        if (targetType === 'subgroup' && targetId === member.subgroup_id) isTargeted = true;
        if (targetType === 'athlete' && targetId === member.user_id) isTargeted = true;

        if (isTargeted) {
          payloadsToUpdate.push({
            type_seance: 'Compétition',
            coach_id: user.id,
            team_id: activeTeamId,
            subgroup_id: member.subgroup_id || null,
            athlete_id: member.user_id,
            group_assignment_id: sharedAssignmentId,
            date_prevue: targetDateIso,
            description: formattedDescription,
            status: 'pending',
            exercises: [],
            blocks: [],
            measures: {
              location,
              attachmentUrl,
            },
          });
        }
      }

      if (payloadsToUpdate.length === 0) {
        setTargetError('Aucun athlète de ton équipe ne correspond à cette sélection.');
        setIsSubmitting(false);
        return;
      }

      payloadsToUpdate.forEach((p: any) => {
        p.measures = { ...(p.measures || {}), ...sessionTime.flag() };
      });
      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate, initialWorkout?.id);

      toast('success', initialWorkout ? 'Compétition mise à jour.' : 'Compétition ajoutée au calendrier.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement compétition:', err);
      appAlert('Erreur', err?.message || 'Impossible d’enregistrer la compétition.');
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
              <Text style={styles.headerTitle} numberOfLines={1}>Compétition</Text>
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
            <TimeField time={sessionTime.time} onChange={sessionTime.setTime} />
            {/* Intro */}
            <View style={[glassCard, styles.bannerCard]}>
              <View style={styles.iconCircle}>
                <Feather name="award" size={24} color={theme.colors.warning} />
              </View>
              <Text style={styles.bannerTitle}>
                {initialWorkout ? 'Modifier la compétition' : 'Ajouter une compétition'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                Planifie un événement, précise le lieu et ajoute un lien d’information pour tes athlètes.
              </Text>
            </View>

            {/* Details */}
            <Text style={styles.sectionLabel}>Informations</Text>
            <View style={[glassCard, styles.card]}>
              <Input
                label="Nom de la compétition"
                placeholder="Ex. : Championnat régional, meeting…"
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  if (titleError) setTitleError(null);
                }}
                maxLength={60}
                error={titleError || undefined}
              />
              <Input
                label="Lieu (facultatif)"
                placeholder="Ex. : Stade omnisports, Paris"
                value={location}
                onChangeText={setLocation}
                leftIcon={<Feather name="map-pin" size={17} color={theme.colors.textSecondary} />}
              />
              <Input
                label="Pièce jointe, lien (facultatif)"
                placeholder="https://drive.google.com/…"
                value={attachmentUrl}
                onChangeText={setAttachmentUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Feather name="link" size={17} color={theme.colors.textSecondary} />}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Participants */}
            <Text style={styles.sectionLabel}>Participants</Text>
            <View style={[glassCard, styles.card]}>
              <SegmentedControl options={TARGET_OPTIONS} value={targetType} onChange={handleTargetTypeChange} />

              {targetType === 'subgroup' && (
                <View style={styles.chipsWrapper}>
                  {subgroups.length === 0 ? (
                    <Text style={styles.emptyHintText}>Aucun sous-groupe créé pour l’instant.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {subgroups.map((sg) =>
                        renderChip(sg.id, sg.name, targetId === sg.id, () => {
                          setTargetError(null);
                          setTargetId(sg.id);
                        })
                      )}
                    </ScrollView>
                  )}
                </View>
              )}

              {targetType === 'athlete' && (
                <View style={styles.chipsWrapper}>
                  {approvedMembers.length === 0 ? (
                    <Text style={styles.emptyHintText}>Aucun athlète validé pour l’instant.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {approvedMembers.map((m) =>
                        renderChip(m.user_id, getMemberName(m), targetId === m.user_id, () => {
                          setTargetError(null);
                          setTargetId(m.user_id);
                        })
                      )}
                    </ScrollView>
                  )}
                </View>
              )}

              {targetError && (
                <View style={styles.errorNotice}>
                  <Feather name="alert-circle" size={15} color={theme.colors.error} />
                  <Text style={styles.errorNoticeText}>{targetError}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backdrop },

  // Sheet header (shared pattern with TechnicalWorkoutBuilder)
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline,
    backgroundColor: theme.colors.backdrop,
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: theme.colors.text },
  headerSubtitle: { fontSize: 13, marginTop: 1, fontWeight: '500', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  headerSaveBtn: {
    height: 38, minWidth: 108, paddingHorizontal: 16, borderRadius: 19, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.sprintyBlue,
  },
  headerSaveBtnBusy: { opacity: 0.7 },
  headerSaveBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  bannerCard: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center', color: theme.colors.text },
  bannerSubtitle: {
    fontSize: 13, marginTop: 6, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 10, color: theme.colors.textSecondary,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
    color: theme.colors.textSecondary, marginBottom: 8, marginLeft: 4,
  },
  card: { marginBottom: 24 },

  chipsWrapper: { marginTop: 12 },
  chipsRow: { gap: 8, paddingVertical: 2 },
  emptyHintText: { fontSize: 13, color: theme.colors.textSecondary, paddingVertical: 6 },
  chip: {
    height: 36, paddingHorizontal: 14, borderRadius: 12, borderCurve: 'continuous',
    justifyContent: 'center', borderWidth: 1, borderColor: 'transparent',
    backgroundColor: theme.colors.glassFill,
  },
  chipActive: { backgroundColor: 'rgba(0, 105, 232, 0.1)', borderColor: theme.colors.sprintyBlue },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.sprintyBlue, fontWeight: '700' },

  errorNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorNoticeText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.error },
});
