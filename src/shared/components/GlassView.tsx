import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../core/theme';
import { effects } from '../../core/effects';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * A standardized wrapper for subtle glassmorphism.
 * Prioritizes performance by using semi-transparent backgrounds.
 */
export const GlassView: React.FC<GlassViewProps> = ({ children, style }) => {
  return (
    <View style={[styles.glass, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    ...effects.glass,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
});
