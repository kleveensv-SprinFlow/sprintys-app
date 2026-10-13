import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBodyStore } from '../../../store/bodyStore';
import { useAuthStore } from '../../../store/authStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard, DashboardCardHeader } from '../../../shared/components/DashboardCard';
import { WeightAreaChart, movingAverage, TrendPoint } from '../../body/components/WeightChart';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { MEAL_ACCENT_TINT } from '../../nutrition/nutritionTheme';

const day = 86400000;

function formatKg(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const BodyCompositionCard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, loadMetrics } = useBodyStore();

  useEffect(() => {
    if (user?.id) loadMetrics(user.id);
  }, [user?.id, refreshKey]);

  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const target = Number(user?.targetWeight || 0);

  const trend = useMemo(() => {
    if (!latest || metrics.length < 2) return null;
    const latestT = new Date(latest.created_at || '').getTime();
    if (!latestT) return null;
    const targetT = latestT - 30 * day;
    let ref = metrics[0];
    let best = Infinity;
    metrics.slice(0, -1).forEach((m) => {
      const t = new Date(m.created_at || '').getTime();
      const d = Math.abs(t - targetT);
      if (d < best) {
        best = d;
        ref = m;
      }
    });
    const refT = new Date(ref.created_at || '').getTime();
    const days = Math.max(1, Math.round((latestT - refT) / day));
    if (!refT || days < 1 || ref.weight == null) return null;
    return {
      diff: latest.weight - ref.weight,
      label: days >= 25 && days <= 40 ? 'sur 30 j' : `sur ${days} j`,
    };
  }, [metrics, latest]);

  const spark = useMemo(() => {
    if (!latest?.created_at) return [];
    const latestT = new Date(latest.created_at).getTime();
    const windowed = metrics.filter((m) => latestT - new Date(m.created_at || '').getTime() <= 30 * day);
    const source = windowed.length >= 2 ? windowed : metrics;
    const points: TrendPoint[] = source
      .filter((m) => m.weight != null && m.created_at)
      .map((m) => ({ t: new Date(m.created_at as string).getTime(), v: Number(m.weight) }));
    if (points.length < 2) return points.map((p) => p.v);
    return movingAverage(points);
  }, [metrics, latest]);

  const open = () => router.push('/(athlete)/body');
  const blue = theme.colors.sprintyBlue;

  if (!latest) {
    return (
      <View style={styles.wrapper}>
        <PressableScale style={glassCard} onPress={open}>
          <GlassSheen radius={22} />
          <DashboardCardHeader
            icon={<Feather name="trending-down" size={15} color={blue} />}
            label="Poids"
            tint={blue}
            showChevron={false}
          />
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Ajoute ta première pesée</Text>
            <View style={[styles.plus, { backgroundColor: MEAL_ACCENT_TINT }]}>
              <Feather name="plus" size={18} color={blue} />
            </View>
          </View>
        </PressableScale>
      </View>
    );
  }

  const fat = latest.body_fat != null ? Number(latest.body_fat) : null;
  const muscle = latest.muscle_mass_kg != null ? Number(latest.muscle_mass_kg) : null;
  const diff = trend?.diff ?? 0;
  const hasTrend = !!trend && Math.abs(diff) >= 0.05;
  // Good direction = toward the goal (or down when no goal is set)
  const towardGoal = target > 0 ? Math.abs(latest.weight - target) < Math.abs(latest.weight - diff - target) : diff < 0;
  const deltaColor = towardGoal ? blue : theme.colors.textSecondary;
  const goalMeta = target > 0
    ? Math.abs(latest.weight - target) <= 0.1
      ? 'Objectif atteint'
      : `Objectif ${target.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
    : undefined;

  return (
    <View style={styles.wrapper}>
      <PressableScale style={glassCard} onPress={open}>
        <GlassSheen radius={22} />
        <DashboardCardHeader
          icon={<Feather name={hasTrend && diff > 0 ? 'trending-up' : 'trending-down'} size={15} color={blue} />}
          label="Poids"
          tint={blue}
          meta={goalMeta}
        />

        <View style={styles.top}>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatKg(latest.weight)}
            <Text style={[styles.unit, { color: theme.colors.textSecondary }]}> kg</Text>
          </Text>
          {hasTrend && (
            <View style={[styles.deltaChip, { backgroundColor: towardGoal ? MEAL_ACCENT_TINT : theme.colors.glassFill }]}>
              <Feather name={diff < 0 ? 'arrow-down-right' : 'arrow-up-right'} size={13} color={deltaColor} />
              <Text style={[styles.delta, { color: deltaColor }]}>
                {diff < 0 ? '−' : '+'}
                {formatKg(Math.abs(diff))} kg · {trend!.label.replace('sur ', '')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chart}>
          <WeightAreaChart values={spark} color={blue} target={target > 0 ? target : null} />
        </View>

        {(fat != null || muscle != null) && (
          <View style={styles.chips}>
            {fat != null && (
              <View style={[styles.chip, { backgroundColor: theme.colors.glassFill }]}>
                <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>MG</Text>
                <Text style={[styles.chipValue, { color: theme.colors.text }]}>{formatKg(fat)} %</Text>
              </View>
            )}
            {muscle != null && (
              <View style={[styles.chip, { backgroundColor: theme.colors.glassFill }]}>
                <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Muscle</Text>
                <Text style={[styles.chipValue, { color: theme.colors.text }]}>{formatKg(muscle)} kg</Text>
              </View>
            )}
          </View>
        )}
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 6, marginBottom: 24 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  value: { fontSize: 34, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 16, fontWeight: '600', letterSpacing: 0 },
  deltaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  delta: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chart: { marginTop: 10, marginHorizontal: -4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipValue: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
