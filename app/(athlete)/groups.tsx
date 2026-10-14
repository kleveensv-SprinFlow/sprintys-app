import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/core/theme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { chatService, GroupDiscussionsSummary } from '../../src/services/chatService';
import { useRouter } from 'expo-router';
import { glassCard, glassRim } from '../../src/core/glass';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { Header } from '../../src/shared/components/Header';
import { Input } from '../../src/shared/components/Input';
import { Button } from '../../src/shared/components/Button';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { SkeletonCard } from '../../src/shared/components/Skeleton';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { CoachSharingSheet } from '../../src/features/legal/CoachSharingSheet';
import { useConsentStore } from '../../src/store/consentStore';

import { appAlert, toast, confirmAsync } from '../../src/shared/feedback/appAlert';
import { getActivePlan, removePlan } from '../../src/features/sprinty/proposalWriter';

import { useRefresh } from '../../src/shared/hooks/useRefresh';

interface MyGroupData {
  team_id: string;
  coach_id: string;
  status: 'pending' | 'approved';
  team_name: string;
  coach_name: string;
  subgroup_name: string | null;
}

const CODE_LENGTH = 8;

const formatMessageTime = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  } else if (diffDays === 1) {
    return 'Hier';
  } else if (diffDays < 7) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export default function GroupsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [myGroup, setMyGroup] = useState<MyGroupData | null>(null);
  const [discussions, setDiscussions] = useState<GroupDiscussionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [previewTeamName, setPreviewTeamName] = useState<string | null>(null);
  /** Code check in flight: neutral state, never shown as an error. */
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  /** Only true once the check has actually failed for the current code. */
  const [codeNotFound, setCodeNotFound] = useState(false);

  useEffect(() => {
    setPreviewTeamName(null);
    setCodeNotFound(false);
    if (inviteCode.length !== CODE_LENGTH) {
      setIsCheckingCode(false);
      return;
    }

    // Ignore the answer if the code changed (or the screen closed) meanwhile
    let cancelled = false;
    setIsCheckingCode(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc('preview_team_by_code', { p_invite_code: inviteCode });
        if (cancelled) return;
        if (data && !error) {
          setPreviewTeamName(data);
        } else {
          setCodeNotFound(true);
        }
      } catch (e) {
        if (!cancelled) setCodeNotFound(true);
      } finally {
        if (!cancelled) setIsCheckingCode(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  const refreshControl = useRefresh(() => fetchMyGroup());
  useFocusEffect(
    useCallback(() => {
      fetchMyGroup();
    }, [user?.id])
  );

  const loadDiscussions = async (teamId: string, coachId: string) => {
    try {
      const res = await chatService.getAthleteGroupDiscussions(teamId, coachId);
      setDiscussions(res);
    } catch (e) {
      console.error('Error loading discussions:', e);
    }
  };

  // Live last message / unread count on the two discussion cards
  useEffect(() => {
    if (!myGroup || myGroup.status !== 'approved') return;

    const channel = supabase
      .channel(`athlete_group_discussions_${myGroup.team_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (myGroup.team_id && myGroup.coach_id) {
          loadDiscussions(myGroup.team_id, myGroup.coach_id);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [myGroup?.team_id, myGroup?.coach_id, myGroup?.status]);

  const fetchMyGroup = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Chercher si l'athlète est déjà dans un groupe
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          status,
          teams ( name, coach_id ),
          subgroups ( name )
        `)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.teams) {
        const coachId = (data.teams as any).coach_id;
        // Récupérer le nom du coach
        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', coachId)
          .single();

        setMyGroup({
          team_id: data.team_id,
          coach_id: coachId,
          status: data.status as 'pending' | 'approved',
          team_name: (data.teams as any).name,
          coach_name: coachProfile?.full_name || 'Coach',
          subgroup_name: data.subgroups ? (data.subgroups as any).name : null,
        });

        if (data.status === 'approved' && coachId) {
          loadDiscussions(data.team_id, coachId);
        }
      } else {
        setMyGroup(null);
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      setMyGroup(null);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  const [sharingSheet, setSharingSheet] = useState(false);

  /** The coach will see health data: ask first, then send the request. */
  const requestJoin = () => {
    if (useConsentStore.getState().has('coach_sharing')) handleJoinGroup();
    else setSharingSheet(true);
  };

  const handleJoinGroup = async () => {
    const code = inviteCode.trim();
    if (!code || !user?.id) return;
    setIsJoining(true);

    try {
      // Rejoindre via RPC sécurisée
      const { data, error: rpcError } = await supabase.rpc('join_team_by_code', { p_invite_code: code });

      if (rpcError || !data) {
        appAlert('Erreur', rpcError?.message || 'Code invalide ou erreur serveur.');
        setIsJoining(false);
        return;
      }

      toast(
        'success',
        `Ta demande pour rejoindre « ${data.team_name} » est partie. Tu seras prévenu dès que ton coach l’aura acceptée.`,
        'Demande envoyée'
      );
      setInviteCode('');
      fetchMyGroup();

      // A coach will plan the sessions: avoid two programs in parallel
      const plan = await getActivePlan().catch(() => null);
      if (plan) {
        const remove = await confirmAsync({
          title: 'Et ton plan Sprinty ?',
          message: `Une fois accepté, ton coach programmera tes séances. Tu peux retirer dès maintenant les séances à venir de « ${plan.title} », ou les garder en attendant.`,
          confirmText: 'Retirer le plan',
          cancelText: 'Garder pour l’instant',
          destructive: true,
        });
        if (remove) {
          await removePlan(plan.id).then(
            () => toast('success', 'Les séances à venir de ton plan ont été retirées.', 'Plan retiré'),
            () => toast('error', 'Le retrait n’a pas abouti. Tu peux le faire depuis ton profil.', 'Oups')
          );
        }
      }
    } catch (err: any) {
      appAlert('Erreur', 'Impossible d’envoyer la demande. Réessaie plus tard.');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  /** Same delete for both cases: cancelling a pending request, or leaving the group. */
  const handleLeaveGroup = async () => {
    if (!myGroup || !user?.id) return;
    const isPending = myGroup.status === 'pending';

    const ok = await confirmAsync(
      isPending
        ? {
            title: 'Annuler ta demande ?',
            message: `Ta demande pour rejoindre « ${myGroup.team_name} » sera retirée. Tu pourras en renvoyer une avec un code d’invitation.`,
            confirmText: 'Annuler ma demande',
            cancelText: 'Garder',
            destructive: true,
            icon: 'x-circle',
          }
        : {
            title: `Quitter « ${myGroup.team_name} » ?`,
            message:
              'Ton coach ne verra plus tes données (séances, records, suivi) et tu ne recevras plus ses nouvelles planifications. Ton historique reste dans ton compte.',
            confirmText: 'Quitter le groupe',
            destructive: true,
            icon: 'log-out',
          }
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ team_id: myGroup.team_id, user_id: user.id });

      if (error) throw error;
      setMyGroup(null);
      setDiscussions(null);
      toast('success', isPending ? 'Ta demande a été annulée.' : 'Tu as quitté le groupe.');
    } catch (err: any) {
      toast('error', isPending ? 'Impossible d’annuler la demande.' : 'Impossible de quitter le groupe.');
      console.error(err);
    }
  };

  const openCoachChat = () => {
    if (myGroup?.coach_id) {
      router.push({
        pathname: '/chat/[type]/[id]',
        params: { type: 'direct', id: myGroup.coach_id, title: `Coach ${myGroup.coach_name}` },
      });
    } else {
      appAlert('Information', 'Identifiant du coach indisponible.');
    }
  };

  const openTeamChat = () => {
    if (myGroup?.team_id) {
      router.push({
        pathname: '/chat/[type]/[id]',
        params: { type: 'team', id: myGroup.team_id, title: myGroup.team_name },
      });
    } else {
      appAlert('Information', 'Identifiant de l’équipe indisponible.');
    }
  };

  const renderDiscussionCard = ({
    icon,
    tint,
    color,
    title,
    fallback,
    preview,
    time,
    unread,
    onPress,
  }: {
    icon: React.ComponentProps<typeof Feather>['name'];
    tint: string;
    color: string;
    title: string;
    fallback: string;
    preview: string | null;
    time: string;
    unread: number;
    onPress: () => void;
  }) => (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={[glassCard, styles.discussionCard]}>
      <GlassSheen radius={22} />
      <View style={[styles.discussionIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.discussionContent}>
        <View style={styles.discussionTopRow}>
          <Text style={styles.discussionTitle} numberOfLines={1}>
            {title}
          </Text>
          {!!time && <Text style={styles.discussionTime}>{time}</Text>}
        </View>
        <View style={styles.discussionBottomRow}>
          <Text style={[styles.discussionPreview, !preview && styles.discussionPreviewMuted]} numberOfLines={1}>
            {preview || fallback}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
    </PressableScale>
  );

  const codeComplete = inviteCode.length === CODE_LENGTH;
  const codeStatusIcon = !codeComplete ? null : isCheckingCode ? (
    <ActivityIndicator size="small" color={theme.colors.sprintyBlue} />
  ) : previewTeamName ? (
    <Feather name="check-circle" size={20} color={theme.colors.success} />
  ) : codeNotFound ? (
    <Feather name="alert-circle" size={20} color={theme.colors.error} />
  ) : null;

  const coachLast = discussions?.coach?.last_message ?? null;
  const teamLast = discussions?.team?.last_message ?? null;

  return (
    <GlassScreen scrollY={scrollY}>
      <Header title="Mon groupe" showBackButton onBackPress={() => router.back()} scrollY={scrollY} />

      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !hasLoaded && (
          <>
            <SkeletonCard lines={3} avatar />
            <SkeletonCard lines={2} />
          </>
        )}

        {/* === ÉTAT 1 : Pas de groupe => Rejoindre === */}
        {hasLoaded && !myGroup && (
          <>
            <View style={[glassCard, styles.heroCard]}>
              <GlassSheen radius={22} />
              <View style={[styles.heroIcon, { backgroundColor: 'rgba(0, 105, 232, 0.1)' }]}>
                <Feather name="users" size={28} color={theme.colors.sprintyBlue} />
              </View>
              <Text style={styles.cardTitle}>Rejoindre un coach</Text>
              <Text style={styles.cardDesc}>
                Entre le code d’invitation à 8 chiffres que ton coach t’a donné pour envoyer ta demande.
              </Text>

              <Input
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                placeholder="00000000"
                keyboardType="number-pad"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={CODE_LENGTH}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (previewTeamName && !isJoining) requestJoin();
                }}
                accessibilityLabel="Code d’invitation"
                style={styles.codeInput}
                containerStyle={styles.codeInputContainer}
                leftIcon={<Feather name="hash" size={18} color={theme.colors.textMuted} />}
                rightIcon={codeStatusIcon ?? <View style={styles.iconSpacer} />}
                error={codeComplete && codeNotFound ? 'Code invalide ou introuvable. Vérifie-le avec ton coach.' : undefined}
              />

              {codeComplete && isCheckingCode && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusChecking}>Vérification…</Text>
                </View>
              )}
              {codeComplete && !isCheckingCode && previewTeamName && (
                <View style={styles.previewPill}>
                  <Feather name="check" size={16} color={theme.colors.success} />
                  <Text style={styles.previewText} numberOfLines={2}>
                    Groupe trouvé : <Text style={styles.previewTeamName}>{previewTeamName}</Text>
                  </Text>
                </View>
              )}

              <Button
                title="Envoyer la demande"
                onPress={requestJoin}
                loading={isJoining}
                disabled={!codeComplete || isJoining || !previewTeamName}
                style={styles.joinBtn}
              />
            </View>

            <View style={styles.hintRow}>
              <Feather name="shield" size={16} color={theme.colors.textMuted} />
              <Text style={styles.hintText}>
                Tu n’es dans aucun groupe pour l’instant. Demande le code d’invitation à ton coach.
              </Text>
            </View>
          </>
        )}

        {/* === ÉTAT 2 : Demande en attente === */}
        {myGroup && myGroup.status === 'pending' && (
          <View style={[glassCard, styles.heroCard, styles.pendingCard]}>
            <GlassSheen radius={22} />
            <View style={[styles.heroIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Feather name="clock" size={28} color={theme.colors.warning} />
            </View>
            <Text style={styles.cardTitle}>Demande en attente</Text>
            <Text style={styles.cardDesc}>
              Ta demande pour rejoindre « {myGroup.team_name} » a bien été envoyée. Ton coach doit l’accepter pour que tu
              accèdes à sa planification.
            </Text>
            <View style={styles.coachChip}>
              <Feather name="user" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.coachChipText} numberOfLines={1}>
                Coach : {myGroup.coach_name}
              </Text>
            </View>
            <PressableScale onPress={handleLeaveGroup} haptic="light" hitSlop={8} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Annuler ma demande</Text>
            </PressableScale>
          </View>
        )}

        {/* === ÉTAT 3 : Membre approuvé => Tableau de bord du groupe === */}
        {myGroup && myGroup.status === 'approved' && (
          <>
            <View style={[glassCard, styles.groupCard]}>
              <GlassSheen radius={22} />
              <View style={styles.groupHeader}>
                <View style={[styles.groupIcon, { backgroundColor: 'rgba(0, 105, 232, 0.1)' }]}>
                  <Feather name="shield" size={24} color={theme.colors.sprintyBlue} />
                </View>
                <View style={styles.groupTextContainer}>
                  <Text style={styles.groupName} numberOfLines={2}>
                    {myGroup.team_name}
                  </Text>
                  <Text style={styles.groupCoach} numberOfLines={1}>
                    Coach : {myGroup.coach_name}
                  </Text>
                </View>
              </View>
              {myGroup.subgroup_name && (
                <View style={styles.subgroupBadge}>
                  <Feather name="tag" size={13} color={theme.colors.sprintyBlue} />
                  <Text style={styles.subgroupText}>{myGroup.subgroup_name}</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionLabel}>Discussions</Text>

            {renderDiscussionCard({
              icon: 'message-circle',
              tint: 'rgba(0, 105, 232, 0.1)',
              color: theme.colors.sprintyBlue,
              title: `Coach ${myGroup.coach_name}`,
              fallback: 'Envoie un message privé à ton coach',
              preview: coachLast ? `${coachLast.is_me ? 'Toi : ' : ''}${coachLast.content}` : null,
              time: formatMessageTime(coachLast?.created_at),
              unread: discussions?.coach?.unread_count ?? 0,
              onPress: openCoachChat,
            })}

            {renderDiscussionCard({
              icon: 'users',
              tint: 'rgba(16, 185, 129, 0.12)',
              color: theme.colors.success,
              title: myGroup.team_name,
              fallback: 'Discute avec tout le groupe',
              preview: teamLast ? `${teamLast.sender_name} : ${teamLast.content}` : null,
              time: formatMessageTime(teamLast?.created_at),
              unread: discussions?.team?.unread_count ?? 0,
              onPress: openTeamChat,
            })}

            <PressableScale onPress={handleLeaveGroup} haptic="light" style={styles.leaveBtn}>
              <Feather name="log-out" size={18} color={theme.colors.error} />
              <Text style={styles.leaveBtnText}>Quitter le groupe</Text>
            </PressableScale>
          </>
        )}
      </Animated.ScrollView>

      <CoachSharingSheet
        visible={sharingSheet}
        teamName={previewTeamName}
        onClose={() => setSharingSheet(false)}
        onConfirm={async () => {
          if (await useConsentStore.getState().grant(['coach_sharing'])) {
            setSharingSheet(false);
            await handleJoinGroup();
          }
        }}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Hero cards (join / pending)
  heroCard: { padding: 24, alignItems: 'center', marginBottom: 16 },
  heroIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text, marginBottom: 6, textAlign: 'center' },
  cardDesc: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 21 },

  // Code input
  codeInputContainer: { marginBottom: 12 },
  codeInput: {
    flex: 1, minWidth: 0, height: '100%',
    color: theme.colors.text, fontSize: 24, fontWeight: '700', letterSpacing: 6,
    textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  iconSpacer: { width: 20 },
  statusRow: { width: '100%', alignItems: 'center', marginBottom: 12 },
  statusChecking: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  previewPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderCurve: 'continuous', marginBottom: 12,
  },
  previewText: { flex: 1, color: theme.colors.text, fontSize: 14 },
  previewTeamName: { fontWeight: '700' },
  joinBtn: { width: '100%', marginTop: 4 },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  hintText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },

  // Pending
  pendingCard: { borderColor: 'rgba(245, 158, 11, 0.35)', ...glassRim },
  coachChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
    backgroundColor: theme.colors.glassFill, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 12, borderCurve: 'continuous', marginBottom: 16,
  },
  coachChipText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  cancelBtn: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: theme.colors.error, fontWeight: '700', fontSize: 15 },

  // Approved
  groupCard: { padding: 20, marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center' },
  groupIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  groupTextContainer: { flex: 1 },
  groupName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text, marginBottom: 2 },
  groupCoach: { fontSize: 13, color: theme.colors.textSecondary },
  subgroupBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0, 105, 232, 0.08)', paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 10, borderCurve: 'continuous', alignSelf: 'flex-start', marginTop: 14,
  },
  subgroupText: { color: theme.colors.sprintyBlue, fontWeight: '700', fontSize: 13 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 4,
  },

  // Discussion cards
  discussionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  discussionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  discussionContent: { flex: 1, marginRight: 8 },
  discussionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 },
  discussionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  discussionTime: { fontSize: 12, color: theme.colors.textMuted },
  discussionBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  discussionPreview: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  discussionPreviewMuted: { color: theme.colors.textMuted },
  unreadBadge: {
    backgroundColor: theme.colors.sprintyBlue, minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Leave
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 52, marginTop: 24, borderRadius: 16, borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  leaveBtnText: { color: theme.colors.error, fontWeight: '700', fontSize: 15 },
});
