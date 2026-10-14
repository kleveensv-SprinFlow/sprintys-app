import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../core/theme';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { GlowBackground } from '../../shared/components/GlowBackground';
import { PressableScale } from '../../shared/components/PressableScale';
import { Button } from '../../shared/components/Button';
import { FeedbackHost } from '../../shared/feedback/FeedbackHost';
import { tourFor } from './tourContent';

/**
 * Welcome tour, one per role. Shown once per account (existing users included) and replayable from the profile.
 * Mounted once in the root layout.
 */
export function WelcomeTour() {
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const visible = useOnboardingStore((s) => s.visible);
  const finish = useOnboardingStore((s) => s.finish);
  const steps = useMemo(() => tourFor(user?.role), [user?.role]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const currentRef = useRef(0);

  // Always start from the first page, also when replayed
  useEffect(() => {
    if (visible) {
      currentRef.current = 0;
      setIndex(0);
      scrollX.setValue(0);
      scroller.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  const last = index === steps.length - 1;
  const close = () => finish(user?.id);

  const goTo = (i: number) => {
    // Set right away: some platforms send no scroll events for a programmatic scroll
    currentRef.current = i;
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };

  const next = () => {
    if (last) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      } catch {
        // haptics unavailable (web)
      }
      close();
    } else {
      goTo(index + 1);
    }
  };

  // The current page also follows swipes, so swipes, taps on the dots and the button all agree
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.max(0, Math.min(steps.length - 1, Math.round(x / width)));
      if (i !== currentRef.current) {
        currentRef.current = i;
        setIndex(i);
        try {
          Haptics.selectionAsync().catch(() => undefined);
        } catch {
          // haptics unavailable (web)
        }
      }
    },
  });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <FeedbackHost />
      <View style={styles.root}>
        <GlowBackground />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.top}>
            <Text style={styles.counter}>
              {index + 1} / {steps.length}
            </Text>
            {!last && (
              <PressableScale haptic="selection" onPress={close} hitSlop={12} style={styles.skip} accessibilityRole="button">
                <Text style={styles.skipText}>Passer</Text>
              </PressableScale>
            )}
          </View>

          <Animated.ScrollView
            ref={scroller as any}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            style={{ flex: 1 }}
          >
            {steps.map((step, i) => {
              const range = [(i - 1) * width, i * width, (i + 1) * width];
              const iconStyle = {
                opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' }),
                transform: [
                  { translateX: scrollX.interpolate({ inputRange: range, outputRange: [width * 0.25, 0, -width * 0.25], extrapolate: 'clamp' }) },
                  { scale: scrollX.interpolate({ inputRange: range, outputRange: [0.7, 1, 0.7], extrapolate: 'clamp' }) },
                ],
              };
              const textStyle = {
                opacity: scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
              };
              return (
                <ScrollView
                  key={step.title}
                  style={{ width }}
                  contentContainerStyle={styles.page}
                  showsVerticalScrollIndicator={false}
                >
                  <Animated.View style={iconStyle}>
                    <LinearGradient
                      colors={[theme.colors.sprintyBlue, theme.colors.sprintyCyan]}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.badge}
                    >
                      <Feather name={step.icon} size={46} color="#FFFFFF" />
                    </LinearGradient>
                  </Animated.View>

                  <Animated.View style={[styles.body, textStyle]}>
                    {!!step.where && (
                      <View style={styles.where}>
                        <Feather name="map-pin" size={12} color={theme.colors.sprintyBlue} />
                        <Text style={styles.whereText}>{step.where}</Text>
                      </View>
                    )}
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.text}>{step.text}</Text>
                    {!!step.points && (
                      <View style={styles.points}>
                        {step.points.map((p) => (
                          <View key={p} style={styles.point}>
                            <View style={styles.tick}>
                              <Feather name="check" size={12} color={theme.colors.sprintyBlue} />
                            </View>
                            <Text style={styles.pointText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Animated.View>
                </ScrollView>
              );
            })}
          </Animated.ScrollView>

          <View style={styles.bottom}>
            <View style={styles.dots} accessibilityLabel={`Étape ${index + 1} sur ${steps.length}`}>
              {steps.map((s, i) => {
                const range = [(i - 1) * width, i * width, (i + 1) * width];
                return (
                  <PressableScale key={s.title} haptic="selection" hitSlop={8} onPress={() => goTo(i)} accessibilityLabel={`Aller à l’étape ${i + 1}`}>
                    <Animated.View
                      style={[
                        styles.dot,
                        {
                          opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
                          transform: [{ scaleX: scrollX.interpolate({ inputRange: range, outputRange: [1, 3, 1], extrapolate: 'clamp' }) }],
                        },
                      ]}
                    />
                  </PressableScale>
                );
              })}
            </View>
            <Button title={last ? 'C’est parti' : 'Suivant'} onPress={next} style={styles.button} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.backdrop },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, minHeight: 44 },
  counter: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, fontVariant: ['tabular-nums'] },
  skip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: theme.colors.glassFill, justifyContent: 'center' },
  skipText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 16 },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.sprintyBlue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  body: { alignItems: 'center', marginTop: 28, alignSelf: 'stretch' },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
    marginBottom: 12,
  },
  whereText: { fontSize: 13, fontWeight: '700', color: theme.colors.sprintyBlue },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7, color: theme.colors.text, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 23, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: 360 },
  points: { alignSelf: 'stretch', marginTop: 20, gap: 12, maxWidth: 400, width: '100%' },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1, fontSize: 15, lineHeight: 21, color: theme.colors.text, fontWeight: '500' },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, height: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.sprintyBlue },
  button: { alignSelf: 'stretch' },
});
