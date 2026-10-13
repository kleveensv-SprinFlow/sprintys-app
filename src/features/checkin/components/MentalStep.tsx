import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../core/theme';
import { useCheckInStore } from '../../../store/checkInStore';
import { ScaleCard, ScaleOption } from './ScaleChips';
import { StepFooter } from './StepFooter';

interface MentalStepProps {
  onNext: () => void;
  onBack: () => void;
}

const ENERGY_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'À plat', icon: 'battery' },
  { value: 2, label: 'Fatigué', icon: 'cloud' },
  { value: 3, label: 'Correct', icon: 'battery-charging' },
  { value: 4, label: 'En forme', icon: 'zap' },
  { value: 5, label: 'En feu', icon: 'sun' },
];

const STRESS_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Serein', icon: 'feather' },
  { value: 2, label: 'Tranquille', icon: 'smile' },
  { value: 3, label: 'Modéré', icon: 'meh' },
  { value: 4, label: 'Sous tension', icon: 'alert-circle' },
  { value: 5, label: 'Très stressé', icon: 'alert-triangle' },
];

const MOTIVATION_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Flemme', icon: 'pause-circle' },
  { value: 2, label: 'Moyenne', icon: 'play-circle' },
  { value: 3, label: 'Prêt', icon: 'flag' },
  { value: 4, label: 'Déterminé', icon: 'target' },
  { value: 5, label: 'À bloc', icon: 'trending-up' },
];

export const MentalStep = ({ onNext, onBack }: MentalStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateMental } = useCheckInStore();

  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(2); // 1 = serein, 5 = très stressé
  const [motivation, setMotivation] = useState(3);

  useEffect(() => {
    if (currentCheckIn) {
      setEnergy(6 - (currentCheckIn.fatigue_level || 3));
      setStress(currentCheckIn.stress_level || 2);
      setMotivation(currentCheckIn.motivation_level || 3);
    }
  }, [currentCheckIn]);

  const handleNext = () => {
    const fatigue_level = 6 - energy;
    const stress_level = stress;
    updateMental(stress_level, fatigue_level, motivation);
    onNext();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Mental & énergie</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Comment te sens-tu ce matin ?</Text>

        <ScaleCard
          title="Niveau d’énergie"
          icon="zap"
          value={energy}
          onChange={setEnergy}
          options={ENERGY_OPTIONS}
        />
        <ScaleCard
          title="Charge mentale / stress"
          icon="wind"
          value={stress}
          onChange={setStress}
          options={STRESS_OPTIONS}
        />
        <ScaleCard
          title="Motivation"
          icon="target"
          value={motivation}
          onChange={setMotivation}
          options={MOTIVATION_OPTIONS}
        />
      </ScrollView>

      <StepFooter title="Suivant" onPress={handleNext} onBack={onBack} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 20 },
});
