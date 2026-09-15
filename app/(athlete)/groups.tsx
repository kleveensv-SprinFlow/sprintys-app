import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/core/theme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { chatService, GroupDiscussionsSummary } from '../../src/services/chatService';
import { useRouter } from 'expo-router';

interface MyGroupData {
  team_id: string;
  coach_id: string;
  status: 'pending' | 'approved';
  team_name: string;
  coach_name: string;
  subgroup_name: string | null;
}

export default function GroupsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [myGroup, setMyGroup] = useState<MyGroupData | null>(null);
  const [discussions, setDiscussions] = useState<GroupDiscussionsSummary | null>(null);
  const [isDiscussionsLoading, setIsDiscussionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTeamName, setPreviewTeamName] = useState<string | null>(null);

  useEffect(() => {
    if (inviteCode.length === 8) {
      checkInviteCode();
    } else {
      setPreviewTeamName(null);
    }
  }, [inviteCode]);

  const checkInviteCode = async () => {
    try {
      const { data, error } = await supabase.rpc('preview_team_by_code', { p_invite_code: inviteCode });
      if (data && !error) {
        setPreviewTeamName(data);
      } else {
        setPreviewTeamName(null);
      }
    } catch (e) {
      setPreviewTeamName(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyGroup();
    }, [user?.id])
  );

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
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
  };

  const loadDiscussions = async (teamId: string, coachId: string) => {
    setIsDiscussionsLoading(true);
    try {
      const res = await chatService.getAthleteGroupDiscussions(teamId, coachId);
      setDiscussions(res);
    } catch (e) {
      console.error('Error loading discussions:', e);
    } finally {
      setIsDiscussionsLoading(false);
    }
  };

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
    }
  };

  const handleJoinGroup = async () => {
    const code = inviteCode.trim();
    if (!code || !user?.id) return;
    setIsJoining(true);

    try {
      // Rejoindre via RPC sécurisée
      const { data, error: rpcError } = await supabase.rpc('join_team_by_code', { p_invite_code: code });

      if (rpcError || !data) {
        Alert.alert('Erreur', rpcError?.message || 'Code invalide ou erreur serveur.');
        setIsJoining(false);
        return;
      }
      
      Alert.alert('Demande envoyée ! 🚀', `Ta demande pour rejoindre "${data.team_name}" a été envoyée au coach. Tu seras notifié quand il t'acceptera.`);
      setInviteCode('');
      fetchMyGroup();

    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Réessaie plus tard.');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!myGroup || !user?.id) return;

    Alert.alert(
      'Quitter le groupe',
      `Es-tu sûr de vouloir quitter "${myGroup.team_name}" ? Tu conserveras l'historique de tes séances mais tu ne recevras plus les nouvelles planifications.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('team_members')
                .delete()
                .match({ team_id: myGroup.team_id, user_id: user.id });

              if (error) throw error;
              setMyGroup(null);
              Alert.alert('Terminé', 'Tu as quitté le groupe.');
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de quitter le groupe.');
              console.error(err);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mon Groupe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* === ÉTAT 1 : Pas de groupe => Rejoindre === */}
        {!myGroup && (
          <>
            <View style={styles.joinCard}>
              <View style={styles.joinIconCircle}>
                <Feather name="users" size={32} color={theme.colors.accent} />
              </View>
              <Text style={styles.cardTitle}>Rejoindre un coach</Text>
              <Text style={styles.cardDesc}>
                Entre le code à 8 chiffres donné par ton coach ou scanne son QR code pour envoyer ta demande.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Code à 8 chiffres (ex: 48291037)"
                placeholderTextColor={theme.colors.textMuted}
                value={inviteCode}
                onChangeText={setInviteCode}
                keyboardType="number-pad"
                maxLength={8}
              />

              {inviteCode.length === 8 && previewTeamName && (
                <View style={styles.previewContainer}>
                  <Feather name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.previewText}>Groupe trouvé : <Text style={styles.previewTeamName}>{previewTeamName}</Text></Text>
                </View>
              )}
              {inviteCode.length === 8 && !previewTeamName && (
                <View style={styles.previewContainerError}>
                  <Feather name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={styles.previewTextError}>Code invalide ou introuvable</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.joinBtn, (!inviteCode.trim() || inviteCode.trim().length < 8) && { opacity: 0.5 }]}
                onPress={handleJoinGroup}
                disabled={!inviteCode.trim() || inviteCode.trim().length < 8 || isJoining || !previewTeamName}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.joinBtnText}>Envoyer la demande</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.emptyState}>
              <Feather name="shield" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>Tu n'es dans aucun groupe.</Text>
              <Text style={styles.emptySubText}>Demande le code d'invitation à ton coach.</Text>
            </View>
          </>
        )}

        {/* === ÉTAT 2 : Demande en attente === */}
        {myGroup && myGroup.status === 'pending' && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIconCircle}>
              <Feather name="clock" size={32} color={theme.colors.warning} />
            </View>
            <Text style={styles.pendingTitle}>Demande en attente</Text>
            <Text style={styles.pendingDesc}>
              Ta demande pour rejoindre le groupe "{myGroup.team_name}" a été envoyée. Le coach doit l'accepter pour que tu puisses accéder à la planification.
            </Text>
            <View style={styles.pendingInfoRow}>
              <Feather name="user" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.pendingInfoText}>Coach : {myGroup.coach_name}</Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleLeaveGroup}>
              <Text style={styles.cancelBtnText}>Annuler la demande</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === ÉTAT 3 : Membre approuvé => Tableau de bord du groupe === */}
        {myGroup && myGroup.status === 'approved' && (
          <View style={styles.approvedContainer}>
            {/* Carte du groupe */}
            <View style={styles.groupMainCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIconCircle}>
                  <Feather name="shield" size={28} color={theme.colors.accent} />
                </View>
                <View style={styles.groupTextContainer}>
                  <Text style={styles.groupName}>{myGroup.team_name}</Text>
                  <Text style={styles.groupCoach}>Coach : {myGroup.coach_name}</Text>
                </View>
              </View>
              {myGroup.subgroup_name && (
                <View style={styles.subgroupBadge}>
                  <Feather name="tag" size={14} color={theme.colors.accent} />
                  <Text style={styles.subgroupText}>{myGroup.subgroup_name}</Text>
                </View>
              )}
            </View>

            {/* Actions du groupe */}
            <Text style={styles.sectionLabel}>ACTIONS</Text>

            <TouchableOpacity 
              style={styles.actionCard} 
              activeOpacity={0.7}
              onPress={() => {
                if (myGroup?.coach_id) {
                  router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'direct', id: myGroup.coach_id, title: `Coach ${myGroup.coach_name}` }
                  });
                } else {
                  Alert.alert('Information', 'Identifiant du coach indisponible.');
                }
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="message-circle" size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Discuter avec le coach</Text>
                <Text style={styles.actionDesc}>Message privé avec {myGroup.coach_name}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard} 
              activeOpacity={0.7}
              onPress={() => {
                if (myGroup?.team_id) {
                  router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'team', id: myGroup.team_id, title: myGroup.team_name }
                  });
                } else {
                  Alert.alert('Information', 'Identifiant de l\'équipe indisponible.');
                }
              }}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: theme.colors.success + '20' }]}>
                <Feather name="users" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Tchat de groupe</Text>
                <Text style={styles.actionDesc}>Discuter avec {myGroup.team_name}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Discussions du groupe */}
            <View style={styles.discussionsHeader}>
              <Text style={styles.sectionLabel}>DISCUSSIONS DU GROUPE</Text>
              {isDiscussionsLoading && (
                <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginBottom: 12 }} />
              )}
            </View>

            {/* Carte Discussion Coach */}
            <TouchableOpacity 
              style={styles.discussionCard}
              activeOpacity={0.7}
              onPress={() => {
                if (myGroup?.coach_id) {
                  router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'direct', id: myGroup.coach_id, title: `Coach ${myGroup.coach_name}` }
                  });
                }
              }}
            >
              <View style={[styles.discussionAvatar, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="user-check" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.discussionContent}>
                <View style={styles.discussionTopRow}>
                  <Text style={styles.discussionTitle}>Coach {myGroup.coach_name}</Text>
                  {discussions?.coach?.last_message && (
                    <Text style={styles.discussionDate}>
                      {formatMessageTime(discussions.coach.last_message.created_at)}
                    </Text>
                  )}
                </View>
                <View style={styles.discussionBottomRow}>
                  <Text 
                    style={[
                      styles.discussionPreview,
                      !discussions?.coach?.last_message && styles.discussionPreviewMuted
                    ]} 
                    numberOfLines={1}
                  >
                    {discussions?.coach?.last_message 
                      ? `${discussions.coach.last_message.is_me ? 'Vous : ' : ''}${discussions.coach.last_message.content}`
                      : 'Aucun message pour le moment. Cliquez pour écrire.'}
                  </Text>
                  {(discussions?.coach?.unread_count || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{discussions?.coach?.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Carte Discussion Équipe */}
            <TouchableOpacity 
              style={styles.discussionCard}
              activeOpacity={0.7}
              onPress={() => {
                if (myGroup?.team_id) {
                  router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'team', id: myGroup.team_id, title: myGroup.team_name }
                  });
                }
              }}
            >
              <View style={[styles.discussionAvatar, { backgroundColor: theme.colors.success + '20' }]}>
                <Feather name="users" size={20} color={theme.colors.success} />
              </View>
              <View style={styles.discussionContent}>
                <View style={styles.discussionTopRow}>
                  <Text style={styles.discussionTitle}>Équipe {myGroup.team_name}</Text>
                  {discussions?.team?.last_message && (
                    <Text style={styles.discussionDate}>
                      {formatMessageTime(discussions.team.last_message.created_at)}
                    </Text>
                  )}
                </View>
                <View style={styles.discussionBottomRow}>
                  <Text 
                    style={[
                      styles.discussionPreview,
                      !discussions?.team?.last_message && styles.discussionPreviewMuted
                    ]} 
                    numberOfLines={1}
                  >
                    {discussions?.team?.last_message 
                      ? `${discussions.team.last_message.sender_name} : ${discussions.team.last_message.content}`
                      : 'Aucun message dans le groupe pour le moment.'}
                  </Text>
                  {(discussions?.team?.unread_count || 0) > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.success }]}>
                      <Text style={styles.unreadBadgeText}>{discussions?.team?.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* Quitter le groupe */}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
              <Feather name="log-out" size={18} color={theme.colors.error} />
              <Text style={styles.leaveBtnText}>Quitter le groupe</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: 20 },

  // Join Card
  joinCard: {
    backgroundColor: theme.colors.surface, padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', marginBottom: 24,
  },
  joinIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, textAlign: 'center' },
  cardDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: {
    width: '100%', backgroundColor: theme.colors.surfaceLight, color: theme.colors.text,
    padding: 16, borderRadius: 12, fontSize: 20, textAlign: 'center', letterSpacing: 4, marginBottom: 16,
  },
  joinBtn: {
    width: '100%', backgroundColor: theme.colors.accent, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  joinBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Empty State
  previewContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: theme.colors.success + '15', padding: 12, borderRadius: 8, width: '100%' },
  previewContainerError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: theme.colors.error + '15', padding: 12, borderRadius: 8, width: '100%' },
  previewText: { color: theme.colors.success, fontSize: 14 },
  previewTextError: { color: theme.colors.error, fontSize: 14 },
  previewTeamName: { fontWeight: 'bold' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: theme.colors.textMuted, marginTop: 4, fontSize: 14 },

  // Pending Card
  pendingCard: {
    backgroundColor: theme.colors.surface, padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.warning + '40', alignItems: 'center',
  },
  pendingIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.warning + '20',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  pendingTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  pendingDesc: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  pendingInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  pendingInfoText: { color: theme.colors.textSecondary, fontSize: 15 },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: theme.colors.error, fontWeight: '600', fontSize: 14 },

  // Approved Container
  approvedContainer: { flex: 1 },
  groupMainCard: {
    backgroundColor: theme.colors.surface, padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center' },
  groupIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  groupTextContainer: { flex: 1 },
  groupName: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  groupCoach: { fontSize: 14, color: theme.colors.textSecondary },
  subgroupBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surfaceLight, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, alignSelf: 'flex-start', marginTop: 16,
  },
  subgroupText: { color: theme.colors.accent, fontWeight: '600', fontSize: 14 },

  // Actions
  sectionLabel: {
    fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted,
    letterSpacing: 2, marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border,
  },
  actionIconCircle: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  actionDesc: { fontSize: 13, color: theme.colors.textMuted },

  // Discussions section
  discussionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  discussionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  discussionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  discussionContent: {
    flex: 1,
    marginRight: 8,
  },
  discussionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  discussionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  discussionDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  discussionBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discussionPreview: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  discussionPreviewMuted: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: theme.colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Leave Button
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, marginTop: 30, marginBottom: 100,
  },
  leaveBtnText: { color: theme.colors.error, fontWeight: '600', fontSize: 15 },
});
