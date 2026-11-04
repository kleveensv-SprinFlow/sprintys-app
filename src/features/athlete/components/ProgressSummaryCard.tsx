import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useBodyStore } from '../../../store/bodyStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard } from '../../../shared/components/DashboardCard';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { performanceService, AthletePerformance } from '../../../services/performanceService';
import { formatValue, shortDate } from '../../performance/format';

const DAY = 86400000;
const kg = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Row = {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  title: string;
  value: string;
  sub?: string;
  onPress: () => void;
  a11y: string;
};

/**
 * « Ma progression », always visible and compact: one line for the latest record, one for weight.
 * The detailed charts stay one tap away (Performance, Body). A failed load says so, with a retry, instead of vanishing.
 * Weight is shown without goal or « good direction » colouring: neutral for everyone, and no weight-loss cue for minors.
 */
export const ProgressSummaryCard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { metrics, loadMetrics } = useBodyStore();
  const [perf, setPerf] = useState<AthletePerformance | null>(null);
  const [perfFailed, setPerfFailed] = useState(false);

  const loadPerf = useCallback(() => {
    if (!user?.id) return () => undefined;
    let alive = true;
    setPerfFailed(false);
    performanceService
      .fetch(user.id, 4)
      .then((d) => alive && setPerf(d))
      .catch(() => alive && setPerfFailed(true));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => loadPerf(), [loadPerf, refreshKey]);
  useEffect(() => {
    if (user?.id) loadMetrics(user.id);
  }, [user?.id, refreshKey]);

  // Weight: latest value and change over about 30 days
  const weight = useMemo(() => {
    const latest = metrics.length ? metrics[metrics.length - 1] : null;
    if (!latest || latest.weight == null) return null;
    const latestT = new Date(latest.created_at || '').getTime();
    let diff: number | null = null;
    if (latestT && metrics.length > 1) {
      const ref = metrics
        .slice(0, -1)
        .filter((m) => m.weight != null && m.created_at)
        .reduce<{ m: (typeof metrics)[number] | null; d: number }>(
          (best, m) => {
            const d = Math.abs(new Date(m.created_at as string).getTime() - (latestT - 30 * DAY));
            return d < best.d ? { m, d } : best;
          },
          { m: null, d: Infinity },
        ).m;
      if (ref) diff = Number(latest.weight) - Number(ref.weight);
    }
    return { value: Number(latest.weight), diff, date: latest.created_at as string };
  }, [metrics]);

  const rows: Row[] = [];

  // Records
  const pr = perf?.recent_prs?.[0] ?? perf?.records?.[0];
  const isNewPr = !!perf?.recent_prs?.length;
  if (perfFailed) {
    rows.push({
      icon: 'award',
      tint: theme.colors.textMuted,
      title: 'Records indisponibles',
      value: 'Réessayer',
      onPress: loadPerf,
      a11y: 'Records indisponibles. Réessayer',
    });
  } else if (pr) {
    rows.push({
      icon: 'award',
      tint: isNewPr ? theme.colors.record : theme.colors.sprintyBlue,
      title: isNewPr ? 'Nouveau record' : 'Dernier record',
      value: formatValue(pr.value, pr.unit),
      sub: `${pr.label} · ${shortDate(pr.date)}`,
      onPress: () => router.push('/(athlete)/performance'),
      a11y: `${isNewPr ? 'Nouveau record' : 'Dernier record'} : ${pr.label}, ${formatValue(pr.value, pr.unit)}. Voir ma progression`,
    });
  } else if (perf) {
    rows.push({
      icon: 'award',
      tint: theme.colors.sprintyBlue,
      title: 'Records',
      value: '',
      sub: 'Ils apparaîtront après tes premiers chronos',
      onPress: () => router.push('/(athlete)/performance'),
      a11y: 'Records : ils apparaîtront après tes premiers chronos',
    });
  }

  // Weight
  if (weight) {
    const showDiff = weight.diff != null && Math.abs(weight.diff) >= 0.05;
    const diffText = showDiff ? `${weight.diff! < 0 ? '−' : '+'}${kg(Math.abs(weight.diff!))} kg sur 30 j` : `Pesée du ${shortDate(weight.date)}`;
    rows.push({
      icon: 'bar-chart-2',
      tint: theme.colors.sprintyBlue,
      title: 'Poids',
      value: `${kg(weight.value)} kg`,
      sub: diffText,
      onPress: () => router.push('/(athlete)/body'),
      a11y: `Poids : ${kg(weight.value)} kilos, ${diffText}. Voir le suivi du corps`,
    });
  } else {
    rows.push({
      icon: 'plus',
      tint: theme.colors.sprintyBlue,
      title: 'Poids',
      value: '',
      sub: 'Ajoute ta première pesée',
      onPress: () => router.push('/(athlete)/body'),
      a11y: 'Ajouter ma première pesée',
    });
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
        Ma progression
      </Text>
      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />
        {rows.map((r, i) => (
          <PressableScale
            key={r.title}
            haptic="selection"
            activeScale={0.985}
            onPress={r.onPress}
            accessibilityRole="button"
            accessibilityLabel={r.a11y}
            style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline }]}
          >
            <View style={[styles.icon, { backgroundColor: `${r.tint}1A` }]}>
              <Feather name={r.icon} size={16} color={r.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              {!!r.sub && (
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {r.sub}
                </Text>
              )}
            </View>
            {!!r.value && <Text style={[styles.value, { color: r.title === 'Nouveau record' ? theme.colors.record : theme.colors.text }]}>{r.value}</Text>}
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 24 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10, marginLeft: 4 },
  card: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  value: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
