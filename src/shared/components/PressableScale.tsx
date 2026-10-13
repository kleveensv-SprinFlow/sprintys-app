import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticKind = 'light' | 'medium' | 'selection' | 'none';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Style of the outer touch area (e.g. flex: 1 when laid out in a row). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Scale reached while pressed (iOS-like "press in" feel). */
  activeScale?: number;
  haptic?: HapticKind;
  children: React.ReactNode;
}

const fireHaptic = (kind: HapticKind) => {
  if (kind === 'none' || Platform.OS === 'web') return;
  try {
    if (kind === 'selection') Haptics.selectionAsync();
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    // ignore
  }
};

/**
 * Card / button wrapper that shrinks slightly with a spring while pressed,
 * instead of the opacity flash of TouchableOpacity.
 */
export const PressableScale = ({
  style,
  containerStyle,
  activeScale = 0.97,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: PressableScaleProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: toValue === 1 ? 6 : 0,
    }).start();

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        animateTo(activeScale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        fireHaptic(haptic);
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};
