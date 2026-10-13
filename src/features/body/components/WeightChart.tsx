import React, { useRef, useState } from 'react';
import { View, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Polyline, Circle, Line, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export type TrendPoint = { t: number; v: number };

const pad = 8;

function rangeOf(values: number[], target?: number | null) {
  const all = target != null && !Number.isNaN(target) ? [...values, target] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  return { min: min - span * 0.08, max: max + span * 0.08 };
}

function toXY(values: number[], width: number, height: number, target?: number | null) {
  const { min, max } = rangeOf(values, target);
  const span = max - min || 1;
  return values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return { x, y, v };
  });
}

/** Draw the goal only when it is close enough to the data not to flatten the curve. */
export function goalInView(values: number[], target?: number | null): number | null {
  if (target == null || !(target > 0) || values.length === 0) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 0.4);
  return Math.min(Math.abs(target - lo), Math.abs(target - hi)) <= Math.max(1.5, span * 1.5) ? target : null;
}

export function movingAverage(points: TrendPoint[], windowDays = 7): number[] {
  return points.map((p) => {
    const from = p.t - windowDays * 86400000;
    const slice = points.filter((q) => q.t <= p.t && q.t >= from);
    if (slice.length === 0) return p.v;
    return slice.reduce((sum, q) => sum + q.v, 0) / slice.length;
  });
}

export const WeightSparkline = ({
  values,
  width = 92,
  height = 40,
  color,
  target,
}: {
  values: number[];
  width?: number;
  height?: number;
  color: string;
  target?: number | null;
}) => {
  if (values.length < 2) return null;
  const coords = toXY(values, width, height, target);
  const { min, max } = rangeOf(values, target);
  const span = max - min || 1;
  const targetY = target != null ? pad + (1 - (target - min) / span) * (height - pad * 2) : null;

  return (
    <Svg width={width} height={height}>
      {targetY != null && (
        <Line
          x1={0}
          y1={targetY}
          x2={width}
          y2={targetY}
          stroke={color}
          strokeOpacity={0.35}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}
      <Polyline
        points={coords.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const WeightTrendChart = ({
  raw,
  smooth,
  width,
  height,
  color,
  target,
  onScrub,
}: {
  raw: number[];
  smooth: number[];
  width: number;
  height: number;
  color: string;
  target?: number | null;
  onScrub: (index: number | null) => void;
}) => {
  const line = smooth.length >= 2 ? smooth : raw;
  target = goalInView([...line, ...raw], target);
  const coords = toXY(line, width, height, target);
  const dots = toXY(raw, width, height, target);
  const { min, max } = rangeOf(line.length ? line : raw, target);
  const span = max - min || 1;
  const targetY = target != null ? pad + (1 - (target - min) / span) * (height - pad * 2) : null;
  const dotsRef = useRef(dots);
  dotsRef.current = dots;
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const x = e.nativeEvent.locationX;
        const list = dotsRef.current;
        if (!list.length) return;
        let best = 0;
        let dist = Infinity;
        list.forEach((p, i) => {
          const d = Math.abs(p.x - x);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        onScrubRef.current(best);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const x = e.nativeEvent.locationX;
        const list = dotsRef.current;
        if (!list.length) return;
        let best = 0;
        let dist = Infinity;
        list.forEach((p, i) => {
          const d = Math.abs(p.x - x);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        onScrubRef.current(best);
      },
      onPanResponderRelease: () => onScrubRef.current(null),
      onPanResponderTerminate: () => onScrubRef.current(null),
    })
  ).current;

  if (raw.length === 0 || width < 10) return <View style={{ height }} />;

  return (
    <View {...responder.panHandlers}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="weightTrendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.16} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {coords.length >= 2 && (
          <Path
            d={`${smoothPath(coords)} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`}
            fill="url(#weightTrendArea)"
          />
        )}
        {targetY != null && (
          <Line
            x1={pad}
            y1={targetY}
            x2={width - pad}
            y2={targetY}
            stroke={color}
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}
        {coords.length >= 2 && (
          <Path d={smoothPath(coords)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {dots.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={raw.length > 24 ? 2 : 3} fill={color} fillOpacity={0.35} />
        ))}
      </Svg>
    </View>
  );
};

/** Smooth curve through the points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Full-width weight curve for the dashboard card: smoothed line over a soft
 * gradient area, the goal as a labelled dashed line when it is close enough to
 * the data to be meaningful, and a dot on the latest weigh-in.
 */
export const WeightAreaChart = ({
  values,
  color,
  target,
  height = 92,
}: {
  values: number[];
  color: string;
  target?: number | null;
  height?: number;
}) => {
  const [width, setWidth] = useState(0);
  if (values.length < 2) return null;

  const showTarget = goalInView(values, target) != null;
  const coords = width > 0 ? toXY(values, width, height, showTarget ? target : null) : [];
  const { min, max } = rangeOf(values, showTarget ? target : null);
  const targetY = showTarget ? pad + (1 - ((target as number) - min) / (max - min || 1)) * (height - pad * 2) : null;
  const line = smoothPath(coords);
  const last = coords[coords.length - 1];
  const area = coords.length >= 2 ? `${line} L ${last.x} ${height} L ${coords[0].x} ${height} Z` : '';

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.18} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#weightArea)" />
          {targetY != null && (
            <>
              <Line
                x1={pad}
                y1={targetY}
                x2={width - 24}
                y2={targetY}
                stroke={color}
                strokeOpacity={0.45}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <SvgText x={width - 2} y={targetY + 4} fontSize={11} fontWeight="700" fill={color} textAnchor="end">
                {String(target).replace('.', ',')}
              </SvgText>
            </>
          )}
          <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={last.x} cy={last.y} r={5.5} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
        </Svg>
      )}
    </View>
  );
};
