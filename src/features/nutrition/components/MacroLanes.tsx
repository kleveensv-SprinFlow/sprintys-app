import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../core/theme';
import { ENERGY, MACROS, MacroKey } from '../nutritionTheme';

interface MacroLanesProps {
  values: Record<MacroKey, number>;
  /** Daily goals; without goals the lanes only show the grams. */
  goals?: Record<MacroKey, number>;
  compact?: boolean;
}

const formatG = (n: number) =>
  n < 10 && n % 1 !== 0 ? n.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : Math.round(n).toLocaleString('fr-FR');

const Lane = ({
  index,
  label,
  color,
  tint,
  value,
  goal,
  compact,
}: {
  index: number;
  label: string;
  color: string;
  tint: string;
  value: number;
  goal?: number;
  compact?: boolean;
}) => {
  const theme = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const percent = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  // Above the goal by more than 5 %: say it, the full bar alone does not
  const isOver = !!goal && goal > 0 && value > goal * 1.05;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={compact ? styles.laneCompact : styles.lane}>
      <View style={styles.laneHead}>
        {/* Lane number, like the numbers painted on a track */}
        <View style={[styles.laneNumber, compact && styles.laneNumberCompact, { backgroundColor: tint }]}>
          <Text style={[styles.laneNumberText, { color }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.label, compact && styles.labelCompact, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.value, compact && styles.valueCompact, { color: isOver ? ENERGY.over : theme.colors.text }]}>
          {formatG(value)}
          <Text style={[styles.goal, { color: theme.colors.textSecondary }]}>
            {goal ? ` / ${goal} g` : ' g'}
          </Text>
        </Text>
      </View>
      {!!goal && (
        <View style={[styles.track, compact && styles.trackCompact, { backgroundColor: theme.colors.glassFill }]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: color, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      )}
    </View>
  );
};

/** The three macros as numbered running lanes. */
export const MacroLanes = ({ values, goals, compact }: MacroLanesProps) => (
  <View style={compact ? styles.listCompact : styles.list}>
    {MACROS.map((m, i) => (
      <Lane
        key={m.key}
        index={i}
        label={m.label}
        color={m.color}
        tint={m.tint}
        value={values[m.key] || 0}
        goal={goals?.[m.key]}
        compact={compact}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { gap: 12 },
  listCompact: { gap: 9 },
  lane: {},
  laneCompact: {},
  laneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  laneNumber: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  laneNumberCompact: {
    width: 18,
    height: 18,
    borderRadius: 6,
    marginRight: 8,
  },
  laneNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 13,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    fontSize: 13,
  },
  goal: {
    fontWeight: '500',
  },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackCompact: {
    height: 5,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
