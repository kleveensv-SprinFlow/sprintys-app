import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../core/theme';
import { PressableScale } from '../components/PressableScale';
import { SprintyFeedback } from '../../features/sprinty/SprintyFeedback';
import { useFeedbackStore, DialogButton } from './feedbackStore';

let hostSeq = 0;

/**
 * Renders toasts and confirmation sheets as an overlay (not a native Modal, which cannot stack on iOS).
 * Mount one at the root and one inside every RN <Modal>: only the most recently mounted host draws,
 * so feedback always appears above whatever is on screen.
 */
export function FeedbackHost() {
  const id = useRef(++hostSeq).current;
  const isTop = useFeedbackStore((s) => s.hosts[s.hosts.length - 1] === id);

  useLayoutEffect(() => {
    useFeedbackStore.getState().registerHost(id);
    return () => useFeedbackStore.getState().unregisterHost(id);
  }, []);

  if (!isTop) return null;
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <DialogSheet />
      <SprintyFeedback />
    </View>
  );
}

const haptic = (destructive: boolean) => {
  try {
    if (destructive) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  } catch {
    // haptics unavailable (web)
  }
};

function DialogSheet() {
  const dialog = useFeedbackStore((s) => s.dialog);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(dialog);

  useEffect(() => {
    if (dialog) {
      setRendered(dialog);
      anim.setValue(0);
      haptic(dialog.buttons.some((b) => b.style === 'destructive'));
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 4 }).start();
    } else if (rendered) {
      Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        () => setRendered(null),
      );
    }
  }, [dialog?.id]);

  const choose = (button?: DialogButton) => {
    useFeedbackStore.getState().closeDialog();
    // Let the sheet start closing before the action (which may open another sheet)
    setTimeout(() => button?.onPress?.(), 60);
  };

  const cancelButton = rendered?.buttons.find((b) => b.style === 'cancel');
  const dismiss = () => {
    if (!rendered || rendered.cancelable === false) return;
    choose(cancelButton);
  };

  // Android back button closes the sheet like a tap outside
  useEffect(() => {
    if (!dialog) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [dialog?.id]);

  if (!rendered) return null;
  const actions = rendered.buttons.filter((b) => b.style !== 'cancel');
  const destructive = actions.some((b) => b.style === 'destructive');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={dialog ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Fermer" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            marginBottom: Math.max(insets.bottom, 12),
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          },
        ]}
      >
        {!!rendered.icon || destructive ? (
          <View style={[styles.badge, destructive && styles.badgeDanger]}>
            <Feather
              name={(rendered.icon as any) || 'trash-2'}
              size={22}
              color={destructive ? theme.colors.error : theme.colors.sprintyBlue}
            />
          </View>
        ) : null}
        {!!rendered.title && <Text style={styles.title}>{rendered.title}</Text>}
        {!!rendered.message && <Text style={styles.message}>{rendered.message}</Text>}

        <View style={styles.buttons}>
          {actions.map((b, i) => {
            const danger = b.style === 'destructive';
            // With several choices, only the first plain one is filled; others are soft
            const filled = danger || (i === 0 && !actions.some((a) => a.style === 'destructive')) || actions.length === 1;
            return (
              <PressableScale
                key={`${b.text}-${i}`}
                haptic={danger ? 'medium' : 'light'}
                onPress={() => choose(b)}
                style={[styles.button, filled ? (danger ? styles.danger : styles.primary) : styles.soft]}
                accessibilityRole="button"
              >
                <Text style={[styles.buttonText, !filled && styles.softText]}>{b.text}</Text>
              </PressableScale>
            );
          })}
          {(cancelButton || rendered.cancelable !== false) && (
            <PressableScale haptic="selection" onPress={() => choose(cancelButton)} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>{cancelButton?.text || 'Annuler'}</Text>
            </PressableScale>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10000, elevation: 10000 },
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    alignSelf: 'center',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 24,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  message: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 6 },
  buttons: { marginTop: 20, gap: 8 },
  button: { height: 52, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: theme.colors.sprintyBlue },
  danger: { backgroundColor: theme.colors.error },
  soft: { backgroundColor: 'rgba(0, 105, 232, 0.08)' },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  softText: { color: theme.colors.sprintyBlue },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
});
