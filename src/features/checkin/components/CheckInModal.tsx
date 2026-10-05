import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { SleepStep } from './SleepStep';
import { MentalStep } from './MentalStep';
import { PainStep } from './PainStep';
import { useCheckInStore } from '../../../store/checkInStore';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CheckInModal = ({ visible, onClose }: CheckInModalProps) => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const { submitCheckIn, cancelCheckIn } = useCheckInStore();

  const handleClose = () => {
    cancelCheckIn();
    setStep(1);
    onClose();
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    const success = await submitCheckIn();
    if (success) {
      setStep(1);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Step Indicator Header */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepTrack}>
            <View 
              style={[
                styles.stepProgress, 
                { 
                  backgroundColor: theme.colors.accent, 
                  width: `${(step / 3) * 100}%` 
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.content}>
          {step === 1 && <SleepStep onNext={handleNext} onClose={handleClose} />}
          {step === 2 && <MentalStep onNext={handleNext} onBack={handleBack} />}
          {step === 3 && <PainStep onBack={handleBack} onSubmit={handleSubmit} />}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepperContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  stepTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepProgress: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});
