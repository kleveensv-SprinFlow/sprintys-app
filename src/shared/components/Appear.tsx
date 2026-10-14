import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface AppearProps {
  /** Position in the screen: later blocks start slightly after the earlier ones. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const STEP_MS = 45;
const MAX_STEPS = 7;

/**
 * Soft entrance for a block of a screen: fades in and rises a few pixels, one after the other. Plays once, when the
 * screen is first shown, and does nothing when the phone asks for reduced motion.
 */
export function Appear({ index = 0, style, children }: AppearProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          progress.setValue(1);
          return;
        }
        Animated.timing(progress, {
          toValue: 1,
          duration: 380,
          delay: Math.min(index, MAX_STEPS) * STEP_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Animated.View
      style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}
