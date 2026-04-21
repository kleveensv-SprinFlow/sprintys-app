import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../core/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'glass':
        return styles.glass;
      case 'elevated':
        return styles.elevated;
      default:
        return styles.default;
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  glass: {
    backgroundColor: theme.glass.backgroundColor,
    borderWidth: 1,
    borderColor: theme.glass.borderColor,
  },
});
