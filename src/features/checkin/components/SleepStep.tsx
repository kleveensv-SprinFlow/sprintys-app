import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Platform, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../core/theme';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface SleepStepProps {
  onNext: () => void;
  onClose: () => void;
}

const SLEEP_EMOJIS = [
  { value: 1, emoji: '😫', label: 'Épuisé' },
  { value: 2, emoji: '🥱', label: 'Agité' },
  { value: 3, emoji: '😐', label: 'Moyen' },
  { value: 4, emoji: '🙂', label: 'Bon' },
  { value: 5, emoji: '🤩', label: 'Excellent' }
];

export const SleepStep = ({ onNext, onClose }: SleepStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateSleep, setMenstruation } = useCheckInStore();
  const { user, updateSleepGoal } = useAuthStore();
  
  const isFemale = user?.gender === 'femme' || (user as any)?.profile?.gender === 'femme' || (user as any)?.profile?.gender === 'female';
  
  const sleepGoal = user?.sleepGoal || 8;

  const [bedtime, setBedtime] = useState(currentCheckIn?.bedtime || '23:00');
  const [wakeup, setWakeup] = useState(currentCheckIn?.wakeup_time || '07:00');
  const [sleepQuality, setSleepQuality] = useState(currentCheckIn?.sleep_quality || 3);
  const [duration, setDuration] = useState({ hours: 8, minutes: 0, decimal: 8 });

  const [showPicker, setShowPicker] = useState<'bedtime' | 'wakeup' | null>(null);
  
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState(sleepGoal);

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
    updateSleep(bedtime, wakeup, duration.decimal, sleepQuality);
    onNext();
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    
    if (selectedDate && event.type !== 'dismissed') {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      if (showPicker === 'bedtime') {
        setBedtime(timeString);
      } else if (showPicker === 'wakeup') {
        setWakeup(timeString);
      }
    }
  };

  const parseTimeStringToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const getDurationColor = () => {
    const diff = duration.decimal - sleepGoal;
    if (diff >= -0.5) return theme.colors.success; 
    if (diff >= -2.0) return theme.colors.warning;
    return theme.colors.error;
  };

  const saveGoal = () => {
    updateSleepGoal(tempGoal);
    setShowGoalModal(false);
  };

  const activeEmojiLabel = SLEEP_EMOJIS.find(e => e.value === sleepQuality)?.label;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sommeil</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Combien de temps as-tu dormi ?
        </Text>

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.timeBlock} 
            activeOpacity={0.7}
            onPress={() => setShowPicker('bedtime')}
          >
            <Feather name="moon" size={24} color={theme.colors.accent} />
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Coucher</Text>
            <View style={[styles.timeBox, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
              <Text style={[styles.timeText, { color: theme.colors.text }]}>{bedtime}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.timeBlock} 
            activeOpacity={0.7}
            onPress={() => setShowPicker('wakeup')}
          >
            <Feather name="sun" size={24} color={theme.colors.warning} />
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Réveil</Text>
            <View style={[styles.timeBox, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
              <Text style={[styles.timeText, { color: theme.colors.text }]}>{wakeup}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.resultCard, { backgroundColor: theme.colors.surfaceLight, borderColor: getDurationColor() }]}>
          <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Durée du sommeil</Text>
          <Text style={[styles.resultValue, { color: getDurationColor() }]}>
            {duration.hours}h {duration.minutes > 0 ? `${duration.minutes}m` : ''}
          </Text>
          <TouchableOpacity onPress={() => setShowGoalModal(true)} style={styles.goalContainer}>
            <Text style={[styles.goalText, { color: theme.colors.textMuted }]}>
              Objectif : {sleepGoal}h <Feather name="edit-2" size={12} />
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sliderContainer, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>Qualité du sommeil</Text>
            <Text style={[styles.sliderValue, { color: theme.colors.accent }]}>{activeEmojiLabel}</Text>
          </View>
          
          <View style={styles.emojisRow}>
            {SLEEP_EMOJIS.map((item) => (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.7}
                style={[
                  styles.emojiButton,
                  sleepQuality === item.value && [styles.emojiButtonActive, { backgroundColor: theme.colors.accent + '30', borderColor: theme.colors.accent }]
                ]}
                onPress={() => setSleepQuality(item.value)}
              >
                <Text style={[styles.emojiText, sleepQuality === item.value && styles.emojiTextActive]}>{item.emoji}</Text>
              </TouchableOpacity>
            ))}
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

      {/* Goal Update Modal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Objectif de sommeil</Text>
            <Text style={[styles.modalDesc, { color: theme.colors.textSecondary }]}>
              Ajuste le temps dont tu as besoin pour te sentir pleinement reposé(e).
            </Text>
            
            <View style={styles.goalAdjuster}>
              <TouchableOpacity 
                style={[styles.adjustBtn, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={() => setTempGoal(Math.max(4, tempGoal - 0.5))}
              >
                <Feather name="minus" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.goalDisplay, { color: theme.colors.text }]}>{tempGoal}h</Text>
              
              <TouchableOpacity 
                style={[styles.adjustBtn, { backgroundColor: theme.colors.surfaceLight }]}
                onPress={() => setTempGoal(Math.min(12, tempGoal + 0.5))}
              >
                <Feather name="plus" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setShowGoalModal(false)}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.accent }]} onPress={saveGoal}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DateTimePicker for iOS (Modal) or Android */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(null)}>
                  <Text style={{ color: theme.colors.accent, fontWeight: 'bold', fontSize: 16 }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseTimeStringToDate(showPicker === 'bedtime' ? bedtime : wakeup)}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
                textColor={theme.colors.text}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={parseTimeStringToDate(showPicker === 'bedtime' ? bedtime : wakeup)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
  inputContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16 },
  timeBlock: { flex: 1, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  timeBox: {
    paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1, width: '100%', alignItems: 'center'
  },
  timeText: { fontSize: 24, fontWeight: 'bold' },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 2, alignItems: 'center', marginBottom: 24 },
  resultLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  resultValue: { fontSize: 32, fontWeight: 'bold' },
  goalContainer: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  goalText: { fontSize: 13, fontWeight: '600' },
  
  sliderContainer: { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sliderLabel: { fontSize: 16, fontWeight: 'bold' },
  sliderValue: { fontSize: 16, fontWeight: 'bold' },
  
  emojisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiButtonActive: { transform: [{ scale: 1.1 }] },
  emojiText: { fontSize: 24, opacity: 0.5 },
  emojiTextActive: { opacity: 1 },

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

  // Goal Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  goalAdjuster: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 32 },
  adjustBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  goalDisplay: { fontSize: 32, fontWeight: 'bold', width: 80, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },

  // DatePicker Overlay
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerContainer: { paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
