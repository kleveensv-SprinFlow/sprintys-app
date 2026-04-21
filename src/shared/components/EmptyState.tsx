import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../core/theme';
import Svg, { Circle, Path } from 'react-native-svg';

interface EmptyStateProps {
  title: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={theme.colors.border} strokeWidth="1" strokeDasharray="4 4" />
          <Path 
            d="M12 8V12M12 16H12.01" 
            stroke={theme.colors.textMuted} 
            strokeWidth="1.5" 
            strokeLinecap="round" 
          />
        </Svg>
      </View>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  },
  title: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
});
