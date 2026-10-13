import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { SleepStep } from './SleepStep';
import { MentalStep } from './MentalStep';
import { PainStep } from './PainStep';
import { useCheckInStore } from '../../../store/checkInStore';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { IconButton } from '../../../shared/components/IconButton';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
}

const TOTAL_STEPS = 3;

export const CheckInModal = ({ visible, onClose }: CheckInModalProps) => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const { submitCheckIn, cancelCheckIn } = useCheckInStore();

  // Progress bar (width, JS driver) + step transition (opacity / translateX, native driver)
  const progress = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  const enter = useRef(new Animated.Value(1)).current;
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: step / TOTAL_STEPS,
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 2 }).start();
  }, [step]);

  const handleClose = () => {
    cancelCheckIn();
    setStep(1);
    onClose();
  };

  const handleNext = () => {
    setDirection(1);
    setStep(step + 1);
  };
  const handleBack = () => {
    setDirection(-1);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const success = await submitCheckIn();
    if (success) {
      setStep(1);
      onClose();
    }
  };

  const contentStyle = {
    opacity: enter,
    transform: [
      { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [28 * direction, 0] }) },
    ],
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <FeedbackHost />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backdrop }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon="x" onPress={handleClose} accessibilityLabel="Fermer" />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Check-in du jour</Text>
            <Text style={[styles.headerStep, { color: theme.colors.textSecondary }]}>
              Étape {step} sur {TOTAL_STEPS}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.stepperContainer}>
          <View style={[styles.stepTrack, { backgroundColor: theme.colors.glassFill }]}>
            <Animated.View
              style={[
                styles.stepProgress,
                {
                  backgroundColor: theme.colors.sprintyBlue,
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        </View>

        <Animated.View style={[styles.content, contentStyle]}>
          {step === 1 && <SleepStep onNext={handleNext} onClose={handleClose} />}
          {step === 2 && <MentalStep onNext={handleNext} onBack={handleBack} />}
          {step === 3 && <PainStep onBack={handleBack} onSubmit={handleSubmit} />}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerStep: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  headerSpacer: {
    width: 38,
  },
  stepperContainer: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  stepTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepProgress: {
    height: '100%',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
});
