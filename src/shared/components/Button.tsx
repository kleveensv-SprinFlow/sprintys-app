import React, { useRef } from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../core/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: Haptics.ImpactFeedbackStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  haptic = Haptics.ImpactFeedbackStyle.Light,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(haptic);
    onPress();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary': return styles.primary;
      case 'secondary': return styles.secondary;
      case 'outline': return styles.outline;
      case 'ghost': return styles.ghost;
      default: return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary': return styles.primaryText;
      case 'outline': return styles.outlineText;
      default: return styles.secondaryText;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? theme.colors.background : theme.colors.accent} />
        ) : (
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  baseText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.semibold as any,
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  primary: {
    backgroundColor: theme.colors.accent,
  },
  primaryText: {
    color: theme.colors.background,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceLight,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  outlineText: {
    color: theme.colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
});
