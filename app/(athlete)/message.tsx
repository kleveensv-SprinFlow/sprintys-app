import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
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
  coach_name: string;
  team_name: string;
}

export default function MessagesHubScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [myGroup, setMyGroup] = useState<MyGroupData | null>(null);
  const [discussions, setDiscussions] = useState<GroupDiscussionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroupAndDiscussions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(\
          team_id,
          status,
          teams ( name, coach_id ),
          coach_name: coachProfile?.full_name || 'Coach'
        \)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.status === 'approved' && data.teams) {
        const t = Array.isArray(data.teams) ? data.teams[0] : data.teams;
        const coachId = t.coach_id;
        setMyGroup({
          team_id: data.team_id,
          coach_id: coachId,
          team_name: t.name || 'Équipe',
          coach_name: data.coach_name || 'Coach'
        });

        const summary = await chatService.getGroupDiscussionsSummary(data.team_id, coachId);
        setDiscussions(summary);
      } else {
        setMyGroup(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchGroupAndDiscussions();
    }, [user?.id])
  );

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* SPRINTY IA CARD */}
        <TouchableOpacity 
          style={styles.discussionCard}
          activeOpacity={0.7}
          onPress={() => router.push('/chat/sprinty')}
        >
          <View style={[styles.discussionAvatar, { backgroundColor: '#0026AE15' }]}>
            <Text style={{ fontSize: 20 }}>?</Text>
          </View>
          <View style={styles.discussionContent}>
            <View style={styles.discussionTopRow}>
              <Text style={styles.discussionTitle}>Sprinty IA</Text>
            </View>
            <View style={styles.discussionBottomRow}>
              <Text style={styles.discussionPreview} numberOfLines={1}>
                Ton assistant personnel
              </Text>
            </View>
          </View>
          <Feather name=\chevron-right\ size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>ÉQUIPE & COACH</Text>

        {isLoading ? (
          <ActivityIndicator size=\small\ color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : myGroup ? (
          <>
            {/* COACH CARD */}
            <TouchableOpacity 
              style={styles.discussionCard}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/chat/[type]/[id]',
                params: { type: 'direct', id: myGroup.coach_id, title: \Coach \\ }
              })}
            >
              <View style={[styles.discussionAvatar, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name=\user-check\ size={20} color={theme.colors.accent} />
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
                  <Text style={[styles.discussionPreview, !discussions?.coach?.last_message && styles.discussionPreviewMuted]} numberOfLines={1}>
                    {discussions?.coach?.last_message 
                      ? \\\\
                      : 'Aucun message pour le moment.'}
                  </Text>
                  {(discussions?.coach?.unread_count || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{discussions?.coach?.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name=\chevron-right\ size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* TEAM CARD */}
            <TouchableOpacity 
              style={styles.discussionCard}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/chat/[type]/[id]',
                params: { type: 'team', id: myGroup.team_id, title: myGroup.team_name }
              })}
            >
              <View style={[styles.discussionAvatar, { backgroundColor: theme.colors.success + '20' }]}>
                <Feather name=\users\ size={20} color={theme.colors.success} />
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
                  <Text style={[styles.discussionPreview, !discussions?.team?.last_message && styles.discussionPreviewMuted]} numberOfLines={1}>
                    {discussions?.team?.last_message 
                      ? \\ : \\
                      : 'Aucun message dans le groupe.'}
                  </Text>
                  {(discussions?.team?.unread_count || 0) > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.success }]}>
                      <Text style={styles.unreadBadgeText}>{discussions?.team?.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Feather name=\chevron-right\ size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Vous n'avez pas encore rejoint d'équipe. Allez dans l'onglet Profil > Groupes pour en rejoindre une.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  content: { padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginTop: 24, marginBottom: 12, letterSpacing: 0.5 },
  discussionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  discussionAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  discussionContent: { flex: 1, justifyContent: 'center' },
  discussionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  discussionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  discussionDate: { fontSize: 12, color: theme.colors.textMuted },
  discussionBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discussionPreview: { fontSize: 14, color: theme.colors.textSecondary, flex: 1, paddingRight: 8 },
  discussionPreviewMuted: { fontStyle: 'italic', color: theme.colors.textMuted },
  unreadBadge: { backgroundColor: theme.colors.error, borderRadius: 12, paddingHorizontal: 6, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  emptyState: { padding: 20, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }
});

