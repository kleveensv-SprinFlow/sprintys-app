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

  const [stress, setStress] = useState(5);
  const [fatigue, setFatigue] = useState(5);
  const [motivation, setMotivation] = useState(5);

  useEffect(() => {
    if (currentCheckIn) {
      setStress(currentCheckIn.stress_level || 5);
      setFatigue(currentCheckIn.fatigue_level || 5);
      setMotivation(currentCheckIn.motivation_level || 5);
    }
  }, [currentCheckIn]);

  const handleNext = () => {
    updateMental(stress, fatigue, motivation);
    onNext();
  };

  const renderSlider = (label: string, value: number, setValue: (val: number) => void, minLabel: string, maxLabel: string, color: string, icon: any) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderTitleRow}>
          <Feather name={icon} size={20} color={color} />
          <Text style={styles.sliderLabel}>{label}</Text>
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
        <Text style={styles.sliderExtremity}>{minLabel}</Text>
        <Text style={styles.sliderExtremity}>{maxLabel}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>État mental</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Comment te sens-tu globalement aujourd'hui ?</Text>

        {renderSlider(
          "Niveau de Fatigue", 
          fatigue, 
          setFatigue, 
          "En pleine forme", 
          "Épuisé(e)", 
          theme.colors.warning, 
          "battery"
        )}

        {renderSlider(
          "Niveau de Stress", 
          stress, 
          setStress, 
          "Détendu(e)", 
          "Très stressé(e)", 
          theme.colors.error, 
          "activity"
        )}

        {renderSlider(
          "Motivation pour l'entraînement", 
          motivation, 
          setMotivation, 
          "Aucune envie", 
          "Ultra motivé(e)", 
          theme.colors.success, 
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  subtitle: { fontSize: 16, color: '#A0A0A0', marginBottom: 30, textAlign: 'center' },
  
  sliderContainer: {
    backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#333'
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sliderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  sliderValue: { fontSize: 18, fontWeight: 'bold' },
  slider: { width: '100%', height: 40 },
  sliderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  sliderExtremity: { fontSize: 12, color: '#666' },

  footer: { padding: 24, paddingBottom: 40 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, gap: 10
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
