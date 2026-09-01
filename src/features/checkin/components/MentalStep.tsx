import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useCheckInStore } from '../../../store/checkInStore';

interface MentalStepProps {
  onNext: () => void;
  onBack: () => void;
}

const EMOJI_SCALE = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '🤩' }
];

export const MentalStep = ({ onNext, onBack }: MentalStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateMental } = useCheckInStore();

  const [energy, setEnergy] = useState(3);
  const [serenity, setSerenity] = useState(3);
  const [motivation, setMotivation] = useState(3);

  useEffect(() => {
    if (currentCheckIn) {
      setEnergy(6 - (currentCheckIn.fatigue_level || 3));
      setSerenity(6 - (currentCheckIn.stress_level || 3));
      setMotivation(currentCheckIn.motivation_level || 3);
    }
  }, [currentCheckIn]);

  const handleNext = () => {
    const fatigue_level = 6 - energy;
    const stress_level = 6 - serenity;
    updateMental(stress_level, fatigue_level, motivation);
    onNext();
  };

  const renderEmojiSelector = (label: string, value: number, setValue: (val: number) => void, minLabel: string, maxLabel: string, icon: any) => {
    return (
      <View style={[styles.selectorContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
              <Feather name={icon} size={20} color={theme.colors.accent} />
            </View>
            <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.emojiRow}>
          {EMOJI_SCALE.map(item => {
            const isActive = value === item.value;
            return (
              <TouchableOpacity 
                key={item.value} 
                style={[
                  styles.emojiButton, 
                  isActive && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }
                ]}
                onPress={() => setValue(item.value)}
              >
                <Text style={styles.emojiText}>{item.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.labelsRow}>
          <Text style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>{minLabel}</Text>
          <Text style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>{maxLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Mental & Énergie</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Comment vous sentez-vous aujourd'hui ?</Text>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderEmojiSelector('Énergie', energy, setEnergy, 'Épuisé', 'En pleine forme', 'zap')}
        {renderEmojiSelector('Sérénité (Stress)', serenity, setSerenity, 'Très stressé', 'Détendu', 'wind')}
        {renderEmojiSelector('Motivation', motivation, setMotivation, 'Aucune', 'À bloc', 'target')}
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
  label: { fontSize: 18, fontWeight: 'bold' },
  
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  emojiButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiText: { fontSize: 24 },
  
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  scaleLabel: { fontSize: 12, fontWeight: '500' },
  
  footer: { flexDirection: 'row', gap: 16, marginBottom: 40, marginTop: 'auto' },
  backBtn: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  nextBtn: { flex: 1, height: 60, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
