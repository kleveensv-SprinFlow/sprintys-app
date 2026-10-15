import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { PressableScale } from '../../../shared/components/PressableScale';
import { alertsService, TeamAlert } from '../../../services/alertsService';

/** « À surveiller » on the coach home: factual reasons, one tap to the athlete. Stays out of the way when all is well. */
export const TeamAlertsCard = ({ teamId, refreshKey = 0 }: { teamId?: string; refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const [alerts, setAlerts] = useState<TeamAlert[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    try {
      setAlerts(await alertsService.fetchTeamAlerts(teamId));
    } catch {
      setAlerts([]);
    }
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (alerts.length === 0) return null;
  const shown = expanded ? alerts : alerts.slice(0, 3);
  const red = theme.colors.error;
  const amber = theme.colors.warning;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>À SURVEILLER</Text>
      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />
        {shown.map((a, i) => (
          <PressableScale
            key={a.athlete_id}
            onPress={() => router.push(`/(coach)/athlete/${a.athlete_id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${a.name} : ${a.reasons.map((r) => `${r.label} ${r.detail}`).join(', ')}`}
            style={[styles.row, i > 0 && { borderTopColor: theme.colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}
          >
            <View style={[styles.dot, { backgroundColor: a.severity === 'high' ? red : amber }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{a.name}</Text>
              <Text style={[styles.reasons, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {a.reasons.map((r) => `${r.label} · ${r.detail}`).join('   ')}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
          </PressableScale>
        ))}
        {alerts.length > 3 && (
          <PressableScale onPress={() => setExpanded((v) => !v)} accessibilityRole="button" style={styles.more}>
            <Text style={[styles.moreText, { color: theme.colors.sprintyBlue }]}>
              {expanded ? 'Réduire' : `Voir les ${alerts.length - 3} autres`}
            </Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 8, marginBottom: 10, paddingHorizontal: 4 },
  card: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 16, fontWeight: '700' },
  reasons: { fontSize: 13, fontWeight: '500', marginTop: 2, lineHeight: 18 },
  more: { alignItems: 'center', paddingVertical: 10 },
  moreText: { fontSize: 14, fontWeight: '700' },
});
