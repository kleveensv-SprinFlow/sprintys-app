import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { effects } from '../../core/effects';

interface GlowViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'gold' | 'surface';
  active?: boolean;
}

/**
 * A standardized wrapper for subtle glow effects.
 * Non-flashy, barely perceptible, optimized for performance.
 */
export const GlowView: React.FC<GlowViewProps> = ({ 
  children, 
  style, 
  variant = 'gold',
  active = true 
}) => {
  if (!active) return <View style={style}>{children}</View>;

  return (
    <View style={[
      variant === 'gold' ? styles.gold : styles.surface, 
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  gold: {
    ...effects.glow.gold,
  },
  surface: {
    ...effects.glow.surface,
  },
});
