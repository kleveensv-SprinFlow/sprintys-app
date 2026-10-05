import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useCheckInStore } from '../../../store/checkInStore';

interface MentalStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface ScaleOption {
  value: number;
  label: string;
  emoji: string;
}

const ENERGY_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'À plat', emoji: '🪫' },
  { value: 2, label: 'Fatigué', emoji: '🥱' },
  { value: 3, label: 'Correct', emoji: '🔋' },
  { value: 4, label: 'En forme', emoji: '⚡' },
  { value: 5, label: 'En feu', emoji: '🔥' }
];

const STRESS_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Serein', emoji: '🌿' },
  { value: 2, label: 'Tranquille', emoji: '🧘' },
  { value: 3, label: 'Modéré', emoji: '⚖️' },
  { value: 4, label: 'Sous tension', emoji: '⏳' },
  { value: 5, label: 'Très stressé', emoji: '💥' }
];

const MOTIVATION_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Flemme', emoji: '🛋️' },
  { value: 2, label: 'Moyenne', emoji: '🚶' },
  { value: 3, label: 'Prêt', emoji: '👟' },
  { value: 4, label: 'Déterminé', emoji: '🎯' },
  { value: 5, label: 'À bloc', emoji: '🚀' }
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

  const renderOptionSelector = (
    label: string,
    currentValue: number,
    setValue: (val: number) => void,
    options: ScaleOption[],
    icon: any
  ) => {
    const selectedOption = options.find(o => o.value === currentValue) || options[2];

    return (
      <View style={[styles.selectorContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '15' }]}>
              <Feather name={icon} size={18} color={theme.colors.accent} />
            </View>
            <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
          </View>
          <View style={[styles.activePill, { backgroundColor: theme.colors.accent + '20' }]}>
            <Text style={[styles.activePillText, { color: theme.colors.accent }]}>
              {selectedOption.label}
            </Text>
          </View>
        </View>

        <View style={styles.optionsRow}>
          {options.map(item => {
            const isActive = currentValue === item.value;
            return (
              <TouchableOpacity 
                key={item.value} 
                activeOpacity={0.7}
                style={[
                  styles.optionButton, 
                  isActive && [styles.optionButtonActive, { backgroundColor: theme.colors.accent + '25', borderColor: theme.colors.accent }]
                ]}
                onPress={() => setValue(item.value)}
              >
                <Text style={styles.optionEmoji}>{item.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Mental & Énergie</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Comment te sens-tu ce matin ?</Text>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderOptionSelector('Niveau d\'énergie', energy, setEnergy, ENERGY_OPTIONS, 'zap')}
        {renderOptionSelector('Charge mentale / Stress', stress, setStress, STRESS_OPTIONS, 'wind')}
        {renderOptionSelector('Motivation', motivation, setMotivation, MOTIVATION_OPTIONS, 'target')}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.colors.accent }]} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Suivant</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24 },
  scrollContent: { flex: 1 },
  
  selectorContainer: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '700' },
  activePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activePillText: { fontSize: 13, fontWeight: '700' },
  
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  optionButton: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  optionButtonActive: { transform: [{ scale: 1.05 }], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  optionEmoji: { fontSize: 24 },
  
  footer: { flexDirection: 'row', gap: 16, marginBottom: 40, marginTop: 'auto' },
  backBtn: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  nextBtn: { flex: 1, height: 60, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
