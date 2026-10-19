import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import type { CheckInData } from '../../../services/checkInService';
import { hoursLabel } from '../hoursLabel';

interface CheckInTrendProps {
  history: CheckInData[];
  today: string;
  days?: number;
  sleepGoal?: number;
}

const CHART_H = 84;
const SLEEP_H = 40;

const shift = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * 30 derniers jours : forme (courbe, trous les jours sans check-in) et heures de sommeil (barres, repère à
 * l'objectif). Sert à voir une tendance, pas à lire un chiffre précis.
 */
export const CheckInTrend = ({ history, today, days = 30, sleepGoal = 8 }: CheckInTrendProps) => {
  const theme = useTheme();
  const [w, setW] = useState(0);

  const series = useMemo(() => {
    const byDate = new Map(history.map((c) => [c.date, c]));
    return Array.from({ length: days }, (_, i) => byDate.get(shift(today, i - (days - 1))) ?? null);
  }, [history, today, days]);

  const filled = series.filter((c) => c?.health_score != null) as CheckInData[];
  if (filled.length < 3) return null; // pas assez de points pour parler de tendance

  const step = w > 0 ? w / (days - 1) : 0;
  // Échelle ajustée aux valeurs (au moins 20 points d'écart) : une forme entre 75 et 100 ne doit pas ressembler à une ligne plate
  const vals = filled.map((c) => c.health_score);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 20) {
    const mid = (hi + lo) / 2;
    lo = mid - 10;
    hi = mid + 10;
  }
  lo = Math.max(0, lo - 4);
  hi = Math.min(100, hi + 4);
  const yForm = (v: number) => CHART_H - 4 - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo || 1)) * (CHART_H - 8);

  // Courbe en segments : un trou (jour sans check-in) coupe la ligne
  let d = '';
  let pen = false;
  series.forEach((c, i) => {
    if (c?.health_score == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${(i * step).toFixed(1)},${yForm(c.health_score).toFixed(1)} `;
    pen = true;
  });
  const lastIdx = series.map((c) => c?.health_score != null).lastIndexOf(true);
  const avg = Math.round(filled.reduce((s, c) => s + c.health_score, 0) / filled.length);
  const sleeps = series.map((c) => (c?.sleep_hours != null ? Number(c.sleep_hours) : null));
  const sleepVals = sleeps.filter((v): v is number => v != null);
  const avgSleep = sleepVals.length ? sleepVals.reduce((s, v) => s + v, 0) / sleepVals.length : null;
  const maxSleep = Math.max(10, ...sleepVals);
  const ySleep = (v: number) => SLEEP_H - (v / maxSleep) * SLEEP_H;
  const barW = Math.max(2, step * 0.55);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const fmtH = hoursLabel;

  return (
    <View style={[glassCard, styles.card]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Forme · {days} derniers jours</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>moy. {avg} %</Text>
      </View>
      <View onLayout={onLayout} accessible accessibilityLabel={`Forme moyenne ${avg} % sur ${filled.length} check-ins`}>
        {w > 0 && (
          <Svg width={w} height={CHART_H}>
            {[lo, (lo + hi) / 2, hi].map((g) => (
              <Line key={g} x1={0} x2={w} y1={yForm(g)} y2={yForm(g)} stroke={theme.colors.hairline} strokeWidth={1} />
            ))}
            <Path d={d} stroke={theme.colors.sprintyBlue} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {lastIdx >= 0 && (
              <Circle cx={lastIdx * step} cy={yForm(series[lastIdx]!.health_score)} r={4} fill={theme.colors.sprintyBlue} stroke="#FFFFFF" strokeWidth={2} />
            )}
          </Svg>
        )}
      </View>

      {avgSleep !== null && (
        <>
          <View style={[styles.head, styles.sleepHead]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Sommeil</Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              moy. {fmtH(avgSleep)} · objectif {hoursLabel(sleepGoal)}
            </Text>
          </View>
          {w > 0 && (
            <Svg width={w} height={SLEEP_H} accessibilityLabel={`Sommeil moyen ${fmtH(avgSleep)}`}>
              {sleeps.map((v, i) =>
                v == null ? null : (
                  <Rect
                    key={i}
                    x={Math.min(w - barW, Math.max(0, i * step - barW / 2))}
                    y={ySleep(v)}
                    width={barW}
                    height={SLEEP_H - ySleep(v)}
                    rx={barW / 2}
                    fill={v >= sleepGoal - 0.5 ? theme.colors.success : v >= sleepGoal - 2 ? theme.colors.warning : theme.colors.error}
                    opacity={0.85}
                  />
                )
              )}
              <Line x1={0} x2={w} y1={ySleep(sleepGoal)} y2={ySleep(sleepGoal)} stroke={theme.colors.textMuted} strokeWidth={1} strokeDasharray="4 4" />
            </Svg>
          )}
        </>
      )}
      <View style={styles.axis}>
        <Text style={[styles.axisText, { color: theme.colors.textMuted }]}>il y a {days} j</Text>
        <Text style={[styles.axisText, { color: theme.colors.textMuted }]}>aujourd’hui</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8, marginBottom: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sleepHead: { marginTop: 8 },
  title: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 11 },
});
