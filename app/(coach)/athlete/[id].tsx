import { PerformanceView } from '../../../src/features/performance/PerformanceView';
import { goBack } from '../../../src/core/navigation';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/core/theme';
import { Feather } from '@expo/vector-icons';
import { checkInService, CheckInData } from '../../../src/services/checkInService';
import { useCoachStore } from '../../../src/store/coach/coachStore';
import { glassCard } from '../../../src/core/glass';
import { GlassSheen } from '../../../src/shared/components/GlassSheen';
import { GlassScreen } from '../../../src/shared/components/GlassScreen';
import { Header } from '../../../src/shared/components/Header';
import { PressableScale } from '../../../src/shared/components/PressableScale';
import { EmptyState } from '../../../src/shared/components/EmptyState';
import { Skeleton, SkeletonCard } from '../../../src/shared/components/Skeleton';
import { ListRow } from '../../../src/shared/components/ListRow';
import { useFrostedHeader } from '../../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../../src/shared/hooks/useRefresh';
import { useAuthStore } from '../../../src/store/authStore';
import { supabase } from '../../../src/services/supabase';

type FeatherName = keyof typeof Feather.glyphMap;

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();

  const { teamMembers, subgroups, fetchTeams, fetchTeamMembers, fetchSubgroups } = useCoachStore();
  // Find athlete profile from the new store structure
  const athleteMember = teamMembers.find(m => m.user_id === id);
  const profile = athleteMember?.profile;

  // Opened without the team in memory (restart, link, notification): load the teams before concluding the athlete is unknown
  const coachId = useAuthStore((st) => st.user?.id);
  const [resolving, setResolving] = useState(!athleteMember);
  useEffect(() => {
    if (athleteMember) {
      setResolving(false);
      return;
    }
    if (!coachId) return; // session still restoring: stay on the loading state
    let alive = true;
    (async () => {
      try {
        // Find the team of this athlete among the coach's teams, then load only that one (several teams would overwrite each other)
        const { data } = await supabase
          .from('team_members')
          .select('team_id, teams!inner(coach_id)')
          .eq('user_id', id)
          .eq('teams.coach_id', coachId)
          .limit(1);
        const teamId = (data as any[] | null)?.[0]?.team_id as string | undefined;
        if (teamId) {
          await fetchTeams();
          await fetchTeamMembers(teamId);
          await fetchSubgroups(teamId);
        }
      } catch {
        /* falls through to the not-found state */
      } finally {
        if (alive) setResolving(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, coachId]);

  const [latestCheckIn, setLatestCheckIn] = useState<CheckInData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const refreshControl = useRefresh(() => {
    setRefreshKey((k) => k + 1);
    return id ? loadCheckIn(id as string) : undefined;
  });
  useEffect(() => {
    if (id) {
      loadCheckIn(id);
    }
  }, [id]);

  const loadCheckIn = async (athleteId: string) => {
    setIsLoading(true);
    try {
      const history = await checkInService.fetchRecentCheckIns(athleteId, 3);
      setLatestCheckIn(history.length > 0 ? history[0] : null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile && resolving) {
    return (
      <GlassScreen scrollY={scrollY}>
        <Header title="Athlète" showBackButton onBackPress={() => goBack(router, '/(coach)')} />
        <View style={{ padding: 16 }}>
          <SkeletonCard avatar />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  if (!profile) {
    return (
      <GlassScreen>
        <Header title="Athlète" showBackButton onBackPress={() => goBack(router, '/(coach)')} />
        <EmptyState
          icon="user-x"
          title="Athlète introuvable"
          message="Cet athlète ne fait plus partie de tes groupes."
          actionLabel="Retour"
          onAction={() => goBack(router, '/(coach)')}
        />
      </GlassScreen>
    );
  }

  const name = profile.full_name || 'Athlète';

  const renderScoreBar = (label: string, score: number | null | undefined, icon: FeatherName, color: string) => {
    const answered = score != null;
    const validScore = score || 0;
    return (
      <View style={styles.scoreRow}>
        <View style={styles.scoreLabelRow}>
          <Feather name={icon} size={16} color={theme.colors.textSecondary} />
          <Text style={styles.scoreLabel}>{label}</Text>
        </View>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${validScore}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreValue, { color: answered ? color : theme.colors.textMuted }]}>{answered ? `${Math.round(validScore)}/100` : "Non renseigné"}</Text>
      </View>
    );
  };

  const actions: { key: string; label: string; icon: FeatherName; color: string; tint: string; onPress: () => void }[] = [
    {
      key: 'nutrition',
      label: 'Nutrition',
      icon: 'pie-chart',
      color: theme.colors.warning,
      tint: 'rgba(245, 158, 11, 0.12)',
      onPress: () => router.push(`/(athlete)/nutrition?athleteId=${id}&readonly=true`),
    },
    {
      key: 'performance',
      label: 'Performance',
      icon: 'trending-up',
      color: theme.colors.sprintyBlue,
      tint: 'rgba(0, 105, 232, 0.1)',
      onPress: () => router.push(`/(coach)/athlete/${id}/performance`),
    },
    {
      key: 'sessions',
      label: 'Séances',
      icon: 'calendar',
      color: theme.colors.success,
      tint: 'rgba(16, 185, 129, 0.12)',
      onPress: () => router.push(`/(coach)/athlete/${id}/calendar`),
    },
    {
      key: 'ai',
      label: 'Sprinty IA',
      icon: 'zap',
      color: theme.colors.sprintyBlue,
      tint: 'rgba(0, 105, 232, 0.1)',
      onPress: () =>
        router.push({
          pathname: '/(coach)/chat',
          params: {
            athleteId: id,
            athleteName: name,
            avatarUrl: profile.avatar_url || '',
            domains: 'training,nutrition,wellness,body',
            ts: String(Date.now()),
          },
        }),
    },
  ];

  return (
    <GlassScreen scrollY={scrollY}>
      <Header title={name} showBackButton onBackPress={() => goBack(router, '/(coach)')} scrollY={scrollY} />

      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE INFO */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileGroup}>
            {subgroups.find((g) => g.id === athleteMember?.subgroup_id)?.name || profile.subgroups?.join(', ') || 'Sans sous-groupe'}
          </Text>
        </View>

        {/* ACTIONS RAPIDES */}
        <View style={styles.actionGrid}>
          {actions.map((a) => (
            <PressableScale
              key={a.key}
              onPress={a.onPress}
              containerStyle={styles.actionGridCell}
              style={styles.actionGridItem}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <GlassSheen radius={18} />
              <View style={[styles.actionIconBg, { backgroundColor: a.tint }]}>
                <Feather name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={styles.actionGridText} numberOfLines={1} adjustsFontSizeToFit>
                {a.label}
              </Text>
            </PressableScale>
          ))}
        </View>

        {/* CHECK-IN SECTION */}
        <Text style={styles.sectionTitle}>
          {latestCheckIn && latestCheckIn.date !== localToday()
            ? `Dernier bilan · ${String(latestCheckIn.date).split('-').reverse().slice(0, 2).join('/')}`
            : 'Forme du jour'}
        </Text>

        {isLoading ? (
          <View style={[glassCard, styles.checkInCard]}>
            <View style={styles.globalScoreHeader}>
              <Skeleton width="45%" height={18} />
              <Skeleton width={64} height={30} radius={12} />
            </View>
            <View style={styles.divider} />
            <View style={{ gap: 18 }}>
              <Skeleton height={10} />
              <Skeleton height={10} />
              <Skeleton width="80%" height={10} />
            </View>
          </View>
        ) : !latestCheckIn ? (
          <View style={[glassCard, styles.checkInCard]}>
            <GlassSheen radius={22} />
            <EmptyState
              compact
              icon="clock"
              title="Pas encore de bilan"
              message={`${name} n’a pas encore rempli son ressenti du jour.`}
            />
          </View>
        ) : (
          <View style={[glassCard, styles.checkInCard]}>
            <GlassSheen radius={22} />
            {/* Global Score */}
            <View style={styles.globalScoreHeader}>
              <Text style={styles.globalScoreTitle}>Score de forme</Text>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(latestCheckIn.health_score) + '20' }]}>
                <Text style={[styles.scoreBadgeText, { color: getScoreColor(latestCheckIn.health_score) }]}>
                  {latestCheckIn.health_score ?? '–'} %
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Subscores */}
            {renderScoreBar('Sommeil', latestCheckIn.sleep_score, 'moon', theme.colors.sprintyBlue)}
            {renderScoreBar('Physique', latestCheckIn.physical_score, 'activity', getScoreColor(latestCheckIn.physical_score || 0))}
            {renderScoreBar('Mental', latestCheckIn.mental_score, 'smile', '#8b5cf6')}

            {/* Pains details */}
            {latestCheckIn.pains && latestCheckIn.pains.length > 0 && (
              <View style={styles.painsContainer}>
                <Text style={styles.painsTitle}>Douleurs signalées</Text>
                {latestCheckIn.pains.map((pain, idx) => (
                  <View key={idx} style={styles.painItem}>
                    <View style={styles.painItemHeader}>
                      <View style={[styles.dot, { backgroundColor: getScoreColor(100 - (pain.intensity * 10)) }]} />
                      <Text style={styles.painName}>{pain.muscle_name} {pain.side ? `(${pain.side})` : ''}</Text>
                      <Text style={styles.painIntensity}>{pain.intensity}/10</Text>
                    </View>
                    <Text style={styles.painType}>{pain.type}</Text>
                    {!!pain.comment && <Text style={styles.painComment}>« {pain.comment} »</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* PERFORMANCE */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={{ marginHorizontal: -16 }}>
          <PerformanceView
            athleteId={String(id)}
            mode="summary"
            audience="coach"
            refreshKey={refreshKey}
            onSeeAll={() => router.push(`/(coach)/athlete/${id}/performance`)}
            onWeeklyReport={() =>
              router.push({
                pathname: '/(coach)/chat',
                params: {
                  athleteId: String(id),
                  athleteName: name,
                  avatarUrl: profile.avatar_url || '',
                  domains: 'training,nutrition,wellness,body',
                  initialPrompt: `Fais le bilan de la semaine de ${name.split(' ')[0]} : séances, nutrition, sommeil, poids et charge.`,
                  ts: String(Date.now()),
                },
              })
            }
          />
        </View>

        {/* ACTIONS */}
        <Text style={styles.sectionTitle}>Messagerie</Text>
        <View style={[glassCard, styles.listCard]}>
          <ListRow
            icon="message-circle"
            title="Envoyer un message"
            onPress={() => router.push(`/chat/direct/${id}`)}
            last
          />
        </View>
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function getScoreColor(score: number) {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warning;
  return theme.colors.error;
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },

  profileSection: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: { width: 84, height: 84 },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: theme.colors.sprintyBlue },
  profileName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: theme.colors.text, textAlign: 'center' },
  profileGroup: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },

  actionGrid: { flexDirection: 'row', marginBottom: 28, gap: 10 },
  actionGridCell: { flex: 1 },
  actionGridItem: {
    ...glassCard,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionGridText: { fontSize: 12, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },

  checkInCard: { padding: 20, marginBottom: 28 },
  listCard: { paddingVertical: 4, marginBottom: 12 },
  globalScoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  globalScoreTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderCurve: 'continuous' },
  scoreBadgeText: { fontWeight: '800', fontSize: 16 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginVertical: 18 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', width: 90, gap: 8 },
  scoreLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: theme.colors.glassFill, borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreValue: { width: 52, textAlign: 'right', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  painsContainer: { marginTop: 8, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline },
  painsTitle: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  painItem: { backgroundColor: theme.colors.glassFill, padding: 12, borderRadius: 12, borderCurve: 'continuous', marginBottom: 8 },
  painItemHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  painName: { color: theme.colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  painIntensity: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  painType: { color: theme.colors.warning, fontSize: 13, marginTop: 4, marginLeft: 16 },
  painComment: { color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: 8, marginLeft: 16 },
});
