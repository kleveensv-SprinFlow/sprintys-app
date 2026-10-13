import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, universalColors } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { PressableScale } from '../../../shared/components/PressableScale';
import { MEAL_ACCENT, MEAL_ACCENT_TINT } from '../nutritionTheme';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Logging streak: a light card over a soft veil, the app's blue bolt and the
 * week as dots. Discreet on purpose, it should not interrupt more than a toast.
 */
export const StreakCelebrationModal = () => {
  const theme = useTheme();
  const showStreakCelebration = useNutritionStore((s) => s.showStreakCelebration);
  const currentStreakVal = useNutritionStore((s) => s.currentStreakVal);
  const closeStreakCelebration = useNutritionStore((s) => s.closeStreakCelebration);

  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showStreakCelebration) {
      scale.setValue(0.86);
      opacity.setValue(0);
      badge.setValue(0);
      halo.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(badge, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [showStreakCelebration]);

  if (!showStreakCelebration) return null;

  const todayIndex = (new Date().getDay() + 6) % 7;
  // Days of this week covered by the streak (today and the ones before it)
  const firstStreakDay = todayIndex - Math.max(0, currentStreakVal - 1);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeStreakCelebration} statusBarTranslucent>
      <Pressable style={styles.veil} onPress={closeStreakCelebration}>
        <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface, opacity, transform: [{ scale }] }]}>
          {/* Card body swallows taps so only the veil closes */}
          <Pressable style={styles.cardInner} onPress={() => {}}>
            <View style={styles.badgeWrap}>
              <Animated.View
                style={[
                  styles.halo,
                  {
                    opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                    transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                  },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: badge }] }}>
                <LinearGradient
                  colors={[universalColors.sprintyBlue, universalColors.sprintyCyan]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Feather name="zap" size={34} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </View>

            <Text style={[styles.count, { color: theme.colors.text }]}>{currentStreakVal}</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {currentStreakVal > 1 ? 'jours de suite' : 'Premier jour'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Chaque repas noté compte.
            </Text>

            <View style={styles.week}>
              {WEEK_DAYS.map((day, index) => {
                const isToday = index === todayIndex;
                const inStreak = index >= firstStreakDay && index <= todayIndex;
                return (
                  <View key={index} style={styles.dayCol}>
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: isToday ? MEAL_ACCENT : theme.colors.textSecondary, fontWeight: isToday ? '800' : '600' },
                      ]}
                    >
                      {day}
                    </Text>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isToday ? MEAL_ACCENT : inStreak ? MEAL_ACCENT_TINT : theme.colors.glassFill,
                        },
                      ]}
                    >
                      {(isToday || inStreak) && (
                        <Feather name="check" size={isToday ? 14 : 12} color={isToday ? '#FFFFFF' : MEAL_ACCENT} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <PressableScale
              containerStyle={styles.buttonHit}
              style={[styles.button, { backgroundColor: MEAL_ACCENT }]}
              haptic="medium"
              onPress={closeStreakCelebration}
            >
              <Text style={styles.buttonText}>Continuer</Text>
            </PressableScale>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderCurve: 'continuous',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 12,
  },
  cardInner: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  badgeWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  halo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: universalColors.sprintyBlue,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 58,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 22,
    marginBottom: 22,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 12,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHit: {
    alignSelf: 'stretch',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
