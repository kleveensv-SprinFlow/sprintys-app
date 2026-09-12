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

export interface RestDayBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

export const RestDayBuilder: React.FC<RestDayBuilderProps> = ({
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

  // Target
  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Note
  const [restNote, setRestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSaveRestDay = async () => {
    if (!user?.id) return;
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

      const cleanNote = restNote.trim() || 'Jour de repos';

      if (targetType === 'team') {
        if (!activeTeamId) {
          Alert.alert('Erreur', 'Aucune équipe trouvée.');
          setIsSubmitting(false);
          return;
        }

        if (approvedMembers.length === 0) {
          Alert.alert('Aucun athlète', "Aucun athlète validé n'a été trouvé dans votre équipe.");
          setIsSubmitting(false);
          return;
        }

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
          await workoutService.createPlannedWorkout(athletePayload);
          assignedCount++;
        }
      } else if (targetType === 'subgroup') {
        const subMembers = approvedMembers.filter((m) => m.subgroup_id === selectedSubgroupId);
        if (subMembers.length === 0) {
          Alert.alert('Sous-groupe vide', "Aucun athlète validé n'est présent dans ce sous-groupe.");
          setIsSubmitting(false);
          return;
        }

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
          await workoutService.createPlannedWorkout(athletePayload);
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
        await workoutService.createPlannedWorkout(athletePayload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement jour de repos:', err);
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer le jour de repos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerTextBtn}>
              <Text style={[styles.headerCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Jour de repos</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveRestDay}
              disabled={isSubmitting}
              style={[styles.headerSaveBtn, { backgroundColor: theme.colors.accent }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.headerSaveBtnText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Banner card */}
            <View style={[styles.bannerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="cafe-outline" size={28} color="#475569" />
              </View>
              <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>Journée de récupération</Text>
              <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                Programmez un jour de repos pour vos athlètes avec d'éventuelles consignes d'hydratation ou d'étirements.
              </Text>
            </View>

            {/* Target section */}
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CIBLE</Text>
            </View>

            <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'team' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('team');
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'team' ? '#FFFFFF' : theme.colors.text }]}>
                    Équipe entière
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'subgroup' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('subgroup');
                    if (subgroups.length > 0 && !selectedSubgroupId) setSelectedSubgroupId(subgroups[0].id);
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'subgroup' ? '#FFFFFF' : theme.colors.text }]}>
                    Sous-groupe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'athlete' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('athlete');
                    if (approvedMembers.length > 0 && !selectedAthleteId) setSelectedAthleteId(approvedMembers[0].user_id);
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'athlete' ? '#FFFFFF' : theme.colors.text }]}>
                    Athlète
                  </Text>
                </TouchableOpacity>
              </View>

              {targetType === 'subgroup' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                  {subgroups.map((sg) => {
                    const isSelected = selectedSubgroupId === sg.id;
                    return (
                      <TouchableOpacity
                        key={sg.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedSubgroupId(sg.id)}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                          {sg.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {targetType === 'athlete' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                  {approvedMembers.map((m) => {
                    const isSelected = selectedAthleteId === m.user_id;
                    const prof = (Array.isArray(m.profile) ? m.profile[0] : m.profile) as any;
                    const name = prof?.full_name?.trim() || 'Athlète';
                    return (
                      <TouchableOpacity
                        key={m.user_id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.background,
                            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedAthleteId(m.user_id)}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? theme.colors.accent : theme.colors.text }]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Consignes / Notes section */}
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionCaption, { color: theme.colors.textSecondary }]}>CONSIGNES & RECOMMANDATIONS</Text>
            </View>
            <View style={[styles.groupedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.notesInput, { color: theme.colors.text }]}
                placeholder="Ex: Repos complet, bien s'hydrater (2L d'eau), sommeil réparateur, étirements doux..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={restNote}
                onChangeText={setRestNote}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
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
    minWidth: 60,
  },
  headerCancelText: {
    fontSize: 16,
    fontWeight: '400',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  headerSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  sectionHeaderBetween: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  groupedCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subScroll: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 20,
  },
});
