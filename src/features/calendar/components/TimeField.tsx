import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { Button } from '../../../shared/components/Button';

export interface SessionTime {
  h: number;
  m: number;
}

export const formatTime = (t: SessionTime) => `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;

/** "18:30" from a stored session, only when the coach chose a time (measures.has_time). */
export const timeLabelOf = (workout: any): string | null => {
  if (!workout?.measures?.has_time || !workout?.date_prevue) return null;
  const d = new Date(workout.date_prevue);
  return Number.isNaN(d.getTime()) ? null : formatTime({ h: d.getHours(), m: d.getMinutes() });
};

/**
 * Optional time of a session. Without a time the session keeps its default hour and shows none on the cards.
 */
export function useSessionTime(visible: boolean, initialWorkout?: any) {
  const [time, setTime] = useState<SessionTime | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialWorkout?.measures?.has_time && initialWorkout?.date_prevue) {
      const d = new Date(initialWorkout.date_prevue);
      setTime({ h: d.getHours(), m: d.getMinutes() });
    } else {
      setTime(null);
    }
  }, [visible, initialWorkout?.id, initialWorkout?.date_prevue]);

  /** The day at the chosen time, or at the default hour when none was chosen. */
  const applyTo = (day: Date, defaultHour: number) => {
    const d = new Date(day);
    if (time) d.setHours(time.h, time.m, 0, 0);
    else d.setHours(defaultHour, 0, 0, 0);
    return d;
  };

  /** Flag stored in measures so cards only show a time that was really chosen. */
  const flag = (): { has_time?: true } => (time ? { has_time: true } : {});

  return { time, setTime, applyTo, flag };
}

const toDate = (t: SessionTime | null) => {
  const d = new Date();
  d.setHours(t?.h ?? 18, t?.m ?? 0, 0, 0);
  return d;
};

export function TimeField({ time, onChange }: { time: SessionTime | null; onChange: (t: SessionTime | null) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SessionTime>(time ?? { h: 18, m: 0 });
  const [webText, setWebText] = useState('');

  const pick = (event: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (d && event.type !== 'dismissed') {
      const t = { h: d.getHours(), m: d.getMinutes() };
      if (Platform.OS === 'android') onChange(t);
      else setDraft(t);
    }
  };

  const openPicker = () => {
    setDraft(time ?? { h: 18, m: 0 });
    setWebText(time ? formatTime(time) : '');
    setOpen(true);
  };

  const commitWeb = (text: string) => {
    setWebText(text);
    const m = text.match(/^(\d{1,2}):(\d{2})$/);
    if (m && +m[1] < 24 && +m[2] < 60) onChange({ h: +m[1], m: +m[2] });
  };

  return (
    <>
      <View style={styles.row}>
        <PressableScale haptic="selection" onPress={openPicker} style={styles.main} accessibilityRole="button" accessibilityLabel="Choisir l’heure de la séance">
          <View style={styles.icon}>
            <Feather name="clock" size={15} color={theme.colors.sprintyBlue} />
          </View>
          <Text style={styles.label}>Heure</Text>
          <Text style={[styles.value, !time && styles.valueMuted]}>{time ? formatTime(time) : 'Pas d’heure précise'}</Text>
        </PressableScale>
        {time && (
          <PressableScale haptic="selection" onPress={() => onChange(null)} style={styles.clear} hitSlop={8} accessibilityLabel="Retirer l’heure">
            <Feather name="x" size={16} color={theme.colors.textSecondary} />
          </PressableScale>
        )}
      </View>

      {Platform.OS === 'ios' && (
        <BottomSheet visible={open} onClose={() => setOpen(false)} title="Heure de la séance">
          <DateTimePicker value={toDate(draft)} mode="time" is24Hour display="spinner" onChange={pick} textColor={theme.colors.text} />
          <Button
            title="Valider"
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          />
        </BottomSheet>
      )}
      {Platform.OS === 'android' && open && <DateTimePicker value={toDate(time)} mode="time" is24Hour display="default" onChange={pick} />}
      {Platform.OS === 'web' && (
        <BottomSheet visible={open} onClose={() => setOpen(false)} title="Heure de la séance">
          <TextInput value={webText} onChangeText={commitWeb} placeholder="18:30" style={styles.webInput} />
          <Button title="Valider" onPress={() => setOpen(false)} />
        </BottomSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginBottom: 14,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12 },
  icon: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  value: { fontSize: 15, fontWeight: '800', color: theme.colors.sprintyBlue },
  valueMuted: { fontWeight: '600', color: theme.colors.textMuted },
  clear: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  webInput: { height: 44, borderRadius: 12, backgroundColor: theme.colors.glassFill, paddingHorizontal: 12, fontSize: 16, marginBottom: 12 },
});
