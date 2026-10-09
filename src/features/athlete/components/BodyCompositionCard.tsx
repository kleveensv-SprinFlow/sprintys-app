import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBodyStore } from '../../../store/bodyStore';
import { useAuthStore } from '../../../store/authStore';
import { WeightSparkline, movingAverage, TrendPoint } from '../../body/components/WeightChart';

const day = 86400000;

function formatKg(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const BodyCompositionCard = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { metrics, loadMetrics } = useBodyStore();

  useEffect(() => {
    if (user?.id) loadMetrics(user.id);
  }, [user?.id]);

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
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          activeOpacity={0.85}
          onPress={open}
        >
          <View style={styles.emptyRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>Poids</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Ajoute ta première pesée</Text>
            </View>
            <View style={[styles.plus, { backgroundColor: blue }]}>
              <Feather name="plus" size={18} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const fat = latest.body_fat != null ? Number(latest.body_fat) : null;
  const muscle = latest.muscle_mass_kg != null ? Number(latest.muscle_mass_kg) : null;
  const remaining = target > 0 ? Math.abs(latest.weight - target) : null;
  const diff = trend?.diff ?? 0;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        activeOpacity={0.85}
        onPress={open}
      >
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>Poids</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {formatKg(latest.weight)}
              <Text style={[styles.unit, { color: theme.colors.textSecondary }]}> kg</Text>
            </Text>
            {trend && Math.abs(diff) >= 0.05 && (
              <View style={styles.deltaRow}>
                <Feather
                  name={diff < 0 ? 'trending-down' : 'trending-up'}
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={[styles.delta, { color: theme.colors.textSecondary }]}>
                  {formatKg(Math.abs(diff))} kg {trend.label}
                </Text>
              </View>
            )}
          </View>
          <WeightSparkline values={spark} color={blue} target={target > 0 ? target : null} />
        </View>

        {(fat != null || muscle != null) && (
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
            {fat != null ? `MG ${formatKg(fat)} %` : ''}
            {fat != null && muscle != null ? '  ·  ' : ''}
            {muscle != null ? `Muscle ${formatKg(muscle)} kg` : ''}
          </Text>
        )}

        {remaining != null && (
          <Text style={[styles.goal, { color: theme.colors.textSecondary }]}>
            {remaining <= 0.1 ? 'Objectif atteint' : `encore ${formatKg(remaining)} kg`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 24 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  kicker: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  unit: { fontSize: 16, fontWeight: '600' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  delta: { fontSize: 13, fontWeight: '600' },
  meta: { fontSize: 13, fontWeight: '500', marginTop: 12 },
  goal: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  emptyRow: { flexDirection: 'row', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
