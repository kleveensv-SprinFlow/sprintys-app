import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { useAuthStore } from '../../../store/authStore';
import { bodyService } from '../../../services/bodyService';
import { computeGoalProgress } from '../goalProgress';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

/** The colour warms up as the goal gets closer: blue, then turquoise, then green, then gold. */
const gradientFor = (progress: number, reached: boolean): [string, string] => {
  if (reached) return ['#F5B700', '#FFD54A'];
  if (progress < 0.34) return ['#0069E8', '#00B4D8'];
  if (progress < 0.67) return ['#00B4D8', '#10B981'];
  return ['#10B981', '#F5B700'];
};

/** "Mon objectif": starting weight, progress bar, target weight. Nothing else. */
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

  const steady = g.kind === 'maintain' || g.kind === 'recomp';
  const needsTarget = !steady && g.target == null;
  const canEdit = !readonly && !athleteId;
  const barW = fill.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width)] });
  const pct = Math.round(g.progress * 100);
  const colors = steady ? gradientFor(0.5, false) : gradientFor(g.progress, g.reached);

  if (needsTarget) {
    return (
      <PressableScale haptic="selection" disabled={!canEdit} onPress={() => router.push('/(athlete)/body')} style={[glassCard, styles.card, styles.row]}>
        <GlassSheen radius={22} />
        <Feather name="flag" size={16} color={theme.colors.sprintyBlue} />
        <Text style={styles.prompt}>Fixe ton poids cible pour suivre ton objectif</Text>
        {canEdit && <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />}
      </PressableScale>
    );
  }

  return (
    <View
      style={[glassCard, styles.card]}
      accessible
      accessibilityLabel={
        steady
          ? `Poids ${fmt(g.current)} kilos, repère ${fmt(g.target!)}`
          : `Objectif : départ ${fmt(g.start)} kilos, cible ${fmt(g.target!)} kilos, ${pct} pour cent atteint`
      }
    >
      <GlassSheen radius={22} />
      <View style={styles.row}>
        <View style={styles.end}>
          <Text style={styles.endValue}>{steady ? fmt(g.current) : fmt(g.start)}</Text>
          <Text style={styles.endUnit}>{steady ? 'kg actuel' : 'kg départ'}</Text>
        </View>

        <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          <Animated.View style={[styles.fillWrap, { width: barW }]}>
            <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Text style={[styles.pct, g.progress < 0.22 && styles.pctDark]}>{steady ? (g.inZone ? 'Stable' : '± 1 kg') : `${pct} %`}</Text>
        </View>

        <View style={[styles.end, styles.endRight]}>
          <Text style={styles.endValue}>{fmt(g.target!)}</Text>
          <Text style={styles.endUnit}>{steady ? 'kg repère' : 'kg cible'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prompt: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  end: { minWidth: 56 },
  endRight: { alignItems: 'flex-end' },
  endValue: { fontSize: 17, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.3 },
  endUnit: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  track: { flex: 1, height: 22, borderRadius: 11, backgroundColor: theme.colors.glassFill, overflow: 'hidden', justifyContent: 'center' },
  fillWrap: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 11, overflow: 'hidden' },
  pct: { alignSelf: 'center', fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  pctDark: { color: theme.colors.text },
});
