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

export interface CompetitionBuilderProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: () => void;
  initialWorkout?: any;
}

export const CompetitionBuilder: React.FC<CompetitionBuilderProps> = ({
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

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [targetType, setTargetType] = useState<'team' | 'subgroup' | 'athlete'>('team');
  const [targetId, setTargetId] = useState<string | null>(null);

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
        setTitle(initialWorkout.description?.split('\n')[0] || '');
        setLocation(initialWorkout.measures?.location || '');
        setAttachmentUrl(initialWorkout.measures?.attachmentUrl || '');

        const tType: 'team' | 'subgroup' | 'athlete' = initialWorkout.subgroup_id
          ? 'subgroup'
          : initialWorkout.athlete_id && !initialWorkout.group_assignment_id
          ? 'athlete'
          : 'team';
        
        setTargetType(tType);
        setTargetId(initialWorkout.subgroup_id || initialWorkout.athlete_id || null);
      } else {
        setTitle('');
        setLocation('');
        setAttachmentUrl('');
        setTargetType('team');
        setTargetId(null);
      }
    }
  }, [visible, initialWorkout]);

  const handleSaveWorkout = async () => {
    if (!user?.id) return;

    if (title.trim().length === 0) {
      Alert.alert('Titre requis', 'Veuillez saisir le nom de la compétition.');
      return;
    }

    if (targetType === 'subgroup' && !targetId) {
      Alert.alert('Sous-groupe requis', `Veuillez sélectionner un sous-groupe.`);
      return;
    }
    if (targetType === 'athlete' && !targetId) {
      Alert.alert('Athlète requis', `Veuillez sélectionner un athlète.`);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const activeTeamId = teams.length > 0 ? teams[0].id : null;
      const targetDate = new Date(date);
      targetDate.setHours(9, 0, 0, 0); // Default to morning for competitions
      const targetDateIso = targetDate.toISOString();

      const oldGroupAssignmentId = initialWorkout?.group_assignment_id || undefined;
      const payloadsToUpdate: any[] = [];

      if (approvedMembers.length === 0) {
        Alert.alert('Aucun athlète', "Aucun athlète validé n'a été trouvé dans votre équipe.");
        setIsSubmitting(false);
        return;
      }

      const sharedAssignmentId = uuid.v4() as string;
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
        Alert.alert(
          'Aucun athlète ciblé',
          "Aucun athlète de votre équipe ne correspond à la sélection."
        );
        setIsSubmitting(false);
        return;
      }

      await workoutService.smartUpdateWorkouts(oldGroupAssignmentId, payloadsToUpdate);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Erreur enregistrement compétition:', err);
      Alert.alert('Erreur', err?.message || "Impossible d'enregistrer la compétition.");
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
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Compétition</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveWorkout}
              disabled={isSubmitting}
              style={[styles.headerSaveBtn, { backgroundColor: '#F59E0B' }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.headerSaveBtnText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Banner card */}
            <View style={[styles.bannerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="award" size={26} color="#D97706" />
              </View>
              <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>Ajouter une compétition</Text>
              <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                Planifiez un événement sportif, précisez le lieu et attachez un lien d'information pour vos athlètes.
              </Text>
            </View>

            {/* Form Card */}
            <View style={[styles.noteCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              
              <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary }]}>
                NOM DE LA COMPÉTITION
              </Text>
              <TextInput
                style={[styles.titleInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border, marginBottom: 16 }]}
                placeholder="Ex: Championnat Régional, Meeting..."
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={60}
              />

              <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary }]}>
                EMPLACEMENT / ADRESSE (OPTIONNEL)
              </Text>
              <TextInput
                style={[styles.titleInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border, marginBottom: 16 }]}
                placeholder="Ex: Stade Omnisports, Paris"
                placeholderTextColor={theme.colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary }]}>
                PIÈCE JOINTE (LIEN URL)
              </Text>
              <TextInput
                style={[styles.titleInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border, marginBottom: 24 }]}
                placeholder="Ex: https://drive.google.com/..."
                placeholderTextColor={theme.colors.textMuted}
                value={attachmentUrl}
                onChangeText={setAttachmentUrl}
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* Target Segmented Row */}
              <Text style={[styles.cardInputCaption, { color: theme.colors.textSecondary }]}>PARTICIPANTS</Text>
              <View style={[styles.segmentedRow, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'team' && [styles.segmentBtnActive, { backgroundColor: '#F59E0B' }]]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('team');
                    setTargetId(null);
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'team' ? '#FFFFFF' : theme.colors.text }]}>
                    Toute l'équipe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'subgroup' && [styles.segmentBtnActive, { backgroundColor: '#F59E0B' }]]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('subgroup');
                    setTargetId(subgroups[0]?.id || null);
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'subgroup' ? '#FFFFFF' : theme.colors.text }]}>
                    Sous-groupe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, targetType === 'athlete' && [styles.segmentBtnActive, { backgroundColor: '#F59E0B' }]]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('athlete');
                    setTargetId(approvedMembers[0]?.user_id || null);
                  }}
                >
                  <Text style={[styles.segmentBtnText, { color: targetType === 'athlete' ? '#FFFFFF' : theme.colors.text }]}>
                    Athlète
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subgroup Selector Chips */}
              {targetType === 'subgroup' && (
                <View style={styles.subScrollWrapper}>
                  {subgroups.length === 0 ? (
                    <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>Aucun sous-groupe créé.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                      {subgroups.map((sg) => {
                        const isSelected = targetId === sg.id;
                        return (
                          <TouchableOpacity
                            key={sg.id}
                            style={[styles.chip, {
                              backgroundColor: isSelected ? '#FEF3C7' : theme.colors.background,
                              borderColor: isSelected ? '#F59E0B' : theme.colors.border,
                            }]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setTargetId(sg.id);
                            }}
                          >
                            <Text style={[styles.chipText, { color: isSelected ? '#B45309' : theme.colors.text, fontWeight: isSelected ? '700' : '500' }]}>
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
              {targetType === 'athlete' && (
                <View style={styles.subScrollWrapper}>
                  {approvedMembers.length === 0 ? (
                    <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>Aucun athlète validé.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll}>
                      {approvedMembers.map((m) => {
                        const isSelected = targetId === m.user_id;
                        const name = getMemberName(m);
                        return (
                          <TouchableOpacity
                            key={m.user_id}
                            style={[styles.chip, {
                              backgroundColor: isSelected ? '#FEF3C7' : theme.colors.background,
                              borderColor: isSelected ? '#F59E0B' : theme.colors.border,
                            }]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setTargetId(m.user_id);
                            }}
                          >
                            <Text style={[styles.chipText, { color: isSelected ? '#B45309' : theme.colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                              {name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTextBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  headerCancelText: { fontSize: 16, fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  headerSaveBtn: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSaveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  bannerCard: {
    borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  bannerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  bannerSubtitle: {
    fontSize: 13, marginTop: 6, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 10,
  },

  noteCard: {
    borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  cardInputCaption: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontWeight: '600',
  },

  segmentedRow: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  segmentBtnText: { fontSize: 13, fontWeight: '600' },
  subScrollWrapper: { marginTop: 10 },
  subScroll: { flexDirection: 'row' },
  emptyHintText: { fontSize: 12, fontStyle: 'italic', paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 13 },
});
