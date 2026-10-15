import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { useCoachStore, useCurrentTeam } from '../../../store/coach/coachStore';
import { useAuthStore } from '../../../store/authStore';
import { chatService } from '../../../services/chatService';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { toast } from '../../../shared/feedback/appAlert';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { Button } from '../../../shared/components/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const BroadcastModal = ({ visible, onClose }: Props) => {
  const theme = useTheme();
  const { teams, teamMembers, subgroups } = useCoachStore();
  const currentTeam = useCurrentTeam();
  const team = currentTeam;

  const [target, setTarget] = useState<'all' | 'subgroup'>('all');
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [subgroupError, setSubgroupError] = useState<string | null>(null);

  const handleSend = async () => {
    let valid = true;
    if (!message.trim()) {
      setMessageError('Écris ton message avant de l’envoyer.');
      valid = false;
    }
    if (target === 'subgroup' && !selectedSubgroup) {
      setSubgroupError('Choisis un sous-groupe.');
      valid = false;
    }
    if (!valid) return;
    const coachId = useAuthStore.getState().user?.id;
    if (!coachId || !team) {
      toast('error', 'Crée d’abord un groupe pour envoyer une annonce.');
      return;
    }
    setIsSending(true);
    const content = `Annonce · ${message.trim()}`;
    try {
      if (target === 'all') {
        // Everyone in the team sees it in the team discussion
        const convo = await chatService.getOrCreateTeamConversation(team.id);
        if (!convo) throw new Error('team conversation');
        await chatService.sendMessage(convo.id, coachId, content);
      } else {
        // The team discussion is shared, so a subgroup gets it as a private message per athlete
        const recipients = teamMembers.filter((m) => m.subgroup_id === selectedSubgroup);
        const results = await Promise.allSettled(
          recipients.map(async (m) => {
            const convo = await chatService.getOrCreateDirectConversation(coachId, m.user_id);
            if (!convo) throw new Error('direct conversation');
            await chatService.sendMessage(convo.id, coachId, content);
          }),
        );
        if (recipients.length && results.every((r) => r.status === 'rejected')) throw new Error('all failed');
      }
      setMessage('');
      toast('success', target === 'all' ? 'Publiée dans la discussion de l’équipe.' : 'Envoyée à chaque athlète du sous-groupe.', 'Annonce envoyée');
      onClose();
    } catch (err) {
      console.error('Broadcast failed:', err);
      toast('error', 'L’annonce n’est pas partie. Vérifie ta connexion et réessaie.', 'Oups');
    } finally {
      setIsSending(false);
    }
  };

  const recipientsHint =
    target === 'all'
      ? `Publiée dans la discussion de l’équipe (${teamMembers.length} athlète${teamMembers.length > 1 ? 's' : ''}).`
      : 'Envoyée en message privé à chaque athlète du sous-groupe.';

  const renderTarget = (key: 'all' | 'subgroup', label: string, icon: keyof typeof Feather.glyphMap) => {
    const on = target === key;
    return (
      <PressableScale
        haptic="selection"
        onPress={() => {
          setTarget(key);
          setSubgroupError(null);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        containerStyle={styles.targetContainer}
        style={[
          styles.targetBtn,
          on && { borderColor: theme.colors.sprintyBlue, backgroundColor: 'rgba(0, 105, 232, 0.08)' },
        ]}
      >
        <Feather name={icon} size={16} color={on ? theme.colors.sprintyBlue : theme.colors.textSecondary} />
        <Text style={[styles.targetText, { color: on ? theme.colors.sprintyBlue : theme.colors.textSecondary }, on && styles.targetTextOn]}>
          {label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <View style={[styles.content, { backgroundColor: theme.colors.backdrop }]}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                Faire une annonce
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[glassCard, styles.card]}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Destinataires</Text>
                <View style={styles.targetRow}>
                  {renderTarget('all', 'Toute l’équipe', 'users')}
                  {subgroups.length > 0 && renderTarget('subgroup', 'Sous-groupe', 'layers')}
                </View>

                {target === 'subgroup' && (
                  <View style={styles.subgroupSelector}>
                    {subgroups.map((sg) => {
                      const on = selectedSubgroup === sg.id;
                      return (
                        <PressableScale
                          key={sg.id}
                          haptic="selection"
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[
                            styles.sgOption,
                            { backgroundColor: on ? theme.colors.sprintyBlue : theme.colors.glassFill },
                          ]}
                          onPress={() => {
                            setSelectedSubgroup(sg.id);
                            setSubgroupError(null);
                          }}
                        >
                          <Text style={[styles.sgOptionText, { color: on ? '#FFFFFF' : theme.colors.text }]}>{sg.name}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}

                {subgroupError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>{subgroupError}</Text>
                ) : (
                  <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{recipientsHint}</Text>
                )}
              </View>

              <View style={[glassCard, styles.card]}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Message</Text>
                <TextInput
                  style={[
                    styles.inputArea,
                    {
                      color: theme.colors.text,
                      backgroundColor: isFocused ? theme.colors.surface : theme.colors.glassFill,
                      borderColor: messageError
                        ? theme.colors.error
                        : isFocused
                          ? theme.colors.sprintyBlue
                          : 'transparent',
                    },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  value={message}
                  onChangeText={(text) => {
                    setMessage(text);
                    if (messageError && text.trim()) setMessageError(null);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ex : L’entraînement est décalé à 18h30 à cause de la pluie."
                  placeholderTextColor={theme.colors.textMuted}
                  selectionColor={theme.colors.sprintyBlue}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Message de l’annonce"
                />
                <View style={styles.inputFooter}>
                  {messageError ? (
                    <Text style={[styles.errorText, styles.flex, { color: theme.colors.error }]}>{messageError}</Text>
                  ) : (
                    <View style={styles.flex} />
                  )}
                  <Text style={[styles.counter, { color: theme.colors.textMuted }]}>
                    {message.length} caractère{message.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <Button
                title="Publier l’annonce"
                onPress={handleSend}
                loading={isSending}
                disabled={isSending}
                style={styles.sendBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSpacer: {
    width: 38,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginHorizontal: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetContainer: {
    flex: 1,
  },
  targetBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  targetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  targetTextOn: {
    fontWeight: '700',
  },
  subgroupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  sgOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  sgOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginTop: 12,
  },
  inputArea: {
    borderWidth: 1.5,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
    paddingTop: 14,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 132,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  sendBtn: {
    marginTop: 4,
  },
});
