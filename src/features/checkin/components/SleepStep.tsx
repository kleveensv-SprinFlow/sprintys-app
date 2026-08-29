import { StyleSheet, Text, View, TextInput, TouchableOpacity, Switch, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import Slider from '@react-native-community/slider';

interface SleepStepProps {
  onNext: () => void;
  onClose: () => void;
}

export const SleepStep = ({ onNext, onClose }: SleepStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateSleep, setMenstruation } = useCheckInStore();
  const { user } = useAuthStore();
  
  // Checking gender correctly according to typical Supabase auth / profile setups
  const isFemale = user?.profile?.gender === 'female' || user?.profile?.gender === 'Femme';
  
  const [bedtime, setBedtime] = useState(currentCheckIn?.bedtime || '23:00');
  const [wakeup, setWakeup] = useState(currentCheckIn?.wakeup_time || '07:00');
  const [sleepQuality, setSleepQuality] = useState(currentCheckIn?.sleep_quality || 3);
  const [duration, setDuration] = useState({ hours: 8, minutes: 0, decimal: 8 });

  useEffect(() => {
    calculateDuration(bedtime, wakeup);
  }, [bedtime, wakeup]);

  const calculateDuration = (start: string, end: string) => {
    try {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);

      let startMin = startH * 60 + startM;
      let endMin = endH * 60 + endM;

      if (endMin < startMin) endMin += 24 * 60;

      const diffMin = endMin - startMin;
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      const decimal = diffMin / 60;

      setDuration({ hours, minutes, decimal });
    } catch (e) {}
  };

  const handleNext = () => {
    if (!bedtime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) return;
    if (!wakeup.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) return;

    updateSleep(bedtime, wakeup, duration.decimal, sleepQuality);
    onNext();
  };

  const formatTimeInput = (text: string, setter: (val: string) => void) => {
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + ':' + formatted.substring(2, 4);
    }
    setter(formatted);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sommeil</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Combien de temps as-tu dormi ?
        </Text>

        <View style={styles.inputContainer}>
          <View style={styles.timeBlock}>
            <Feather name="moon" size={24} color={theme.colors.accent} />
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Coucher</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
              value={bedtime}
              onChangeText={(t) => formatTimeInput(t, setBedtime)}
              keyboardType="numeric"
              maxLength={5}
              placeholder="23:00"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.timeBlock}>
            <Feather name="sun" size={24} color={theme.colors.warning} />
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Réveil</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
              value={wakeup}
              onChangeText={(t) => formatTimeInput(t, setWakeup)}
              keyboardType="numeric"
              maxLength={5}
              placeholder="07:00"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <View style={[styles.resultCard, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Durée du sommeil</Text>
          <Text style={[styles.resultValue, { color: theme.colors.text }]}>
            {duration.hours}h {duration.minutes > 0 ? `${duration.minutes}m` : ''}
          </Text>
        </View>

        <View style={[styles.sliderContainer, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>Qualité du sommeil</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.accent }]}>{sleepQuality}/5</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={sleepQuality}
            onValueChange={setSleepQuality}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
          />
          <View style={styles.sliderFooter}>
            <Text style={styles.sliderExtremity}>Mauvais</Text>
            <Text style={styles.sliderExtremity}>Excellent</Text>
          </View>
        </View>

        {isFemale && (
          <View style={[styles.menstruationCard, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
            <View style={styles.menstruationInfo}>
              <Text style={[styles.menstruationTitle, { color: theme.colors.text }]}>Cycle Menstruel</Text>
              <Text style={[styles.menstruationSubtitle, { color: theme.colors.textSecondary }]}>Es-tu en période de règles ?</Text>
            </View>
            <Switch
              value={currentCheckIn?.menstruation || false}
              onValueChange={setMenstruation}
              trackColor={{ false: theme.colors.border, true: theme.colors.error }}
              thumbColor={'#FFF'}
            />
          </View>
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
  subtitle: { fontSize: 16, marginBottom: 30, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16 },
  timeBlock: { flex: 1, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    fontSize: 24, fontWeight: 'bold', textAlign: 'center',
    paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1, width: '100%',
  },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  resultLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  resultValue: { fontSize: 28, fontWeight: 'bold' },
  
  sliderContainer: { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sliderLabel: { fontSize: 16, fontWeight: 'bold' },
  sliderValue: { fontSize: 18, fontWeight: 'bold' },
  slider: { width: '100%', height: 40 },
  sliderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  sliderExtremity: { fontSize: 12, color: '#666' },

  menstruationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 40,
  },
  menstruationInfo: { flex: 1, paddingRight: 16 },
  menstruationTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  menstruationSubtitle: { fontSize: 13 },
  
  footer: { padding: 24, paddingBottom: 40 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, gap: 10,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
