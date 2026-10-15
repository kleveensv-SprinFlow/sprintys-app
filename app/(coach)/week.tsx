import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { goBack } from '../../src/core/navigation';
import { Header } from '../../src/shared/components/Header';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { IconButton } from '../../src/shared/components/IconButton';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { WorkoutCard } from '../../src/shared/components/WorkoutCard';
import { SkeletonCard } from '../../src/shared/components/Skeleton';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { useRefresh } from '../../src/shared/hooks/useRefresh';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore, useCurrentTeam } from '../../src/store/coach/coachStore';
import { workoutService } from '../../src/services/workoutService';
import { TeamSwitcher } from '../../src/features/coach/components/TeamSwitcher';
import { WorkoutDetailModal } from '../../src/features/calendar/components/WorkoutDetailModal';
import { CopyWorkoutModal } from '../../src/features/calendar/components/CopyWorkoutModal';
import { CopyWeekModal } from '../../src/features/calendar/components/CopyWeekModal';
import { timeLabelOf } from '../../src/features/calendar/components/TimeField';
import { confirmAsync, appAlert } from '../../src/shared/feedback/appAlert';
import { useTabBarSpace } from '../../src/shared/hooks/useTabBarSpace';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The coach's week at a glance: every day with its sessions, and a quick way to move or copy one. */
export default function CoachWeekScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const tabBarSpace = useTabBarSpace(8);
  const user = useAuthStore((s) => s.user);
  const teams = useCoachStore((s) => s.teams);
  const fetchTeams = useCoachStore((s) => s.fetchTeams);
  const currentTeam = useCurrentTeam();
  const scopeTeamId = teams.length > 1 ? currentTeam?.id ?? null : null;

  const [monday, setMonday] = useState(() => workoutService.weekStart(new Date()));
  const [byDay, setByDay] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [mover, setMover] = useState<{ workout: any; mode: 'copy' | 'move' } | null>(null);
  const [showCopyWeek, setShowCopyWeek] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(false);
    try {
      setByDay(await workoutService.fetchWeekByDay(user.id, monday, scopeTeamId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, monday.getTime(), scopeTeamId]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchTeams();
      load();
    }, [load, fetchTeams, user?.id]),
  );
  const refreshControl = useRefresh(load);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayKey = dayKey(new Date());
  const sunday = days[6];
  const title = `${monday.getDate()} ${monday.getMonth() !== sunday.getMonth() ? MONTHS[monday.getMonth()] + ' ' : ''}– ${sunday.getDate()} ${MONTHS[sunday.getMonth()]}`;
  const isThisWeek = dayKey(monday) === dayKey(workoutService.weekStart(new Date()));
  const total = Object.values(byDay).reduce((a, l) => a + l.length, 0);

  const shiftWeek = (n: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setMonday((m) => {
      const x = new Date(m);
      x.setDate(x.getDate() + 7 * n);
      return x;
    });
  };

  const startMove = async (w: any, mode: 'copy' | 'move') => {
    if (mode === 'move' && (w.done_count ?? 0) > 0) {
      const ok = await confirmAsync({
        title: 'Séance déjà validée',
        message: `${w.done_count} athlète${w.done_count > 1 ? 's ont' : ' a'} déjà validé cette séance. Les résultats restent enregistrés, seul le jour prévu change.`,
        confirmText: 'Déplacer quand même',
      });
      if (!ok) return;
    }
    setMover({ workout: w, mode });
  };

  const handleDelete = async (w: any) => {
    try {
      await workoutService.deleteWorkout(w.id, w.group_assignment_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelected(null);
      load();
    } catch {
      appAlert('Erreur', 'Impossible de supprimer la séance.');
    }
  };

  const openDay = (d: Date) => router.push(`/(coach)/day/${dayKey(d)}`);

  return (
    <GlassScreen>
      <Header
        scrollY={scrollY}
        title="Semaine"
        showBackButton
        onBackPress={() => goBack(router, '/(coach)/calendar')}
      />

      <View style={[styles.nav, { borderBottomColor: theme.colors.hairline }]}>
        <IconButton icon="chevron-left" tone="plain" size={40} color={theme.colors.text} accessibilityLabel="Semaine précédente" onPress={() => shiftWeek(-1)} />
        <PressableScale
          haptic="selection"
          disabled={isThisWeek}
          onPress={() => {
            setLoading(true);
            setMonday(workoutService.weekStart(new Date()));
          }}
          accessibilityRole="button"
          accessibilityLabel={isThisWeek ? `Semaine du ${title}` : 'Revenir à cette semaine'}
          style={{ alignItems: 'center' }}
        >
          <Text style={[styles.navTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.navSub, { color: isThisWeek ? theme.colors.textMuted : theme.colors.sprintyBlue }]}>
            {isThisWeek ? 'Cette semaine' : 'Revenir à aujourd’hui'}
          </Text>
        </PressableScale>
        <IconButton icon="chevron-right" tone="plain" size={40} color={theme.colors.text} accessibilityLabel="Semaine suivante" onPress={() => shiftWeek(1)} />
      </View>

      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: tabBarSpace + 16 }}
      >
        <View style={styles.topRow}>
          <TeamSwitcher />
          <PressableScale
            haptic="light"
            onPress={() => setShowCopyWeek(true)}
            accessibilityRole="button"
            accessibilityLabel="Copier la semaine"
            style={[styles.chip, { backgroundColor: theme.colors.glassFill }]}
          >
            <Feather name="copy" size={13} color={theme.colors.sprintyBlue} />
            <Text style={[styles.chipText, { color: theme.colors.sprintyBlue }]}>Copier la semaine</Text>
          </PressableScale>
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <View style={[glassCard, styles.empty]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Impossible de charger la semaine</Text>
            <PressableScale onPress={() => { setLoading(true); load(); }} accessibilityRole="button">
              <Text style={[styles.chipText, { color: theme.colors.sprintyBlue }]}>Réessayer</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            {total === 0 && (
              <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                Rien de planifié cette semaine. Touche le « + » d’un jour pour programmer, ou copie une autre semaine.
              </Text>
            )}
            {days.map((d, i) => {
              const key = dayKey(d);
              const list = byDay[key] || [];
              const isToday = key === todayKey;
              return (
                <View key={key} style={styles.dayBlock}>
                  <View style={styles.dayHead}>
                    <View style={[styles.dayBadge, isToday && { backgroundColor: theme.colors.sprintyBlue }]}>
                      <Text style={[styles.dayBadgeText, { color: isToday ? '#FFFFFF' : theme.colors.textSecondary }]}>{DAYS[i]}</Text>
                      <Text style={[styles.dayNum, { color: isToday ? '#FFFFFF' : theme.colors.text }]}>{d.getDate()}</Text>
                    </View>
                    <Text style={[styles.dayCount, { color: theme.colors.textMuted }]}>
                      {list.length === 0 ? 'Rien de prévu' : `${list.length} séance${list.length > 1 ? 's' : ''}`}
                    </Text>
                    <IconButton
                      icon="plus"
                      tone="plain"
                      size={36}
                      color={theme.colors.sprintyBlue}
                      accessibilityLabel={`Planifier le ${DAYS[i]} ${d.getDate()}`}
                      onPress={() => openDay(d)}
                    />
                  </View>
                  {list.map((w) => (
                    <View key={w.group_assignment_id || w.id} style={{ marginBottom: 6 }}>
                      <WorkoutCard
                        time={timeLabelOf(w) || undefined}
                        title={w.type_seance}
                        status={w.status}
                        summary={
                          (w.athlete_count ?? 0) > 0
                            ? `${w.done_count ?? 0}/${w.athlete_count} athlète${w.athlete_count > 1 ? 's' : ''} ont validé`
                            : undefined
                        }
                        onPress={() => setSelected(w)}
                      />
                      <View style={styles.actions}>
                        <PressableScale haptic="selection" onPress={() => startMove(w, 'move')} accessibilityRole="button" accessibilityLabel={`Déplacer ${w.type_seance}`} style={styles.action}>
                          <Feather name="corner-up-right" size={13} color={theme.colors.sprintyBlue} />
                          <Text style={[styles.actionText, { color: theme.colors.sprintyBlue }]}>Déplacer</Text>
                        </PressableScale>
                        <PressableScale haptic="selection" onPress={() => startMove(w, 'copy')} accessibilityRole="button" accessibilityLabel={`Copier ${w.type_seance}`} style={styles.action}>
                          <Feather name="copy" size={13} color={theme.colors.sprintyBlue} />
                          <Text style={[styles.actionText, { color: theme.colors.sprintyBlue }]}>Copier</Text>
                        </PressableScale>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </Animated.ScrollView>

      <WorkoutDetailModal
        visible={!!selected}
        workout={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        onEdit={(w: any) => {
          setSelected(null);
          router.push(`/(coach)/day/${dayKey(new Date(w.date_prevue))}`);
        }}
      />

      <CopyWorkoutModal
        visible={!!mover}
        workout={mover?.workout}
        mode={mover?.mode}
        onClose={() => setMover(null)}
        onCopied={() => {
          setMover(null);
          load();
        }}
      />

      {user?.id ? (
        <CopyWeekModal
          visible={showCopyWeek}
          onClose={() => setShowCopyWeek(false)}
          coachId={user.id}
          teamId={scopeTeamId}
          day={monday}
          onCopied={load}
        />
      ) : null}
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  navTitle: { fontSize: 18, fontWeight: '800' },
  navSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '700' },
  dayBlock: { marginTop: 10 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dayBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dayNum: { fontSize: 15, fontWeight: '800' },
  dayCount: { flex: 1, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 6, paddingTop: 2, paddingBottom: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 14, fontWeight: '500', lineHeight: 20, paddingVertical: 8 },
});
