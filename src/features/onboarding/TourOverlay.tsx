import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../core/theme';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { PressableScale } from '../../shared/components/PressableScale';
import { Button } from '../../shared/components/Button';
import { tourFor } from './tourContent';
import { measureTarget, Rect as TRect } from './tourRegistry';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const DIM = 'rgba(10, 20, 45, 0.72)';
const PAD = 8;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const buzz = (kind: 'selection' | 'success') => {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    else Haptics.selectionAsync().catch(() => undefined);
  } catch {
    // haptics unavailable (web)
  }
};

/**
 * Guided tour drawn on top of the real screens: the target button is lit up, a hand invites to tap it,
 * and tapping it moves on (nothing is actually triggered: it is a demo). Mounted once in the root layout.
 */
export function TourOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const visible = useOnboardingStore((s) => s.visible);
  const step = useOnboardingStore((s) => s.step);
  const setStep = useOnboardingStore((s) => s.setStep);
  const finish = useOnboardingStore((s) => s.finish);

  const steps = useMemo(() => tourFor(user?.role), [user?.role]);
  const cur = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

  const rootRef = useRef<View>(null);
  const lastRoute = useRef<string | null>(null);
  const [target, setTarget] = useState<TRect | null>(null); // relative to the overlay, padding included
  const [missing, setMissing] = useState(false);
  const [cardH, setCardH] = useState(190);

  // Spotlight (animated with the JS driver: it drives SVG attributes and layout)
  const hx = useRef(new Animated.Value(W / 2)).current;
  const hy = useRef(new Animated.Value(H / 2)).current;
  const hw = useRef(new Animated.Value(0)).current;
  const hh = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const nudge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    lastRoute.current = null;
    const loops = [
      Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [visible]);

  // Skip with the Android back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish(user?.id);
      return true;
    });
    return () => sub.remove();
  }, [visible, user?.id]);

  const settle = async (rect: TRect | null, notFound = false) => {
    let box: TRect | null = null;
    if (rect) {
      const origin = await new Promise<{ x: number; y: number }>((resolve) => {
        const node: any = rootRef.current;
        if (node?.measureInWindow) node.measureInWindow((x: number, y: number) => resolve({ x: x || 0, y: y || 0 }));
        else resolve({ x: 0, y: 0 });
      });
      box = {
        x: Math.max(4, rect.x - origin.x - PAD),
        y: Math.max(4, rect.y - origin.y - PAD),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      };
    }
    setTarget(box);
    setMissing(notFound);
    const spring = (v: Animated.Value, to: number) =>
      Animated.spring(v, { toValue: to, useNativeDriver: false, speed: 14, bounciness: 5 });
    Animated.parallel([
      spring(hx, box ? box.x : W / 2),
      spring(hy, box ? box.y : H / 2),
      spring(hw, box ? box.width : 0),
      spring(hh, box ? box.height : 0),
    ]).start();
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  // Each step: go to its screen, wait for the target to exist, then light it up
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setTarget(null);
    setMissing(false);
    (async () => {
      if (cur.route && cur.route !== lastRoute.current) {
        lastRoute.current = cur.route;
        router.navigate(cur.route as any);
        await wait(500);
      }
      if (cancelled) return;
      if (!cur.target) return settle(null);
      for (let i = 0; i < 30 && !cancelled; i++) {
        const r = await measureTarget(cur.target);
        if (r) {
          await settle(r);
          // The screen may still be moving (skeletons, refresh): measure once more
          await wait(700);
          if (cancelled) return;
          const again = await measureTarget(cur.target);
          if (again) await settle(again);
          return;
        }
        await wait(120);
      }
      if (!cancelled) settle(null, true);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, step]);

  if (!visible || !cur) return null;

  const skip = () => finish(user?.id);
  const next = () => {
    if (isLast) {
      buzz('success');
      finish(user?.id);
    } else {
      buzz('selection');
      setStep(step + 1);
    }
  };
  const nudgeCard = () => {
    nudge.setValue(0);
    Animated.sequence(
      [8, -8, 5, -5, 0].map((v) => Animated.timing(nudge, { toValue: v, duration: 55, useNativeDriver: true })),
    ).start();
  };

  const hasHole = !!target;
  const needsButton = !cur.target || missing;

  // Card goes on the side of the target with the most room
  let cardTop = (H - cardH) / 2;
  if (target) {
    const below = target.y + target.height + 18;
    const fitsBelow = below + cardH <= H - insets.bottom - 12;
    cardTop = fitsBelow ? below : Math.max(insets.top + 12, target.y - cardH - 18);
  }

  const handLeft = target ? target.x + target.width / 2 - 20 : 0;
  const handTop = target ? target.y + target.height / 2 - 12 : 0;

  return (
    <View ref={rootRef} collapsable={false} style={styles.root}>
      {/* Dimmed screen with a hole around the target */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="hole">
            <Rect x={0} y={0} width={W} height={H} fill="white" />
            <AnimatedRect x={hx} y={hy} width={hw} height={hh} rx={16} ry={16} fill="black" />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={DIM} mask="url(#hole)" />
      </Svg>

      {/* Taps outside the lit area do nothing but shake the card */}
      <Pressable style={StyleSheet.absoluteFill} onPress={nudgeCard} accessibilityLabel="Fond du tutoriel" />

      {hasHole && (
        <>
          {/* Tapping the lit area moves on */}
          <Animated.View style={[styles.hole, { left: hx, top: hy, width: hw, height: hh }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel={`${cur.title}. Touche pour continuer`}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
                },
              ]}
            />
            <View pointerEvents="none" style={styles.ringSolid} />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.hand,
              {
                left: handLeft,
                top: handTop,
                opacity: enter,
                transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }],
              },
            ]}
          >
            <MaterialCommunityIcons name="gesture-tap" size={54} color="#FFFFFF" style={styles.handOutline} />
            <MaterialCommunityIcons name="gesture-tap" size={46} color={theme.colors.sprintyBlue} />
          </Animated.View>
        </>
      )}

      {/* Explanation */}
      <Animated.View
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          {
            top: cardTop,
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { translateX: nudge },
            ],
          },
        ]}
      >
        <View style={styles.cardHead}>
          <Text style={styles.counter}>
            {step + 1} / {steps.length}
          </Text>
          <PressableScale haptic="selection" onPress={skip} hitSlop={12} style={styles.skip} accessibilityRole="button">
            <Text style={styles.skipText}>Passer</Text>
          </PressableScale>
        </View>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.text}>{cur.text}</Text>
        {needsButton ? (
          <Button title={isLast ? 'Terminer' : cur.cta || 'Suivant'} onPress={next} style={styles.cta} />
        ) : (
          <View style={styles.hint}>
            <MaterialCommunityIcons name="gesture-tap" size={18} color={theme.colors.sprintyBlue} />
            <Text style={styles.hintText}>Touche l’élément entouré pour continuer</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 9000, elevation: 9000 },
  hole: { position: 'absolute', borderRadius: 16 },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  ringSolid: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  hand: { position: 'absolute', width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  handOutline: { position: 'absolute' },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 20,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  counter: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: theme.colors.sprintyBlue, fontVariant: ['tabular-nums'] },
  skip: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: theme.colors.glassFill, justifyContent: 'center' },
  skipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  text: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 6 },
  cta: { marginTop: 16 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  hintText: { fontSize: 13, fontWeight: '700', color: theme.colors.sprintyBlue, flex: 1 },
});
