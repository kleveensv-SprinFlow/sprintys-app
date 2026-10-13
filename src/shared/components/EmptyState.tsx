import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PressableScale } from './PressableScale';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Friendly "nothing here yet" block: icon bubble, short text and an optional action. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
  compact,
  style,
}) => {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.compact,
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        style,
      ]}
    >
      <View style={[styles.bubble, compact && styles.bubbleCompact]}>
        <Feather name={icon} size={compact ? 20 : 26} color={theme.colors.sprintyBlue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <PressableScale haptic="light" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressableScale>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  compact: { paddingVertical: 20 },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bubbleCompact: { width: 48, height: 48, borderRadius: 24, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.text, textAlign: 'center', letterSpacing: -0.3 },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  action: {
    marginTop: 16,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 15, fontWeight: '700', color: theme.colors.sprintyBlue },
});
