import React, { useState } from 'react';
import { Modal, StyleSheet, View, SafeAreaView } from 'react-native';
import { useTheme } from '../../../core/theme';
import { SleepStep } from './SleepStep';
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

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

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
        <View style={styles.content}>
          {step === 1 && <SleepStep onNext={handleNext} />}
          {step === 2 && <PainStep onBack={handleBack} onSubmit={handleSubmit} />}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
