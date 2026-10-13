import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle, StyleSheet, DimensionValue } from 'react-native';
import { glassCard } from '../../core/glass';

// One shared pulse so every skeleton on screen breathes in sync (and only one animation runs)
const pulse = new Animated.Value(0);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;

const start = () => {
  users += 1;
  if (loop) return;
  loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]),
  );
  loop.start();
};
const stop = () => {
  users = Math.max(0, users - 1);
  if (users === 0 && loop) {
    loop.stop();
    loop = null;
  }
};

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Soft placeholder block shown while content loads. */
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 14, radius = 8, style }) => {
  useEffect(() => {
    start();
    return stop;
  }, []);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: 'rgba(15, 23, 42, 0.07)' },
        { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        style,
      ]}
    />
  );
};

/** Ready-made card placeholder: title line, two text lines, optional leading circle. */
export const SkeletonCard: React.FC<{ lines?: number; avatar?: boolean; style?: StyleProp<ViewStyle> }> = ({
  lines = 2,
  avatar,
  style,
}) => (
  <View style={[glassCard, styles.card, style]}>
    {avatar && <Skeleton width={44} height={44} radius={22} />}
    <View style={styles.lines}>
      <Skeleton width="55%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, marginBottom: 12 },
  lines: { flex: 1, gap: 8 },
});
