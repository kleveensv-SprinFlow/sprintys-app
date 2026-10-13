import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../core/theme';
import { ENERGY } from '../nutritionTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface EnergyTrackProps {
  consumed: number;
  goal: number;
}

const STROKE = 12;
/** Points sampled along the track to move the runner (piecewise-linear interpolation). */
const SAMPLES = 72;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Brand blue that brightens to cyan as the day's goal gets closer. */
const progressColor = (ratio: number) => {
  const a = hexToRgb(ENERGY.from);
  const b = hexToRgb(ENERGY.to);
  // Never all the way to cyan: the track stays in the brand blue family
  const t = Math.max(0, Math.min(1, ratio)) * 0.55;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

/**
 * Calorie gauge drawn as an athletics track (stadium shape). The fill starts on
 * the finish line of the home straight and runs counter-clockwise like a race,
 * with a runner dot at the head of the fill.
 */
export const EnergyTrack = ({ consumed, goal }: EnergyTrackProps) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const ratio = goal > 0 ? consumed / goal : 0;
  const isOver = consumed > goal && goal > 0;
  const remaining = Math.max(0, Math.round(goal - consumed));
  const over = Math.round(consumed - goal);
  const color = isOver ? ENERGY.over : progressColor(ratio);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.max(0, Math.min(1, ratio)),
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  const height = Math.round(width * 0.4);
  const r = (height - STROKE) / 2;
  const left = STROKE / 2;
  const right = width - STROKE / 2;
  const top = STROKE / 2;
  const bottom = height - STROKE / 2;
  const midY = height / 2;
  const cx = width / 2;

  // Home straight → right bend → back straight → left bend
  const d =
    `M ${cx} ${bottom} L ${right - r} ${bottom} ` +
    `A ${r} ${r} 0 0 0 ${right - r} ${top} L ${left + r} ${top} ` +
    `A ${r} ${r} 0 0 0 ${left + r} ${bottom} Z`;
  const straight = width - height;
  const bend = Math.PI * r;
  const length = 2 * straight + 2 * bend;

  /** Point at a given distance along the track, in race direction. */
  const runner = useMemo(() => {
    if (width <= 0) return null;
    const s1 = right - r - cx;
    const pointAt = (dist: number): [number, number] => {
      let u = dist;
      if (u <= s1) return [cx + u, bottom];
      u -= s1;
      if (u <= bend) {
        const t = u / r;
        return [right - r + r * Math.sin(t), midY + r * Math.cos(t)];
      }
      u -= bend;
      if (u <= straight) return [right - r - u, top];
      u -= straight;
      if (u <= bend) {
        const t = u / r;
        return [left + r - r * Math.sin(t), midY - r * Math.cos(t)];
      }
      u -= bend;
      return [left + r + u, bottom];
    };
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const [x, y] = pointAt(t * length);
      input.push(t);
      xs.push(x);
      ys.push(y);
    }
    return {
      x: progress.interpolate({ inputRange: input, outputRange: xs }),
      y: progress.interpolate({ inputRange: input, outputRange: ys }),
    };
  }, [width]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [length || 1, 0] });

  // Checkered finish line across the home straight (2 columns × 4 rows)
  const cell = STROKE / 4;
  const checkers: React.ReactNode[] = [];
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 4; row++) {
      checkers.push(
        <Rect
          key={`${col}-${row}`}
          x={cx - cell + col * cell}
          y={bottom - STROKE / 2 + row * cell}
          width={cell}
          height={cell}
          fill={(col + row) % 2 === 0 ? theme.colors.text : '#FFFFFF'}
        />
      );
    }
  }

  return (
    <View style={[styles.wrap, { height: height || undefined }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {/* Track surface */}
          <Path d={d} stroke={theme.colors.glassFill} strokeWidth={STROKE} fill="none" />

          {/* Progress */}
          <AnimatedPath
            d={d}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={dashOffset}
          />

          {/* Lane marking */}
          <Path d={d} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 8" fill="none" />

          {/* Finish line */}
          <G opacity={0.9}>{checkers}</G>

          {/* Runner */}
          {runner && (
            <>
              <AnimatedCircle cx={runner.x} cy={runner.y} r={STROKE} fill={color} fillOpacity={0.18} />
              <AnimatedCircle cx={runner.x} cy={runner.y} r={STROKE / 2 + 1.5} fill="#FFFFFF" stroke={color} strokeWidth={3} />
            </>
          )}
        </Svg>
      )}

      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {Math.round(consumed).toLocaleString('fr-FR')}
        </Text>
        <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
          kcal ·{' '}
          <Text style={{ color: isOver ? ENERGY.over : ENERGY.from, fontWeight: '700' }}>
            {isOver ? `+${over.toLocaleString('fr-FR')} au-dessus` : `${remaining.toLocaleString('fr-FR')} restantes`}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 110,
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 0,
  },
});
