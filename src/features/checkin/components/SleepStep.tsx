import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import { Switch } from 'react-native';

interface SleepStepProps {
  onNext: () => void;
}

export const SleepStep = ({ onNext }: SleepStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateSleep, setMenstruation } = useCheckInStore();
  const { user } = useAuthStore();
  const isFemale = user?.gender === 'femme';
  
  // Format HH:MM
  const [bedtime, setBedtime] = useState(currentCheckIn?.bedtime || '23:00');
  const [wakeup, setWakeup] = useState(currentCheckIn?.wakeup_time || '07:00');
  
  const [duration, setDuration] = useState({ hours: 8, minutes: 0, decimal: 8 });

  // Calculate duration whenever bedtime or wakeup changes
  useEffect(() => {
    calculateDuration(bedtime, wakeup);
  }, [bedtime, wakeup]);

  const calculateDuration = (start: string, end: string) => {
    try {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);

      let startMin = startH * 60 + startM;
      let endMin = endH * 60 + endM;

      // If wakeup is earlier than bedtime, assume it's the next day
      if (endMin < startMin) {
        endMin += 24 * 60;
      }

      const diffMin = endMin - startMin;
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      const decimal = diffMin / 60;

      setDuration({ hours, minutes, decimal });
    } catch (e) {
      // Invalid format, ignore
    }
  };

  const handleNext = () => {
    // Basic validation
    if (!bedtime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) return;
    if (!wakeup.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) return;

    updateSleep(bedtime, wakeup, duration.decimal);
    onNext();
  };

  // Helper to format text input (auto-insert colon)
  const formatTimeInput = (text: string, setter: (val: string) => void) => {
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + ':' + formatted.substring(2, 4);
    }
    setter(formatted);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Votre Sommeil</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Combien de temps avez-vous dormi cette nuit ?
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

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

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
        <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Durée totale du sommeil</Text>
        <Text style={[styles.resultValue, { color: theme.colors.text }]}>
          {duration.hours}h {duration.minutes > 0 ? `${duration.minutes}m` : ''}
        </Text>
      </View>

      {isFemale && (
        <View style={[styles.menstruationCard, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <View style={styles.menstruationInfo}>
            <Text style={[styles.menstruationTitle, { color: theme.colors.text }]}>Cycle Menstruel</Text>
            <Text style={[styles.menstruationSubtitle, { color: theme.colors.textSecondary }]}>Êtes-vous en période de règles ?</Text>
          </View>
          <Switch
            value={currentCheckIn?.menstruation || false}
            onValueChange={setMenstruation}
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor={'#FFF'}
          />
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.colors.accent }]} 
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Suivant</Text>
        <Feather name="arrow-right" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '80%',
  },
  divider: {
    width: 2,
    height: 40,
    marginTop: 30,
  },
  resultCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 40,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  menstruationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 40,
  },
  menstruationInfo: {
    flex: 1,
    paddingRight: 16,
  },
  menstruationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menstruationSubtitle: {
    fontSize: 13,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginTop: 'auto',
    marginBottom: 40,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
