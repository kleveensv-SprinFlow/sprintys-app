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
    try {
      Haptics.impactAsync(haptic);
    } catch {
      // haptics unavailable (web)
    }
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
          <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : theme.colors.sprintyBlue} />
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
    borderRadius: 16,
    borderCurve: 'continuous',
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
    fontWeight: '800',
    letterSpacing: theme.typography.letterSpacing.normal,
  },
  primary: {
    backgroundColor: theme.colors.sprintyBlue,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondary: {
    backgroundColor: theme.colors.glassFill,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  // Light brand tint (kept as "outline" for existing callers)
  outline: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  outlineText: {
    color: theme.colors.sprintyBlue,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
});


