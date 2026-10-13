import React from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { universalColors } from '../../core/theme';

/**
 * Frosted background of the floating tab bars. Real blur here: content actually
 * scrolls under the bar. Android only blurs with the Dimezis method (otherwise it
 * is a flat tint).
 */
export const GlassTabBarBackground = () => (
  <BlurView
    tint="light"
    intensity={Platform.OS === 'ios' ? 80 : 70}
    experimentalBlurMethod="dimezisBlurView"
    style={StyleSheet.absoluteFill}
  />
);

/** Container style of a floating glass tab bar. */
export const glassTabBar: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  backgroundColor: 'transparent',
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: universalColors.hairline,
  // A shadow/elevation under a translucent bar shows through it as a grey band
  shadowOpacity: 0,
  elevation: 0,
};
