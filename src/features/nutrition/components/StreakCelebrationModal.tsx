import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Note: If lottie is missing in runtime, we simulate with a cool CSS effect for now
// import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export const StreakCelebrationModal = () => {
  const { showStreakCelebration, currentStreakVal, closeStreakCelebration } = useNutritionStore();
  const insets = useSafeAreaInsets();

  if (!showStreakCelebration) return null;

  // Let's create the week days to render the checkmarks (conceptual for now)
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0 is Sunday, so map to index 6

  return (
    <Modal visible={showStreakCelebration} animationType="fade" transparent>
      <View style={styles.overlay}>
        {/* The fiery living background effect */}
        <View style={styles.glowOrb} />
        
        <View style={styles.content}>
          <View style={styles.flameContainer}>
            {/* LottieView could go here. For now, a fiery icon */}
            <Feather name="target" size={80} color="#FF5722" />
          </View>
          
          <Text style={styles.streakNumber}>{currentStreakVal}</Text>
          <Text style={styles.streakLabel}>Jours d'affilée !</Text>

          <View style={styles.weekContainer}>
            {weekDays.map((day, index) => {
              const isPastOrToday = index <= todayIndex;
              const isToday = index === todayIndex;
              return (
                <View key={index} style={styles.dayCol}>
                  <Text style={[styles.dayLabel, { color: isToday ? '#FFF' : '#888' }]}>{day}</Text>
                  <View style={[
                    styles.checkCircle,
                    isPastOrToday && { backgroundColor: '#FF572230', borderColor: '#FF5722' },
                    isToday && { backgroundColor: '#FF5722', shadowColor: '#FF5722', shadowOpacity: 0.8, shadowRadius: 10 }
                  ]}>
                    {isPastOrToday && <Feather name="check" size={14} color={isToday ? '#FFF' : '#FF5722'} />}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.fireText}>Tu es en feu ! 🔥</Text>

          <TouchableOpacity 
            style={[styles.continueButton, { paddingBottom: Math.max(insets.bottom, 20) }]} 
            onPress={closeStreakCelebration}
          >
            <Text style={styles.continueButtonText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#050505', // Deep black background for the "Living Flow" dark mode
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: '#FF5722',
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
    // We would use reanimated to pulse this
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  flameContainer: {
    marginBottom: 20,
    shadowColor: '#FF5722',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  streakNumber: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 90,
  },
  streakLabel: {
    fontSize: 24,
    color: '#FF5722',
    fontWeight: '700',
    marginBottom: 50,
  },
  weekContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333',
  },
  dayCol: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginTop: 30,
  },
  continueButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  }
});
