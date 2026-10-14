import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { useAuthStore } from '../../../store/authStore';
import { bodyService } from '../../../services/bodyService';
import { computeGoalProgress } from '../goalProgress';

const BLUE = theme.colors.sprintyBlue;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

const TITLES = { cut: 'Perte de poids', bulk: 'Prise de masse', recomp: 'Recomposition', maintain: 'Maintien' } as const;
const ICONS = { cut: 'trending-down', bulk: 'trending-up', recomp: 'refresh-cw', maintain: 'minus' } as const;

/** "Mon objectif": where the weight stands between start and target, as a progress bar. */
export const GoalProgressCard: React.FC<{ athleteProfile?: any; athleteId?: string; readonly?: boolean }> = ({
  athleteProfile,
  athleteId,
  readonly,
}) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = athleteProfile || user;
  const id = athleteId || user?.id;

  const [weights, setWeights] = useState<{ weight: number; created_at: string }[]>([]);
  const [width, setWidth] = useState(0);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    bodyService
      .fetchMetrics(id)
      .then((rows: any[]) => {
        if (alive) setWeights((rows || []).filter((r) => r?.weight != null).map((r) => ({ weight: Number(r.weight), created_at: r.created_at })));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);

  const sorted = [...weights].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latest = sorted.length ? sorted[sorted.length - 1].weight : Number(profile?.weight) || null;
  const first = sorted.length ? sorted[0].weight : null;

  const g = computeGoalProgress({
    objective: profile?.objective,
    startWeight: profile?.startWeight ?? profile?.start_weight ?? first,
    currentWeight: latest,
    targetWeight: profile?.targetWeight ?? profile?.target_weight,
    weeklyKg: profile?.weeklyWeightGoal ?? profile?.weekly_weight_goal,
  });

  useEffect(() => {
    Animated.timing(fill, { toValue: g?.progress ?? 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [g?.progress]);

  if (!g) return null;

  const needsTarget = (g.kind === 'cut' || g.kind === 'bulk') && g.target == null;
  const pct = Math.round(g.progress * 100);
  const barW = fill.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width)] });

  let headline = '';
  let sub = '';
  if (needsTarget) {
    headline = 'Fixe ton poids cible';
    sub = 'Avec un poids de départ et un poids visé, tu suis ta progression ici.';
  } else if (g.kind === 'maintain' || g.kind === 'recomp') {
    headline = g.inZone ? 'Poids stable' : 'Poids à surveiller';
    sub = `${fmt(g.current)} kg · repère ${fmt(g.target!)} kg (± 1 kg)`;
  } else if (g.reached) {
    headline = 'Objectif atteint';
    sub = `${fmt(g.current)} kg · cible ${fmt(g.target!)} kg`;
  } else if (g.wrongWay) {
    headline = `${fmt(g.remainingKg!)} kg pour atteindre ${fmt(g.target!)} kg`;
    sub = `Le poids va dans l’autre sens pour l’instant (${fmt(g.current)} kg). Pas de panique, regarde la tendance sur plusieurs semaines.`;
  } else {
    headline = `Encore ${fmt(g.remainingKg!)} kg`;
    sub = `${fmt(g.start)} → ${fmt(g.current)} kg, cible ${fmt(g.target!)} kg${
      g.weeksLeft ? ` · environ ${g.weeksLeft} semaine${g.weeksLeft > 1 ? 's' : ''} à ton rythme` : ''
    }`;
  }

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <PressableScale
      haptic="selection"
      disabled={readonly || !!athleteId}
      onPress={() => router.push('/(athlete)/body')}
      style={[glassCard, styles.card]}
      accessibilityRole="button"
      accessibilityLabel={`Mon objectif : ${TITLES[g.kind]}. ${headline}`}
    >
      <GlassSheen radius={22} />
      <View style={styles.head}>
        <View style={styles.badge}>
          <Feather name={ICONS[g.kind]} size={16} color={BLUE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>MON OBJECTIF</Text>
          <Text style={styles.title}>{TITLES[g.kind]}</Text>
        </View>
        {!needsTarget && g.kind !== 'maintain' && g.kind !== 'recomp' && <Text style={styles.pct}>{pct} %</Text>}
        {(g.kind === 'maintain' || g.kind === 'recomp') && !needsTarget && (
          <Feather name={g.inZone ? 'check-circle' : 'alert-circle'} size={20} color={g.inZone ? theme.colors.success : theme.colors.warning} />
        )}
      </View>

      <View style={styles.track} onLayout={onLayout}>
        <Animated.View style={[styles.fill, { width: barW, backgroundColor: g.reached ? theme.colors.success : BLUE }]} />
      </View>
      {!needsTarget && g.kind !== 'maintain' && g.kind !== 'recomp' && (
        <View style={styles.ends}>
          <Text style={styles.endText}>{fmt(g.start)} kg</Text>
          <Text style={styles.endText}>{g.target ? `${fmt(g.target)} kg` : ''}</Text>
        </View>
      )}

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>
      {needsTarget && !readonly && !athleteId && <Text style={styles.link}>Définir mon poids cible</Text>}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 0.6 },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  pct: { fontSize: 22, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.4 },
  track: { height: 12, borderRadius: 6, backgroundColor: theme.colors.glassFill, overflow: 'hidden', marginTop: 4 },
  fill: { height: 12, borderRadius: 6 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  endText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  headline: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  sub: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary },
  link: { fontSize: 14, fontWeight: '800', color: BLUE },
});
