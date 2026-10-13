import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../../core/theme';
import { ENERGY } from '../nutritionTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface EnergyTrackProps {
  consumed: number;
  goal: number;
}

const STROKE = 14;

/**
 * Calorie gauge drawn as an athletics track (stadium shape). It fills from the
 * start line on the home straight, counter-clockwise like a race.
 */
export const EnergyTrack = ({ consumed, goal }: EnergyTrackProps) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const ratio = goal > 0 ? consumed / goal : 0;
  const isOver = consumed > goal && goal > 0;
  const remaining = Math.max(0, Math.round(goal - consumed));
  const over = Math.round(consumed - goal);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.max(0, Math.min(1, ratio)),
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  const height = Math.round(width * 0.48);
  const r = (height - STROKE) / 2;
  const left = STROKE / 2;
  const right = width - STROKE / 2;
  const top = STROKE / 2;
  const bottom = height - STROKE / 2;
  const cx = width / 2;

  // Home straight → right bend → back straight → left bend (counter-clockwise on screen)
  const d =
    `M ${cx} ${bottom} L ${right - r} ${bottom} ` +
    `A ${r} ${r} 0 0 0 ${right - r} ${top} L ${left + r} ${top} ` +
    `A ${r} ${r} 0 0 0 ${left + r} ${bottom} Z`;
  const length = 2 * (width - height) + 2 * Math.PI * r;
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });

  return (
    <View style={[styles.wrap, { height: height || undefined }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="energyGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={isOver ? ENERGY.over : ENERGY.from} />
              <Stop offset="1" stopColor={isOver ? ENERGY.over : ENERGY.to} />
            </LinearGradient>
          </Defs>

          {/* Track surface */}
          <Path d={d} stroke={theme.colors.glassFill} strokeWidth={STROKE} fill="none" />

          {/* Progress */}
          <AnimatedPath
            d={d}
            stroke="url(#energyGradient)"
            strokeWidth={STROKE}
            // A round cap on an empty dash would draw a stray dot on the start line
            strokeLinecap={ratio > 0.01 ? 'round' : 'butt'}
            fill="none"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={dashOffset}
          />

          {/* Lane marking */}
          <Path d={d} stroke="rgba(255, 255, 255, 0.75)" strokeWidth={1.2} strokeDasharray="3 7" fill="none" />

          {/* Start / finish line */}
          <Line
            x1={cx}
            y1={bottom - STROKE / 2 - 2}
            x2={cx}
            y2={bottom + STROKE / 2 + 2}
            stroke={theme.colors.text}
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )}

      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {Math.round(consumed).toLocaleString('fr-FR')}
        </Text>
        <Text style={[styles.unit, { color: theme.colors.textSecondary }]}>kcal consommées</Text>
        <Text style={[styles.remaining, { color: isOver ? ENERGY.over : ENERGY.from }]}>
          {isOver ? `+${over.toLocaleString('fr-FR')} au-dessus` : `${remaining.toLocaleString('fr-FR')} restantes`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
  },
  remaining: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
