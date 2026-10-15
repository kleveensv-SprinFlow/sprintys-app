import React, { useState } from 'react';
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
  const { currentCheckIn, updateMental, history } = useCheckInStore();

  // Valeurs déjà saisies (édition du jour) sinon dernière réponse connue, sinon rien : jamais de valeur inventée.
  const answered = currentCheckIn?.fatigue_level != null && currentCheckIn?.stress_level != null && currentCheckIn?.motivation_level != null;
  const suggestion = history.find((h) => h.fatigue_level != null && h.stress_level != null && h.motivation_level != null);
  const source = answered ? currentCheckIn : suggestion;
  const isPrefilled = !answered && !!suggestion;

  const [energy, setEnergy] = useState<number | null>(source?.fatigue_level != null ? 6 - source.fatigue_level : null);
  const [stress, setStress] = useState<number | null>(source?.stress_level ?? null); // 1 = serein, 5 = très stressé
  const [motivation, setMotivation] = useState<number | null>(source?.motivation_level ?? null);
  const [touched, setTouched] = useState(false);

  const complete = energy != null && stress != null && motivation != null;
  const change = (setter: (v: number) => void) => (v: number) => {
    setTouched(true);
    setter(v);
  };

  const handleNext = () => {
    if (energy == null || stress == null || motivation == null) return;
    updateMental(stress, 6 - energy, motivation);
    onNext();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Mental & énergie</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {isPrefilled && !touched ? 'Comme ta dernière réponse. Ajuste si ce n’est plus ça.' : 'Comment te sens-tu ce matin ?'}
        </Text>

        <ScaleCard
          title="Niveau d’énergie"
          icon="zap"
          value={energy}
          onChange={change(setEnergy)}
          options={ENERGY_OPTIONS}
        />
        <ScaleCard
          title="Charge mentale / stress"
          icon="wind"
          value={stress}
          onChange={change(setStress)}
          options={STRESS_OPTIONS}
        />
        <ScaleCard
          title="Motivation"
          icon="target"
          value={motivation}
          onChange={change(setMotivation)}
          options={MOTIVATION_OPTIONS}
        />
      </ScrollView>

      <StepFooter
        title={isPrefilled && !touched ? 'C’est bien ça' : 'Suivant'}
        onPress={handleNext}
        onBack={onBack}
        disabled={!complete}
        onSkip={onNext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 20 },
});
