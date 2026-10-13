import React from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
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
 */
export const GlassScreen = ({ children, style, scrollY }: GlassScreenProps) => (
  <View style={[{ flex: 1, backgroundColor: universalColors.backdrop }, style]}>
    <GlowBackground scrollY={scrollY} />
    {children}
  </View>
);
