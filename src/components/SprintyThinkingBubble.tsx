import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { theme } from '../core/theme';

interface SprintyThinkingBubbleProps {
  customMessage?: string;
}

const STEP_MESSAGES = [
  "Sprinty analyse l'historique complet…",
  'Vérification des chronos & des charges…',
  'Comparaison des séances clés…',
  'Évaluation de la forme & de la nutrition…',
  'Génération du tableau de bord visuel…',
];

export default function SprintyThinkingBubble({ customMessage }: SprintyThinkingBubbleProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    lottieRef.current?.play();
  }, []);

  useEffect(() => {
    if (customMessage) return;

    const interval = setInterval(() => {
      // Fondu avant de changer de message
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStepIndex((prev) => (prev + 1) % STEP_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [customMessage, fadeAnim]);

  const displayMessage = customMessage || STEP_MESSAGES[currentStepIndex];

  return (
    <View style={styles.container}>
      <View style={styles.lottieWrap}>
        <LottieView
          ref={lottieRef}
          source={require('../assets/animations/active.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.stepText, { opacity: fadeAnim }]}>
          {displayMessage}
        </Animated.Text>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 12,
  },
  lottieWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  lottie: {
    width: 48,
    height: 48,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  dot1: {
    opacity: 0.9,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
});
