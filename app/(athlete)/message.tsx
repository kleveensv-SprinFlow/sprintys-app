import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/core/theme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { chatService, GroupDiscussionsSummary } from '../../src/services/chatService';
import { useRouter } from 'expo-router';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { glassSurface } from '../../src/core/glass';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { FrostedBar } from '../../src/shared/components/FrostedBar';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSprintyChatStore } from '../../src/store/sprintyChatStore';
import { formatListTime } from '../../src/shared/utils/chatTime';

const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

/** One line of plain text from an AI reply (no markdown marks, no JSON blocks). */
const previewOf = (content: string) =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface MyGroupData {
  team_id: string;
  coach_id: string;
  coach_name: string;
  team_name: string;
  status: string;
}

export default function MessagesHubScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const { barOpacity, scrollProps } = useFrostedHeader();
  const [myGroup, setMyGroup] = useState<MyGroupData | null>(null);
  const [discussions, setDiscussions] = useState<GroupDiscussionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const conversations = useSprintyChatStore((s) => s.conversations);

  // Latest personal Sprinty conversation that has a real exchange (not the coach's athlete analyses)
  const lastSprinty = [...conversations]
    .filter((c) => !c.athleteContext && c.messages.some((m) => m.role === 'user'))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const lastSprintyMessage = lastSprinty?.messages[lastSprinty.messages.length - 1];

  const fetchGroupAndDiscussions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, status, teams ( name, coach_id )')
        .eq('user_id', user.id)
        .maybeSingle();


      if (data && data.teams) {
        const t = Array.isArray(data.teams) ? data.teams[0] : data.teams;
        const coachId = t.coach_id;
        
        // Second call for coach name
        let coachName = 'Coach';
        if (coachId) {
          const { data: coachProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', coachId)
            .single();
          if (coachProfile && coachProfile.full_name) {
            coachName = coachProfile.full_name;
          }
        }

        setMyGroup({
          team_id: data.team_id,
          coach_id: coachId,
          team_name: t.name || 'Équipe',
          coach_name: coachName,
          status: data.status
        });

        if (data.status === 'approved') {
          const summary = await chatService.getAthleteGroupDiscussions(data.team_id, coachId);
          setDiscussions(summary);
        }
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

  const formatMessageTime = (dateStr: string) => formatListTime(dateStr);
  const coachInitial = (myGroup?.coach_name || 'C').trim().charAt(0).toUpperCase();


  return (
    <GlassScreen>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {/* Large title on the glows; frosted bar only once the list scrolls under it */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <FrostedBar opacity={barOpacity} />
          <Text style={styles.title}>Messages</Text>
        </View>

        <Animated.ScrollView {...scrollProps} contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
        
          {/* SPRINTY IA CARD */}
          <PressableScale
            style={styles.discussionCard}
            onPress={() => router.push('/chat/sprinty')}
          >
            <GlassSheen radius={18} />
            <LinearGradient
              colors={[theme.colors.sprintyBlue, theme.colors.sprintyCyan]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.discussionAvatar}
            >
              <Feather name="zap" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.discussionContent}>
              <View style={styles.discussionTopRow}>
                <Text style={styles.discussionTitle}>Sprinty</Text>
                {lastSprinty && <Text style={styles.discussionDate}>{formatListTime(lastSprinty.updatedAt)}</Text>}
              </View>
              <View style={styles.discussionBottomRow}>
                <Text style={styles.discussionPreview} numberOfLines={1}>
                  {lastSprintyMessage
                    ? `${lastSprintyMessage.role === 'user' ? 'Vous : ' : ''}${previewOf(lastSprintyMessage.content)}`
                    : 'Pose-moi une question sur ton entraînement'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </PressableScale>

          <Text style={styles.sectionLabel}>ÉQUIPE & COACH</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.sprintyBlue} style={{ marginTop: 20 }} />
          ) : myGroup ? (
            myGroup.status === 'pending' ? (
              <View style={styles.emptyState}>
                <GlassSheen radius={18} />
                <Text style={styles.emptyText}>Demande en attente pour l'équipe {myGroup.team_name}.</Text>
              </View>
            ) : (
              <>
                {/* COACH CARD */}
                <PressableScale
                  style={styles.discussionCard}
                  onPress={() => router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'direct', id: myGroup.coach_id, title: `Coach ${myGroup.coach_name}` }
                  })}
                >
                  <GlassSheen radius={18} />
                  <View style={[styles.discussionAvatar, { backgroundColor: BLUE_TINT }]}>
                    <Text style={styles.avatarLetter}>{coachInitial}</Text>
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
                          ? `${discussions.coach.last_message.is_me ? 'Vous : ' : ''}${discussions.coach.last_message.content}`
                          : 'Aucun message.'}
                      </Text>
                      {(discussions?.coach?.unread_count || 0) > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{discussions?.coach?.unread_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                </PressableScale>

                {/* TEAM CARD */}
                <PressableScale
                  style={styles.discussionCard}
                  onPress={() => router.push({
                    pathname: '/chat/[type]/[id]',
                    params: { type: 'team', id: myGroup.team_id, title: myGroup.team_name }
                  })}
                >
                  <GlassSheen radius={18} />
                  <View style={[styles.discussionAvatar, { backgroundColor: theme.colors.glassFill }]}>
                    <Feather name="users" size={19} color={theme.colors.text} />
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
                          ? `${discussions.team.last_message.sender_name} : ${discussions.team.last_message.content}`
                          : 'Aucun message dans le groupe.'}
                      </Text>
                      {(discussions?.team?.unread_count || 0) > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{discussions?.team?.unread_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                </PressableScale>
              </>
            )
          ) : (
            <View style={styles.emptyState}>
              <GlassSheen radius={18} />
              <Text style={styles.emptyText}>Tu n'as pas encore d'équipe. Appuie sur l'icône de personnes en haut de l'accueil pour en rejoindre une.</Text>
            </View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 14, zIndex: 10 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, color: theme.colors.text },
  content: { padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 24, marginBottom: 12, letterSpacing: 0.5 },
  discussionCard: { flexDirection: 'row', alignItems: 'center', ...glassSurface, padding: 14, borderRadius: 18, borderCurve: 'continuous', marginBottom: 10 },
  discussionAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  discussionContent: { flex: 1, justifyContent: 'center' },
  discussionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  discussionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: theme.colors.sprintyBlue },
  discussionDate: { fontSize: 12, color: theme.colors.textMuted },
  discussionBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discussionPreview: { fontSize: 14, color: theme.colors.textSecondary, flex: 1, paddingRight: 8 },
  discussionPreviewMuted: { color: theme.colors.textMuted },
  unreadBadge: { backgroundColor: theme.colors.sprintyBlue, borderRadius: 12, paddingHorizontal: 6, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  emptyState: { padding: 20, ...glassSurface, borderRadius: 18 },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 }
});

