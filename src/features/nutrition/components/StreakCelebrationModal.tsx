import React, { useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export const StreakCelebrationModal = () => {
  const { showStreakCelebration, currentStreakVal, closeStreakCelebration } = useNutritionStore();
  const insets = useSafeAreaInsets();
  
  const lottieRef = useRef<LottieView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showStreakCelebration) {
      lottieRef.current?.play();
      
      // Entrée avec rebond et fondu
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulsation continue de l'aura
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [showStreakCelebration, scaleAnim, opacityAnim, pulseAnim]);

  if (!showStreakCelebration) return null;

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <Modal visible={showStreakCelebration} animationType="fade" transparent>
      <View style={styles.overlay}>
        {/* Aura lumineuse en arrière-plan avec pulsation */}
        <Animated.View 
          style={[
            styles.glowOrb,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* AVATAR ANIME SPRINTY DANS SON HALO */}
          <View style={styles.sprintyContainer}>
            <View style={styles.sprintyHalo}>
              <LottieView
                ref={lottieRef}
                source={require('../../../assets/animations/active.json')}
                autoPlay
                loop
                style={styles.sprintyLottie}
              />
            </View>
          </View>

          {/* SCORE DE SERIE & TITRE */}
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{currentStreakVal}</Text>
            <View style={styles.streakLabelRow}>
              <Text style={styles.streakLabel}>
                {currentStreakVal > 1 ? "Jours d'affilée !" : "Premier jour d'affilée !"}
              </Text>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
          </View>

          {/* CARTE SEMAINE VIBRANTE */}
          <View style={styles.weekContainer}>
            {weekDays.map((day, index) => {
              const isPastOrToday = index <= todayIndex;
              const isToday = index === todayIndex;
              return (
                <View key={index} style={styles.dayCol}>
                  <Text style={[styles.dayLabel, { color: isToday ? '#FFF' : '#71717A' }]}>
                    {day}
                  </Text>
                  <View 
                    style={[
                      styles.checkCircle,
                      isPastOrToday && styles.checkCirclePassed,
                      isToday && styles.checkCircleToday,
                    ]}
                  >
                    {isToday ? (
                      <Feather name="check" size={16} color="#FFF" />
                    ) : isPastOrToday ? (
                      <Feather name="check" size={13} color="#FF6A3D" />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* SLOGAN D'ENCOURAGEMENT */}
          <View style={styles.encouragementBox}>
            <Text style={styles.fireText}>Tu es en feu ! Sprinty est fier de toi 🚀</Text>
          </View>

          {/* BOUTON CONTINUER NEON VIBRANT */}
          <TouchableOpacity 
            style={[styles.continueButton, { marginBottom: Math.max(insets.bottom, 24) }]} 
            onPress={closeStreakCelebration}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF5722', '#FF8A00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueButtonText}>C'est parti !</Text>
              <Feather name="arrow-right" size={20} color="#FFF" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    backgroundColor: '#FF5722',
    opacity: 0.16,
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  sprintyContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintyHalo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255, 87, 34, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  sprintyLottie: {
    width: 140,
    height: 140,
  },
  streakInfo: {
    alignItems: 'center',
    marginBottom: 28,
  },
  streakNumber: {
    fontSize: 88,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 96,
    textShadowColor: 'rgba(255, 87, 34, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  streakLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakLabel: {
    fontSize: 22,
    color: '#FF7A45',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  fireEmoji: {
    fontSize: 22,
  },
  weekContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 24,
    width: '100%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 24,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#27272A',
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCirclePassed: {
    borderColor: '#FF5722',
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  checkCircleToday: {
    borderColor: '#FF8A00',
    backgroundColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  encouragementBox: {
    marginBottom: 36,
  },
  fireText: {
    fontSize: 15,
    color: '#D4D4D8',
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  }
});
