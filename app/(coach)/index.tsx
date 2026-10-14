import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { workoutService } from '../../src/services/workoutService';
import { WeatherCard } from '../../src/shared/components/WeatherCard';
import { BroadcastModal } from '../../src/features/coach/components/BroadcastModal';
import { SprintyLogo } from '../../src/shared/components/SprintyLogo';
import { TeamHealthModal } from '../../src/features/coach/components/TeamHealthModal';
import { HeaderProfileAvatar } from '../../src/shared/components/HeaderProfileAvatar';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { FrostedBar } from '../../src/shared/components/FrostedBar';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { IconButton } from '../../src/shared/components/IconButton';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { Skeleton } from '../../src/shared/components/Skeleton';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';
import { useRefresh } from '../../src/shared/hooks/useRefresh';

import { tourRef } from '../../src/features/onboarding/tourRegistry';
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
};

const formForm = (score: number | null) => {
  if (score === null) return { color: theme.colors.textMuted, label: 'Pas encore de check-in aujourd’hui' };
  if (score >= 70) return { color: theme.colors.success, label: 'L’équipe est en forme' };
  if (score >= 40) return { color: '#F59E0B', label: 'Fatigue modérée, reste attentif' };
  return { color: theme.colors.error, label: 'Récupération nécessaire' };
};

export default function CoachDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace(24);
  const scrollY = useRef(new Animated.Value(0)).current;
  const barOpacity = scrollY.interpolate({ inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp' });

  const { user } = useAuthStore();
  const {
    teams,
    hasFetchedTeams,
    teamMembers,
    pendingMembers,
    teamCheckIns,
    fetchTeams,
    fetchTeamMembers,
    fetchTeamCheckIns,
    fetchAllPendingRequests,
  } = useCoachStore();

  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [teamHealthVisible, setTeamHealthVisible] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<any[] | null>(null);

  const team = teams[0];
  const todayStr = localDateStr(new Date());

  const loadTeamData = useCallback(async () => {
    if (!team || !user?.id) return;
    const [, , , workouts] = await Promise.all([
      fetchTeamMembers(team.id),
      fetchTeamCheckIns(team.id, todayStr),
      fetchAllPendingRequests(),
      workoutService.fetchWorkoutsForDate(user.id, new Date(), 'coach', team.id).catch(() => []),
    ]);
    setTodayWorkouts(workouts || []);
  }, [team?.id, user?.id, todayStr]);

  // Teams were only loaded by other tabs before: the home stayed empty on cold start
  useEffect(() => {
    if (!hasFetchedTeams) fetchTeams();
  }, [hasFetchedTeams]);

  useFocusEffect(
    useCallback(() => {
      loadTeamData();
    }, [loadTeamData]),
  );

  const refreshControl = useRefresh(async () => {
    await fetchTeams();
    await loadTeamData();
  });

  const approved = teamMembers.filter((m) => m.status === 'approved');
  const scores = teamCheckIns.map((c) => c.health_score).filter((s): s is number => s != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const form = formForm(avg);

  const now = new Date();
  const dateLabel = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';
  const loadingTeams = !hasFetchedTeams;

  return (
    <GlassScreen scrollY={scrollY}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <FrostedBar opacity={barOpacity} />
        <View style={styles.header}>
          <IconButton
            icon="volume-2"
            size={44}
            accessibilityLabel="Envoyer une annonce à l’équipe"
            onPress={() => setBroadcastVisible(true)}
            disabled={!team}
            style={glassCard as any}
            targetRef={tourRef('coach.announce')}
          />
          <View style={styles.logo}>
            <SprintyLogo width={120} height={38} />
          </View>
          <HeaderProfileAvatar avatarUrl={user?.avatarUrl} onPress={() => router.push('/(coach)/profile')} targetRef={tourRef('coach.profile')} size={44} />
        </View>
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingDate}>{dateLabel.toUpperCase()}</Text>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {firstName ? `${greeting()} ${firstName}` : greeting()}
          </Text>
        </View>

        {loadingTeams ? (
          <View style={[glassCard, styles.card]}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="30%" height={34} style={{ marginTop: 14 }} />
            <Skeleton width="65%" height={12} style={{ marginTop: 10 }} />
          </View>
        ) : !team ? (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <EmptyState
              compact
              icon="users"
              title="Crée ton premier groupe"
              message="Tes athlètes le rejoindront avec un code, et tu verras ici leur forme du jour."
              actionLabel="Créer un groupe"
              onAction={() => router.push('/(coach)/group')}
            />
          </View>
        ) : (
          <>
            {pendingMembers.length > 0 && (
              <PressableScale onPress={() => router.push('/(coach)/group')} style={[glassCard, styles.pending]}>
                <View style={styles.pendingIcon}>
                  <Feather name="user-plus" size={18} color={theme.colors.sprintyBlue} />
                </View>
                <Text style={styles.pendingText}>
                  {pendingMembers.length === 1
                    ? '1 athlète attend ta validation'
                    : `${pendingMembers.length} athlètes attendent ta validation`}
                </Text>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </PressableScale>
            )}

            <PressableScale onPress={() => setTeamHealthVisible(true)} style={[glassCard, styles.card]} targetRef={tourRef('coach.form')}>
              <GlassSheen radius={22} />
              <View style={styles.cardHead}>
                <View style={[styles.dot, { backgroundColor: form.color }]} />
                <Text style={styles.cardLabel}>FORME DE L’ÉQUIPE</Text>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formValue}>{avg === null ? '—' : `${Math.round(avg)}%`}</Text>
                <Text style={styles.formCount}>
                  {scores.length}/{approved.length || '–'} check-in{scores.length > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.formLabel}>{form.label}</Text>
            </PressableScale>
          </>
        )}

        <WeatherCard />

        <Text style={styles.sectionTitle}>SÉANCES DU JOUR</Text>
        {team && todayWorkouts === null ? (
          <View style={[glassCard, styles.card]}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="60%" height={18} style={{ marginTop: 12 }} />
          </View>
        ) : !todayWorkouts?.length ? (
          <View style={[glassCard, styles.card]}>
            <GlassSheen radius={22} />
            <EmptyState
              compact
              icon="calendar"
              title="Rien de prévu aujourd’hui"
              message="Planifie une séance pour ton groupe en quelques secondes."
              actionLabel="Planifier une séance"
              onAction={() => router.push(`/(coach)/day/${todayStr}`)}
            />
          </View>
        ) : (
          todayWorkouts.map((w, i) => {
            const d = new Date(w.date_prevue);
            const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            return (
              <PressableScale
                key={w.id || i}
                onPress={() => router.push(`/(coach)/day/${w.date_prevue ? localDateStr(d) : todayStr}`)}
                style={[glassCard, styles.session]}
              >
                <GlassSheen radius={22} />
                <View style={styles.sessionIcon}>
                  <Feather name="activity" size={18} color={theme.colors.sprintyBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {w.type_seance || 'Séance'}
                  </Text>
                  <Text style={styles.sessionMeta} numberOfLines={1}>
                    {time}
                    {w.description ? ` · ${w.description}` : ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </PressableScale>
            );
          })
        )}
      </Animated.ScrollView>

      <BroadcastModal visible={broadcastVisible} onClose={() => setBroadcastVisible(false)} />
      <TeamHealthModal visible={teamHealthVisible} onClose={() => setTeamHealthVisible(false)} />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { zIndex: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: { flex: 1, alignItems: 'center' },
  content: { paddingHorizontal: 16 },
  greeting: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 14 },
  greetingDate: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, color: theme.colors.textSecondary },
  greetingTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: theme.colors.text, marginTop: 2 },
  card: { paddingVertical: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardLabel: { flex: 1, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textSecondary },
  formRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 10 },
  formValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  formCount: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  formLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginTop: 2 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginBottom: 12 },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, marginBottom: 10 },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  sessionMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});
