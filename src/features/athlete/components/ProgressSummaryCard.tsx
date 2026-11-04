import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useBodyStore } from '../../../store/bodyStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { glassCard } from '../../../shared/components/DashboardCard';
import { GlassSheen } from '../../../shared/components/GlassSheen';
import { performanceService, AthletePerformance } from '../../../services/performanceService';
import { formatValue, shortDate } from '../../performance/format';
import { isMinorAthlete } from '../../../legal/age';
import { useToday } from '../../../shared/hooks/useToday';
import { summarizeWeight } from '../weightSummary';

const kg = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * « Ma progression », always visible and compact: the latest record, then weight.
 * The weight line shows the value first, how old it is, and a + button that opens the weighing sheet directly:
 * the usual gesture is one tap. The detailed charts stay one tap away (Performance, Body).
 * Before 18 the 30-day change is not shown (no weight-trend cue for minors). A failed records load says so, with a retry.
 */
export const ProgressSummaryCard = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { metrics, loadMetrics } = useBodyStore();
  const today = useToday();
  const [perf, setPerf] = useState<AthletePerformance | null>(null);
  const [perfFailed, setPerfFailed] = useState(false);
  const isMinor = isMinorAthlete(user);

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

  // `today` is a dependency: « hier » becomes « il y a 2 jours » after midnight without a reload
  const weight = useMemo(() => summarizeWeight(metrics, new Date(today.getTime() + 12 * 3600000)), [metrics, today]);

  const pr = perf?.recent_prs?.[0] ?? perf?.records?.[0];
  const isNewPr = !!perf?.recent_prs?.length;
  const prTint = isNewPr ? theme.colors.record : theme.colors.sprintyBlue;

  const openBody = () => router.push('/(athlete)/body');
  const openWeighIn = () => router.push({ pathname: '/(athlete)/body', params: { new: '1' } } as never);

  const diffText =
    weight && !isMinor && weight.diff != null ? `${weight.diff < 0 ? '−' : '+'}${kg(Math.abs(weight.diff))} kg en 30 jours` : null;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
        Ma progression
      </Text>
      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />

        {/* Records */}
        {perfFailed ? (
          <PressableScale haptic="selection" activeScale={0.985} onPress={loadPerf} accessibilityRole="button" accessibilityLabel="Records indisponibles. Réessayer" style={[styles.row, styles.divider, { borderBottomColor: theme.colors.hairline }]}>
            <View style={[styles.icon, { backgroundColor: theme.colors.neutralTint }]}>
              <Feather name="award" size={16} color={theme.colors.textMuted} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Records indisponibles</Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>Touche pour réessayer</Text>
            </View>
            <Feather name="refresh-cw" size={17} color={theme.colors.textMuted} />
          </PressableScale>
        ) : perf ? (
          <PressableScale
            haptic="selection"
            activeScale={0.985}
            onPress={() => router.push('/(athlete)/performance')}
            accessibilityRole="button"
            accessibilityLabel={pr ? `${isNewPr ? 'Nouveau record' : 'Dernier record'} : ${pr.label}, ${formatValue(pr.value, pr.unit)}. Voir ma progression` : 'Records : ils apparaîtront après tes premiers chronos. Voir ma progression'}
            style={[styles.row, styles.divider, { borderBottomColor: theme.colors.hairline }]}
          >
            <View style={[styles.icon, { backgroundColor: `${prTint}1A` }]}>
              <Feather name="award" size={16} color={prTint} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {pr ? (isNewPr ? 'Nouveau record' : 'Dernier record') : 'Records'}
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {pr ? `${pr.label} · ${shortDate(pr.date)}` : 'Ils apparaîtront après tes premiers chronos'}
              </Text>
            </View>
            {!!pr && <Text style={[styles.value, { color: isNewPr ? theme.colors.record : theme.colors.text }]}>{formatValue(pr.value, pr.unit)}</Text>}
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </PressableScale>
        ) : null}

        {/* Weight: value first, then its age, and a + that opens the weighing sheet */}
        <View style={styles.row}>
          <PressableScale
            haptic="selection"
            activeScale={0.985}
            onPress={openBody}
            containerStyle={styles.weightMainWrap}
            accessibilityRole="button"
            accessibilityLabel={
              weight
                ? `Poids : ${kg(weight.value)} kilos, pesé ${weight.when}${diffText ? `, ${diffText}` : ''}. Voir le suivi du poids`
                : 'Poids : aucune pesée. Voir le suivi du poids'
            }
            style={styles.weightMain}
          >
            <View style={[styles.icon, { backgroundColor: `${theme.colors.sprintyBlue}1A` }]}>
              <Ionicons name="scale-outline" size={18} color={theme.colors.sprintyBlue} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Poids</Text>
              {weight ? (
                <>
                  <Text style={[styles.weightValue, { color: theme.colors.text }]} numberOfLines={1}>
                    {kg(weight.value)} kg
                    <Text style={[styles.weightWhen, { color: weight.stale ? theme.colors.warning : theme.colors.textSecondary }]}>{`  ·  ${weight.when}`}</Text>
                  </Text>
                  {!!diffText && (
                    <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {diffText}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>Ajoute ta première pesée</Text>
              )}
            </View>
          </PressableScale>

          <PressableScale
            haptic="light"
            onPress={openWeighIn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une pesée"
            style={[styles.plus, weight?.stale || !weight ? { backgroundColor: theme.colors.sprintyBlue } : { backgroundColor: `${theme.colors.sprintyBlue}1A` }]}
          >
            <Feather name="plus" size={20} color={weight?.stale || !weight ? theme.colors.onAccent : theme.colors.sprintyBlue} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 24 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10, marginLeft: 4 },
  card: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  value: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  // The + stays on the right edge: the row takes all the room left by the button
  weightMainWrap: { flex: 1, minWidth: 0 },
  weightMain: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  weightValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'], marginTop: 1 },
  weightWhen: { fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
