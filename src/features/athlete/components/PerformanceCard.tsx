import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard, DashboardCardHeader } from '../../../shared/components/DashboardCard';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { performanceService, AthletePerformance } from '../../../services/performanceService';
import { formatValue, shortDate } from '../../performance/format';

/** Home card: the latest records and a way into the full progression screen. */
export const PerformanceCard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<AthletePerformance | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    performanceService
      .fetch(user.id, 4)
      .then((d) => {
        if (alive) {
          setData(d);
          setFailed(false);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [user?.id, refreshKey]);

  const blue = theme.colors.sprintyBlue;
  const gold = '#F59E0B';
  const open = () => router.push('/(athlete)/performance');
  // Nothing to show yet (or the request failed): the card stays out of the way rather than showing an error on the home
  if (failed || !data || data.records.length === 0) return null;

  const shown = data.recent_prs.length > 0 ? data.recent_prs.slice(0, 3) : null;
  const rows = shown ?? data.records.slice(0, 3).map((r) => ({ label: r.label, value: r.value, unit: r.unit, date: r.date }));

  return (
    <View style={styles.wrapper}>
      <PressableScale style={glassCard} onPress={open} accessibilityRole="button" accessibilityLabel="Ouvrir ma progression">
        <GlassSheen radius={22} />
        <DashboardCardHeader
          icon={<Feather name="award" size={15} color={shown ? gold : blue} />}
          label={shown ? 'Nouveaux records' : 'Mes records'}
          tint={shown ? gold : blue}
          meta="Progression"
        />
        {rows.map((r) => (
          <View key={`${r.label}${r.date}`} style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>{r.label}</Text>
            <Text style={[styles.value, { color: shown ? gold : theme.colors.text }]}>{formatValue(r.value, r.unit)}</Text>
            <Text style={[styles.date, { color: theme.colors.textMuted }]}>{shortDate(r.date)}</Text>
          </View>
        ))}
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 6, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  date: { fontSize: 12, fontWeight: '600', width: 40, textAlign: 'right' },
});
