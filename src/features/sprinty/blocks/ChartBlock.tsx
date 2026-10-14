import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { theme } from '../../../core/theme';
import type { UiBlock } from '../types';

type ChartData = Extract<UiBlock, { type: 'chart' }>;

export const SERIES_COLORS = ['#0069E8', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];
const HEIGHT = 170;
const PAD = { top: 14, right: 12, bottom: 22, left: 34 };

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const r = raw / pow;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * pow;
}
const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString().replace('.', ','));

/** Line, bar or multi-series comparison computed by the server from real data. */
export function ChartBlock({ data }: { data: ChartData }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const series = data.series.filter((s) => s.points.length);
  const multi = series.length > 1;
  const kind = multi ? 'line' : data.kind;

  // Shared x axis: every date present in any series
  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort(), [series]);
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (kind === 'bar') min = Math.min(0, min);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= kind === 'bar' ? 0 : span * 0.12;
  max += span * 0.12;
  // Round the axis to readable steps
  const step = niceStep((max - min) / 2);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const xPos = (x: string) => PAD.left + (xs.length <= 1 ? innerW / 2 : (xs.indexOf(x) / (xs.length - 1)) * innerW);
  const yPos = (y: number) => PAD.top + innerH - ((y - min) / (max - min)) * innerH;
  const grid = [min, (min + max) / 2, max];

  const single = !multi ? series[0] : null;
  const first = single?.points[0];
  const last = single?.points[single.points.length - 1];
  // Noisy daily values: compare the average of the first and last few points rather than two single days
  const n = single?.points.length ?? 0;
  const k = n >= 9 ? 3 : n >= 4 ? 2 : 1;
  const mean = (pts: { y: number }[]) => pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const delta = single && n > 1 ? mean(single.points.slice(-k)) - mean(single.points.slice(0, k)) : null;
  const deltaGood = delta == null || data.better == null ? null : data.better === 'higher' ? delta >= 0 : delta <= 0;

  const pick = (locX: number) => {
    if (!xs.length || width === 0) return;
    const ratio = (locX - PAD.left) / innerW;
    setSelected(Math.max(0, Math.min(xs.length - 1, Math.round(ratio * (xs.length - 1)))));
  };
  const selX = selected != null ? xs[selected] : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{data.title}</Text>
      {single && last ? (
        <View style={styles.headline}>
          <Text style={styles.big}>
            {fmt(last.y)}
            <Text style={styles.unit}> {data.unit}</Text>
          </Text>
          {delta != null && (
            <View
              style={[
                styles.delta,
                { backgroundColor: deltaGood == null ? theme.colors.glassFill : deltaGood ? 'rgba(0,105,232,0.1)' : 'rgba(239,68,68,0.1)' },
              ]}
            >
              <Text style={[styles.deltaText, { color: deltaGood == null ? theme.colors.textSecondary : deltaGood ? theme.colors.sprintyBlue : theme.colors.error }]}>
                {delta > 0 ? '+' : ''}
                {fmt(delta)} {k > 1 ? 'en tendance' : `depuis le ${shortDate(first!.x)}`}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <Pressable onLayout={onLayout} onPress={(e) => pick(e.nativeEvent.locationX)} style={{ height: HEIGHT }} accessibilityLabel={`Graphique : ${data.title}`}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={SERIES_COLORS[0]} stopOpacity={0.22} />
                <Stop offset="1" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((g, i) => (
              <React.Fragment key={i}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={yPos(g)} y2={yPos(g)} stroke={theme.colors.hairline} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={yPos(g) + 4} fontSize={10} fill={theme.colors.textMuted} textAnchor="end">
                  {fmt(g)}
                </SvgText>
              </React.Fragment>
            ))}
            {xs.length > 0 && (
              <>
                <SvgText x={PAD.left} y={HEIGHT - 6} fontSize={10} fill={theme.colors.textMuted} textAnchor="start">
                  {shortDate(xs[0])}
                </SvgText>
                {xs.length > 1 && (
                  <SvgText x={width - PAD.right} y={HEIGHT - 6} fontSize={10} fill={theme.colors.textMuted} textAnchor="end">
                    {shortDate(xs[xs.length - 1])}
                  </SvgText>
                )}
              </>
            )}

            {kind === 'bar' && single
              ? single.points.map((p) => {
                  const bw = Math.max(3, Math.min(22, (innerW / Math.max(1, xs.length)) * 0.6));
                  const y = yPos(p.y);
                  const base = yPos(Math.max(min, 0));
                  return (
                    <Rect
                      key={p.x}
                      x={xPos(p.x) - bw / 2}
                      y={Math.min(y, base)}
                      width={bw}
                      height={Math.max(2, Math.abs(base - y))}
                      rx={Math.min(4, bw / 2)}
                      fill={selX === p.x ? theme.colors.text : SERIES_COLORS[0]}
                    />
                  );
                })
              : series.map((s, si) => {
                  const color = SERIES_COLORS[si % SERIES_COLORS.length];
                  const pts = s.points.map((p) => [xPos(p.x), yPos(p.y)] as const);
                  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                  const lastPt = pts[pts.length - 1];
                  return (
                    <React.Fragment key={s.name}>
                      {!multi && pts.length > 1 && (
                        <Path d={`${d} L${lastPt[0]},${PAD.top + innerH} L${pts[0][0]},${PAD.top + innerH} Z`} fill="url(#area)" />
                      )}
                      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                      {pts.length <= 12 && pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.5} fill={color} />)}
                      <Circle cx={lastPt[0]} cy={lastPt[1]} r={4.5} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
                    </React.Fragment>
                  );
                })}

            {selX && (
              <Line x1={xPos(selX)} x2={xPos(selX)} y1={PAD.top} y2={PAD.top + innerH} stroke={theme.colors.textMuted} strokeDasharray="3,3" />
            )}
          </Svg>
        )}
      </Pressable>

      {selX && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{shortDate(selX)}</Text>
          {series.map((s, si) => {
            const p = s.points.find((q) => q.x === selX);
            if (!p) return null;
            return (
              <Text key={s.name} style={styles.tooltipValue}>
                <Text style={{ color: SERIES_COLORS[si % SERIES_COLORS.length] }}>● </Text>
                {multi ? `${s.name} : ` : ''}
                {fmt(p.y)} {data.unit}
              </Text>
            );
          })}
        </View>
      )}

      {multi && (
        <View style={styles.legend}>
          {series.map((s, si) => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SERIES_COLORS[si % SERIES_COLORS.length] }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {s.name}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.hint}>Touche le graphique pour lire une valeur.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    padding: 14,
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  headline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  big: { fontSize: 26, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.5 },
  unit: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  delta: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  deltaText: { fontSize: 12, fontWeight: '700' },
  tooltip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  tooltipDate: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  tooltipValue: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '48%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  hint: { fontSize: 11, color: theme.colors.textMuted },
});
