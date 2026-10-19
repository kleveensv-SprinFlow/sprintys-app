import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Animated, Easing, AccessibilityInfo } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { theme } from '../../../core/theme';
import type { UiBlock } from '../types';
import { fmtNum, polylineLength, shortDate, trend, xTickIndexes, yDomain, yTicks } from './chartModel';

type ChartData = Extract<UiBlock, { type: 'chart' }>;

export const SERIES_COLORS = ['#0069E8', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];
const HEIGHT = 190;
const PAD = { top: 18, right: 14, bottom: 24, left: 38 };
const TIP_W = 132;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Graphique de Sprinty (valeurs réelles calculées par le serveur) : la courbe se dessine à l'ouverture, une bulle
 * donne la valeur du point touché (on peut glisser le doigt), ligne de repère pour un objectif ou un record.
 */
export function ChartBlock({ data }: { data: ChartData }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const draw = useRef(new Animated.Value(0)).current;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const series = data.series.filter((s) => s.points.length);
  const multi = series.length > 1;
  const kind = multi ? 'line' : data.kind;
  const reference = data.reference && Number.isFinite(data.reference.value) ? data.reference : null;

  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort(), [series]);
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  const { min, max, step } = yDomain(ys, kind, reference?.value);
  const ticks = yTicks(min, max, step);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const xPos = (x: string) => PAD.left + (xs.length <= 1 ? innerW / 2 : (xs.indexOf(x) / (xs.length - 1)) * innerW);
  const yPos = (y: number) => PAD.top + innerH - ((y - min) / (max - min)) * innerH;

  const single = !multi ? series[0] : null;
  const last = single?.points[single.points.length - 1];
  const tr = single ? trend(single.points.map((p) => p.y)) : null;
  const trendGood = tr == null || data.better == null ? null : data.better === 'higher' ? tr.delta >= 0 : tr.delta <= 0;

  useEffect(() => {
    if (!width) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!alive) return;
        if (reduced) draw.setValue(1);
        else Animated.timing(draw, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      })
      .catch(() => draw.setValue(1));
    return () => {
      alive = false;
    };
  }, [width > 0]);

  const pick = (locX: number) => {
    if (!xs.length || width === 0) return;
    const ratio = (locX - PAD.left) / innerW;
    setSelected(Math.max(0, Math.min(xs.length - 1, Math.round(ratio * (xs.length - 1)))));
    setTouched(true);
  };
  const selX = selected != null ? xs[selected] : null;
  const tipLeft = selX ? Math.max(0, Math.min(width - TIP_W, xPos(selX) - TIP_W / 2)) : 0;
  const showBarLabels = kind === 'bar' && single && single.points.length <= 8;

  // Résumé lu par le lecteur d'écran
  const a11y = single && last
    ? `${data.title} : dernière valeur ${fmtNum(last.y)} ${data.unit}${tr ? `, tendance ${tr.delta >= 0 ? 'en hausse' : 'en baisse'} de ${fmtNum(Math.abs(tr.delta))}` : ''}.`
    : `${data.title} : comparaison de ${series.map((s) => s.name).join(', ')}.`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{data.title}</Text>
      {single && last ? (
        <View style={styles.headline}>
          <Text style={styles.big}>
            {fmtNum(last.y)}
            <Text style={styles.unit}> {data.unit}</Text>
          </Text>
          {tr && (
            <View style={[styles.delta, { backgroundColor: trendGood == null ? theme.colors.glassFill : trendGood ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)' }]}>
              <Text style={[styles.deltaText, { color: trendGood == null ? theme.colors.textSecondary : trendGood ? '#059669' : theme.colors.error }]}>
                {tr.delta > 0 ? '▲ +' : tr.delta < 0 ? '▼ ' : ''}
                {fmtNum(tr.delta)} {tr.window > 1 ? 'en tendance' : `depuis le ${shortDate(single.points[0].x)}`}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View
        onLayout={onLayout}
        style={{ height: HEIGHT }}
        // Le doigt posé lit une valeur ; un défilement vertical reste possible (le ScrollView reprend la main)
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderTerminationRequest={() => true}
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11y}
      >
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={SERIES_COLORS[0]} stopOpacity={0.2} />
                <Stop offset="1" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <SvgText x={PAD.left - 6} y={10} fontSize={10} fontWeight="700" fill={theme.colors.textMuted} textAnchor="end">
              {data.unit}
            </SvgText>
            {ticks.map((g) => (
              <React.Fragment key={g}>
                <Line x1={PAD.left} x2={width - PAD.right} y1={yPos(g)} y2={yPos(g)} stroke={theme.colors.hairline} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={yPos(g) + 4} fontSize={10} fill={theme.colors.textMuted} textAnchor="end">
                  {fmtNum(g)}
                </SvgText>
              </React.Fragment>
            ))}
            {xTickIndexes(xs.length).map((i, k, arr) => (
              <SvgText
                key={i}
                x={xPos(xs[i])}
                y={HEIGHT - 6}
                fontSize={10}
                fill={theme.colors.textMuted}
                textAnchor={arr.length > 1 && k === 0 ? 'start' : arr.length > 1 && k === arr.length - 1 ? 'end' : 'middle'}
              >
                {shortDate(xs[i])}
              </SvgText>
            ))}

            {reference && (
              <>
                <Line x1={PAD.left} x2={width - PAD.right} y1={yPos(reference.value)} y2={yPos(reference.value)} stroke="#10B981" strokeWidth={1.5} strokeDasharray="5,4" />
                <SvgText x={width - PAD.right} y={yPos(reference.value) - 5} fontSize={10} fontWeight="700" fill="#059669" textAnchor="end">
                  {`${reference.label} ${fmtNum(reference.value)}`}
                </SvgText>
              </>
            )}

            {kind === 'bar' && single
              ? single.points.map((p) => {
                  const bw = Math.max(4, Math.min(24, (innerW / Math.max(1, xs.length)) * 0.6));
                  const y = yPos(p.y);
                  const base = yPos(Math.max(min, 0));
                  const sel = selX === p.x;
                  return (
                    <React.Fragment key={p.x}>
                      <Rect x={xPos(p.x) - bw / 2} y={Math.min(y, base)} width={bw} height={Math.max(2, Math.abs(base - y))} rx={Math.min(5, bw / 2)} fill={sel ? theme.colors.text : SERIES_COLORS[0]} opacity={selX && !sel ? 0.45 : 1} />
                      {showBarLabels && (
                        <SvgText x={xPos(p.x)} y={Math.min(y, base) - 4} fontSize={10} fontWeight="700" fill={theme.colors.textSecondary} textAnchor="middle">
                          {fmtNum(p.y)}
                        </SvgText>
                      )}
                    </React.Fragment>
                  );
                })
              : series.map((s, si) => {
                  const color = SERIES_COLORS[si % SERIES_COLORS.length];
                  const pts = s.points.map((p) => [xPos(p.x), yPos(p.y)] as const);
                  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
                  const lastPt = pts[pts.length - 1];
                  const len = Math.max(1, polylineLength(pts));
                  return (
                    <React.Fragment key={s.name}>
                      {!multi && pts.length > 1 && (
                        <Path d={`${d} L${lastPt[0]},${PAD.top + innerH} L${pts[0][0]},${PAD.top + innerH} Z`} fill="url(#area)" />
                      )}
                      <AnimatedPath
                        d={d}
                        stroke={color}
                        strokeWidth={2.75}
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray={`${len},${len}`}
                        strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [len, 0] })}
                      />
                      {pts.length <= 14 && pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.5} fill={color} />)}
                      <Circle cx={lastPt[0]} cy={lastPt[1]} r={4.5} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
                      {selX && s.points.some((p) => p.x === selX) && (
                        <Circle cx={xPos(selX)} cy={yPos(s.points.find((p) => p.x === selX)!.y)} r={6} fill={color} stroke="#FFFFFF" strokeWidth={2.5} />
                      )}
                    </React.Fragment>
                  );
                })}

            {selX && <Line x1={xPos(selX)} x2={xPos(selX)} y1={PAD.top} y2={PAD.top + innerH} stroke={theme.colors.textMuted} strokeDasharray="3,3" />}
          </Svg>
        )}

        {selX && (
          <View pointerEvents="none" style={[styles.tip, { left: tipLeft }]}>
            <Text style={styles.tipDate}>{shortDate(selX)}</Text>
            {series.map((s, si) => {
              const p = s.points.find((q) => q.x === selX);
              if (!p) return null;
              return (
                <Text key={s.name} style={styles.tipValue} numberOfLines={1}>
                  <Text style={{ color: SERIES_COLORS[si % SERIES_COLORS.length] }}>● </Text>
                  {multi ? `${s.name} ` : ''}
                  <Text style={styles.tipStrong}>{fmtNum(p.y)}</Text> {data.unit}
                </Text>
              );
            })}
          </View>
        )}
      </View>

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
      {!touched && <Text style={styles.hint}>Glisse le doigt sur le graphique pour lire les valeurs.</Text>}
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
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  headline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  big: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  delta: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  deltaText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tip: {
    position: 'absolute',
    top: 0,
    width: TIP_W,
    backgroundColor: theme.colors.text,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 1,
  },
  tipDate: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tipValue: { fontSize: 12, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  tipStrong: { fontWeight: '800', color: '#FFFFFF' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '48%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  hint: { fontSize: 11, color: theme.colors.textMuted },
});
