import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { Feather } from '@expo/vector-icons';
import { useCheckInStore } from '../../../store/checkInStore';
import { useAuthStore } from '../../../store/authStore';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { Button } from '../../../shared/components/Button';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { ScaleCard, ScaleOption } from './ScaleChips';
import { StepFooter } from './StepFooter';

interface SleepStepProps {
  onNext: () => void;
  /** Raccourci « Comme hier » : reprend la dernière réponse en un toucher. */
  quick?: { title: string; detail: string; onPress: () => void } | null;
  /** Kept for API compatibility: closing is handled by the CheckInModal header. */
  onClose: () => void;
}

const SLEEP_OPTIONS: (ScaleOption & { longLabel: string })[] = [
  { value: 1, icon: 'cloud-lightning', label: 'Agitée', longLabel: 'Nuit blanche / agitée' },
  { value: 2, icon: 'cloud-drizzle', label: 'Hachée', longLabel: 'Difficile / haché' },
  { value: 3, icon: 'cloud', label: 'Correcte', longLabel: 'Correct' },
  { value: 4, icon: 'moon', label: 'Bonne', longLabel: 'Réparateur' },
  { value: 5, icon: 'star', label: 'Au top', longLabel: 'Au top de ma forme' },
];

export const SleepStep = ({ onNext, quick }: SleepStepProps) => {
  const theme = useTheme();
  const { currentCheckIn, updateSleep, history } = useCheckInStore();
  const { user, updateSleepGoal } = useAuthStore();

  const sleepGoal = user?.sleepGoal || 8;

  // Nettoyer les heures au format standard HH:mm (suppression d'éventuelles secondes :00)
  const sanitizeTime = (t?: string | null) => {
    if (!t) return null;
    const parts = t.split(':');
    return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
  };

  // Valeurs déjà saisies (édition du jour) sinon dernière réponse connue, sinon rien : jamais de valeur inventée.
  const hasAll = (c?: { bedtime?: string | null; wakeup_time?: string | null; sleep_quality?: number | null } | null) =>
    !!c && c.bedtime != null && c.wakeup_time != null && c.sleep_quality != null;
  const answered = hasAll(currentCheckIn);
  const suggestion = history.find((h) => hasAll(h));
  const source = answered ? currentCheckIn : suggestion;
  const isPrefilled = !answered && !!suggestion;

  const [bedtime, setBedtime] = useState<string | null>(sanitizeTime(source?.bedtime));
  const [wakeup, setWakeup] = useState<string | null>(sanitizeTime(source?.wakeup_time));
  const [sleepQuality, setSleepQuality] = useState<number | null>(source?.sleep_quality ?? null);
  const [touched, setTouched] = useState(false);
  const [duration, setDuration] = useState<{ hours: number; minutes: number; decimal: number } | null>(null);

  const [showPicker, setShowPicker] = useState<'bedtime' | 'wakeup' | null>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState(sleepGoal);

  useEffect(() => {
    calculateDuration(bedtime, wakeup);
  }, [bedtime, wakeup]);

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) {
      setDuration(null);
      return;
    }
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

  const complete = !!bedtime && !!wakeup && !!duration && sleepQuality != null;

  const handleNext = () => {
    if (!bedtime || !wakeup || !duration || sleepQuality == null) return;
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

      setTouched(true);
      if (showPicker === 'bedtime') {
        setBedtime(timeString);
      } else if (showPicker === 'wakeup') {
        setWakeup(timeString);
      }
    }
  };

  // iOS : « Terminer » sans avoir fait défiler la roue valide l'heure affichée par la roue.
  const confirmPicker = () => {
    if (showPicker === 'bedtime' && !bedtime) setBedtime('23:00');
    if (showPicker === 'wakeup' && !wakeup) setWakeup('07:00');
    setTouched(true);
    setShowPicker(null);
  };

  const parseTimeStringToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const getDurationColor = () => {
    if (!duration) return theme.colors.textMuted;
    const diff = duration.decimal - sleepGoal;
    if (diff >= -0.5) return theme.colors.success;
    if (diff >= -2.0) return theme.colors.warning;
    return theme.colors.error;
  };

  const openGoal = () => {
    setTempGoal(sleepGoal);
    setShowGoalModal(true);
  };

  const saveGoal = () => {
    updateSleepGoal(tempGoal);
    setShowGoalModal(false);
  };

  const activeQualityLabel = SLEEP_OPTIONS.find(e => e.value === sleepQuality)?.longLabel;
  const durationColor = getDurationColor();

  const renderTimeBlock = (kind: 'bedtime' | 'wakeup') => {
    const isBed = kind === 'bedtime';
    return (
      <PressableScale
        haptic="selection"
        containerStyle={styles.timeBlock}
        style={[glassCard, styles.timeCard]}
        onPress={() => setShowPicker(kind)}
        accessibilityRole="button"
        accessibilityLabel={isBed ? `Heure de coucher, ${bedtime ?? 'à renseigner'}` : `Heure de réveil, ${wakeup ?? 'à renseigner'}`}
      >
        <View style={[styles.timeIcon, { backgroundColor: isBed ? 'rgba(0, 105, 232, 0.1)' : 'rgba(245, 158, 11, 0.12)' }]}>
          <Feather name={isBed ? 'moon' : 'sun'} size={18} color={isBed ? theme.colors.sprintyBlue : theme.colors.warning} />
        </View>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{isBed ? 'Coucher' : 'Réveil'}</Text>
        <Text style={[styles.timeText, { color: theme.colors.text }]}>{(isBed ? bedtime : wakeup) ?? '--:--'}</Text>
      </PressableScale>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {quick && !touched && (
          <PressableScale
            haptic="medium"
            onPress={quick.onPress}
            style={[glassCard, styles.quickCard, { borderColor: theme.colors.sprintyBlue }]}
            accessibilityRole="button"
            accessibilityLabel={`${quick.title}. ${quick.detail}`}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.colors.sprintyBlue }]}>
              <Feather name="repeat" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.quickBody}>
              <Text style={[styles.quickTitle, { color: theme.colors.text }]}>{quick.title}</Text>
              <Text style={[styles.quickDetail, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {quick.detail}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </PressableScale>
        )}
        <Text style={[styles.title, { color: theme.colors.text }]}>Sommeil</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Combien de temps as-tu dormi ?
        </Text>

        <View style={styles.inputContainer}>
          {renderTimeBlock('bedtime')}
          {renderTimeBlock('wakeup')}
        </View>

        <View style={[glassCard, styles.resultCard]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Durée du sommeil</Text>
          <Text style={[styles.resultValue, { color: durationColor }]}>
            {duration ? `${duration.hours}h ${duration.minutes > 0 ? `${duration.minutes}m` : ''}` : '—'}
          </Text>
          <PressableScale
            haptic="selection"
            onPress={openGoal}
            style={[styles.goalChip, { backgroundColor: theme.colors.glassFill }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Objectif de sommeil : ${sleepGoal} heures. Modifier`}
          >
            <Feather name="target" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.goalText, { color: theme.colors.textSecondary }]}>Objectif : {sleepGoal}h</Text>
            <Feather name="edit-2" size={12} color={theme.colors.textMuted} />
          </PressableScale>
        </View>

        <ScaleCard
          title="Qualité du sommeil"
          icon="moon"
          value={sleepQuality}
          onChange={(v) => {
            setTouched(true);
            setSleepQuality(v);
          }}
          options={SLEEP_OPTIONS}
          valueLabel={activeQualityLabel}
        />
      </ScrollView>

      <StepFooter
        title={isPrefilled && !touched ? 'C’est bien ça' : 'Suivant'}
        onPress={handleNext}
        disabled={!complete}
        onSkip={onNext}
      />

      {/* Goal Update Sheet */}
      <BottomSheet
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Objectif de sommeil"
        subtitle="Ajuste le temps dont tu as besoin pour te sentir pleinement reposé(e)."
      >
        <View style={styles.goalAdjuster}>
          <IconButton
            icon="minus"
            size={48}
            accessibilityLabel="Diminuer l’objectif"
            onPress={() => setTempGoal(Math.max(4, tempGoal - 0.5))}
          />
          <Text style={[styles.goalDisplay, { color: theme.colors.text }]}>{tempGoal}h</Text>
          <IconButton
            icon="plus"
            size={48}
            accessibilityLabel="Augmenter l’objectif"
            onPress={() => setTempGoal(Math.min(12, tempGoal + 0.5))}
          />
        </View>
        <View style={styles.sheetActions}>
          <Button title="Annuler" variant="ghost" onPress={() => setShowGoalModal(false)} style={styles.sheetBtn} />
          <Button title="Enregistrer" onPress={saveGoal} style={styles.sheetBtn} />
        </View>
      </BottomSheet>

      {/* DateTimePicker for iOS (sheet) or Android (native dialog) */}
      {Platform.OS === 'ios' && (
        <BottomSheet
          visible={!!showPicker}
          onClose={() => setShowPicker(null)}
          title={showPicker === 'wakeup' ? 'Heure de réveil' : 'Heure de coucher'}
        >
          <DateTimePicker
            value={parseTimeStringToDate((showPicker === 'bedtime' ? bedtime : wakeup) ?? (showPicker === 'bedtime' ? '23:00' : '07:00'))}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={handleTimeChange}
            textColor={theme.colors.text}
          />
          <Button title="Terminer" onPress={confirmPicker} />
        </BottomSheet>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={parseTimeStringToDate((showPicker === 'bedtime' ? bedtime : wakeup) ?? (showPicker === 'bedtime' ? '23:00' : '07:00'))}
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
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 18, borderWidth: 1.5 },
  quickIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickBody: { flex: 1, gap: 2 },
  quickTitle: { fontSize: 15, fontWeight: '800' },
  quickDetail: { fontSize: 13, lineHeight: 18 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 20 },

  inputContainer: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  timeBlock: { flex: 1 },
  timeCard: { alignItems: 'center', paddingVertical: 18 },
  timeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  timeText: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },

  resultCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 14 },
  resultValue: { fontSize: 36, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  goalText: { fontSize: 13, fontWeight: '700' },

  // Goal sheet
  goalAdjuster: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginVertical: 24 },
  goalDisplay: { fontSize: 36, fontWeight: '800', letterSpacing: -0.8, minWidth: 90, textAlign: 'center', fontVariant: ['tabular-nums'] },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetBtn: { flex: 1 },
});
