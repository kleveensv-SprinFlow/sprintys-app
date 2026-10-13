import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../core/theme';
import { FeedbackHost } from '../feedback/FeedbackHost';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Glass bottom sheet: fading backdrop, spring slide-up, grab handle, keyboard aware. */
export function BottomSheet({ visible, onClose, title, subtitle, children, style }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  // Keep the last content while sliding out (callers usually clear their state on close)
  const last = useRef({ title, subtitle, children });
  if (visible) last.current = { title, subtitle, children };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 3 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() =>
        setMounted(false),
      );
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <FeedbackHost />
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] },
            style,
          ]}
        >
          <View style={styles.handle} />
          {!!last.current.title && <Text style={styles.title}>{last.current.title}</Text>}
          {!!last.current.subtitle && <Text style={styles.subtitle}>{last.current.subtitle}</Text>}
          {last.current.children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  subtitle: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 4 },
});
