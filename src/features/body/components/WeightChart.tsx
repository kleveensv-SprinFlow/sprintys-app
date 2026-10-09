import React, { useRef } from 'react';
import { View, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';

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
          <Polyline
            points={coords.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {dots.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={raw.length > 24 ? 2 : 3} fill={color} fillOpacity={0.35} />
        ))}
      </Svg>
    </View>
  );
};
