import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useCheckInStore } from '../../../store/checkInStore';
import Slider from '@react-native-community/slider';

interface MentalStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const MentalStep = ({ onNext, onBack }: MentalStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateMental } = useCheckInStore();

  // Dans l'UI, 10 est toujours positif (Énergie, Sérénité, Motivation)
  // En base de données, c'est l'inverse pour la fatigue et le stress.
  const [energy, setEnergy] = useState(5);
  const [serenity, setSerenity] = useState(5);
  const [motivation, setMotivation] = useState(5);

  useEffect(() => {
    if (currentCheckIn) {
      setEnergy(11 - (currentCheckIn.fatigue_level || 6));
      setSerenity(11 - (currentCheckIn.stress_level || 6));
      setMotivation(currentCheckIn.motivation_level || 5);
    }
  }, [currentCheckIn]);

  const handleNext = () => {
    const fatigue_level = 11 - energy;
    const stress_level = 11 - serenity;
    updateMental(stress_level, fatigue_level, motivation);
    onNext();
  };

  const getColorByValue = (val: number) => {
    if (val <= 3) return theme.colors.error;
    if (val <= 7) return '#F97316'; // Orange
    return theme.colors.success;
  };

  const renderSlider = (label: string, value: number, setValue: (val: number) => void, minLabel: string, maxLabel: string, icon: any) => {
    const color = getColorByValue(value);
    
    return (
      <View style={[styles.sliderContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.sliderHeader}>
          <View style={styles.sliderTitleRow}>
            <Feather name={icon} size={20} color={color} />
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>{label}</Text>
          </View>
          <Text style={[styles.sliderValue, { color }]}>{value}/10</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={setValue}
          minimumTrackTintColor={color}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={color}
        />
        <View style={styles.sliderFooter}>
          <Text style={[styles.sliderExtremity, { color: theme.colors.textMuted }]}>{minLabel}</Text>
          <Text style={[styles.sliderExtremity, { color: theme.colors.textMuted }]}>{maxLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>État mental</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Comment te sens-tu globalement aujourd'hui ?</Text>

        {renderSlider(
          "Niveau d'Énergie", 
          energy, 
          setEnergy, 
          "Épuisé(e)", 
          "En pleine forme", 
          "battery-charging"
        )}

        {renderSlider(
          "Niveau de Sérénité", 
          serenity, 
          setSerenity, 
          "Très stressé(e)", 
          "Détendu(e)", 
          "smile"
        )}

        {renderSlider(
          "Motivation", 
          motivation, 
          setMotivation, 
          "Aucune envie", 
          "Ultra motivé(e)", 
          "zap"
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.accent }]} onPress={handleNext}>
          <Text style={styles.buttonText}>Suivant</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  subtitle: { fontSize: 16, marginBottom: 30, textAlign: 'center' },
  
  sliderContainer: {
    padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sliderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderLabel: { fontSize: 16, fontWeight: 'bold' },
  sliderValue: { fontSize: 18, fontWeight: 'bold' },
  slider: { width: '100%', height: 40 },
  sliderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  sliderExtremity: { fontSize: 12 },

  footer: { padding: 24, paddingBottom: 40 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, gap: 10
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
