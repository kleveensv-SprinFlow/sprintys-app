import React from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { glassBar } from '../../core/glass';
import { Grain } from './Grain';

interface FrostedBarProps {
  /** 0..1, e.g. driven by the scroll position so the bar only shows once content slides under it. */
  opacity?: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  style?: StyleProp<ViewStyle>;
}

/** Frosted background of a header bar (absolute fill of its parent). */
export const FrostedBar = ({ opacity = 1, style }: FrostedBarProps) => (
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glassBar, { opacity }, style]}>
    <Grain sheen={false} />
  </Animated.View>
);
