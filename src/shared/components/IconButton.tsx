import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../core/theme';
import { PressableScale } from './PressableScale';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  tone?: 'glass' | 'blue' | 'danger' | 'plain';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONES = {
  glass: { bg: theme.colors.glassFill, fg: theme.colors.text },
  blue: { bg: 'rgba(0, 105, 232, 0.1)', fg: theme.colors.sprintyBlue },
  danger: { bg: 'rgba(239, 68, 68, 0.1)', fg: theme.colors.error },
  plain: { bg: 'transparent', fg: theme.colors.textSecondary },
};

/** Round 38 px icon button with a 44 px touch target. */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  size = 38,
  color,
  tone = 'glass',
  disabled,
  style,
}) => {
  const t = TONES[tone];
  const slop = Math.max(0, (44 - size) / 2);
  return (
    <PressableScale
      haptic="selection"
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Feather name={icon} size={Math.round(size * 0.47)} color={color ?? t.fg} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
