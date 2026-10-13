import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, PanResponder, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSprintyStore, SprintyStatus } from '../../store/sprintyStore';
import { theme } from '../../core/theme';

const TONES: Partial<Record<SprintyStatus, { color: string; tint: string; icon: keyof typeof Feather.glyphMap }>> = {
  success: { color: '#10B981', tint: 'rgba(16, 185, 129, 0.14)', icon: 'check' },
  error: { color: '#EF4444', tint: 'rgba(239, 68, 68, 0.12)', icon: 'alert-circle' },
  warning: { color: '#F59E0B', tint: 'rgba(245, 158, 11, 0.14)', icon: 'alert-triangle' },
  info: { color: '#0069E8', tint: 'rgba(0, 105, 232, 0.12)', icon: 'info' },
  active: { color: '#0069E8', tint: 'rgba(0, 105, 232, 0.12)', icon: 'zap' },
};

/** Global toast. Rendered by FeedbackHost so it also shows above open modals. */
export const SprintyFeedback: React.FC = () => {
  const { status, message, title, isVisible, hide } = useSprintyStore();
  const insets = useSafeAreaInsets();
  const shown = isVisible || status === 'active';
  const enter = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  // Keep the last content while the toast slides out
  const last = useRef<{ status: SprintyStatus; title: string | null; message: string | null } | null>(null);
  if (shown) last.current = { status, title, message };

  useEffect(() => {
    if (shown) {
      drag.setValue(0);
      pop.setValue(0.4);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14, delay: 90 } as any).start();
    }
    Animated.spring(enter, {
      toValue: shown ? 1 : 0,
      useNativeDriver: true,
      speed: shown ? 16 : 22,
      bounciness: shown ? 7 : 0,
    }).start();
  }, [shown, message, title]);

  // Swipe up to dismiss
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_e, g) => drag.setValue(Math.min(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -24 || g.vy < -0.4) useSprintyStore.getState().hide();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (!last.current) return null;
  const view = last.current;
  const tone = TONES[view.status] ?? TONES.info!;
  const body = view.message || (view.status === 'active' ? 'Sprinty analyse tes données…' : '');

  return (
    <Animated.View
      pointerEvents={shown ? 'box-none' : 'none'}
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12) + 8,
          opacity: enter,
          transform: [
            { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }), drag) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
      ]}
      {...pan.panHandlers}
    >
      <Pressable
        onPress={view.status === 'active' ? undefined : hide}
        style={styles.card}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Animated.View style={[styles.icon, { backgroundColor: tone.tint, transform: [{ scale: pop }] }]}>
          {view.status === 'active' ? (
            <ActivityIndicator size="small" color={tone.color} />
          ) : (
            <Feather name={tone.icon} size={18} color={tone.color} />
          )}
        </Animated.View>
        <View style={styles.text}>
          {!!view.title && (
            <Text style={styles.title} numberOfLines={2}>
              {view.title}
            </Text>
          )}
          {!!body && (
            <Text style={[styles.message, !view.title && styles.messageAlone]} numberOfLines={4}>
              {body}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 30,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.2 },
  message: { fontSize: 14, lineHeight: 19, color: theme.colors.textSecondary },
  messageAlone: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
});
