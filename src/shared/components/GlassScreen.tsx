import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleProp, View, ViewStyle } from 'react-native';
import { universalColors } from '../../core/theme';
import { GlowBackground } from './GlowBackground';

interface GlassScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scroll position of the screen, for the glow parallax. */
  scrollY?: Animated.Value;
}

/**
 * Root of a screen in the glass theme: opaque tinted backdrop + brand glows.
 * Opaque on purpose: a transparent screen would show the screen below it in the stack.
 * The content fades in when the screen first appears (skipped when the phone asks for reduced motion).
 */
export const GlassScreen = ({ children, style, scrollY }: GlassScreenProps) => {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) fade.setValue(1);
        else Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[{ flex: 1, backgroundColor: universalColors.backdrop }, style]}>
      <GlowBackground scrollY={scrollY} />
      <Animated.View style={{ flex: 1, opacity: fade }}>{children}</Animated.View>
    </View>
  );
};
