import React, { forwardRef, useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TappableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Opacity while pressed (same meaning as TouchableOpacity). */
  activeOpacity?: number;
  /** Scale while pressed. */
  activeScale?: number;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for TouchableOpacity: same props and same single-view layout, with the gentle spring press of
 * the rest of the app (slight shrink + dim) instead of a flat opacity flash.
 */
export const TouchableOpacity = forwardRef<any, TappableProps>(function Tappable(
  { style, activeOpacity = 0.75, activeScale = 0.97, onPressIn, onPressOut, disabled, children, ...rest },
  ref
) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v ? 0 : 6 }).start();

  // Keep an opacity or transform set by the caller (e.g. a dimmed disabled button)
  const flat = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const base = typeof flat.opacity === 'number' ? flat.opacity : 1;
  const baseTransform = Array.isArray(flat.transform) ? flat.transform : [];

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(0);
        onPressOut?.(e);
      }}
      style={[
        style,
        {
          opacity: press.interpolate({ inputRange: [0, 1], outputRange: [base, base * Math.max(activeOpacity, 0.6)] }),
          transform: [...(baseTransform as any[]), { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, activeScale] }) }],
        },
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
