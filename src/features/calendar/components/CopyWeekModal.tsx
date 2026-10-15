import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, toast } from '../../../shared/feedback/appAlert';
import { workoutService } from '../../../services/workoutService';

interface Props {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  /** Any day of the week to copy */
  day: Date;
  onCopied: () => void;
}

const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** Copy the planned week (every group and athlete) to a later week. */
export const CopyWeekModal: React.FC<Props> = ({ visible, onClose, coachId, day, onCopied }) => {
  const theme = useTheme();
  const monday = workoutService.weekStart(day);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCount(null);
    let alive = true;
    workoutService
      .fetchWeekRows(coachId, monday)
      .then((rows) => {
        if (!alive) return;
        setCount(new Set(rows.map((r: any) => r.group_assignment_id || r.id)).size);
      })
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [visible, coachId, monday.getTime()]);

  const copyTo = async (weeksAhead: number) => {
    const target = new Date(monday);
    target.setDate(target.getDate() + 7 * weeksAhead);
    setBusy(weeksAhead);
    try {
      const { sessions } = await workoutService.copyWeek(coachId, monday, target);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('success', `${sessions} séance${sessions > 1 ? 's' : ''} copiée${sessions > 1 ? 's' : ''} sur la semaine du ${fmt(target)}`);
      onCopied();
      onClose();
    } catch {
      appAlert('Erreur', 'Impossible de copier la semaine. Rien n’a été modifié sur la semaine d’origine.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(0, 105, 232, 0.1)' }]}>
            <Feather name="copy" size={20} color={theme.colors.sprintyBlue} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Copier la semaine</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {count == null
              ? 'Lecture de la semaine…'
              : count === 0
                ? `Aucune séance du ${fmt(monday)} au ${fmt(sunday)}.`
                : `${count} séance${count > 1 ? 's' : ''} du ${fmt(monday)} au ${fmt(sunday)}, pour tous tes athlètes. La semaine d’origine ne change pas, rien n’est validé sur les copies.`}
          </Text>

          {count != null && count > 0 && (
            <View style={styles.options}>
              {[1, 2, 3, 4].map((w) => {
                const t = new Date(monday);
                t.setDate(t.getDate() + 7 * w);
                return (
                  <PressableScale
                    key={w}
                    haptic="selection"
                    disabled={busy != null}
                    onPress={() => copyTo(w)}
                    style={[styles.option, { backgroundColor: theme.colors.glassFill }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Copier vers la semaine du ${fmt(t)}`}
                  >
                    <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                      {w === 1 ? 'Semaine suivante' : `Dans ${w} semaines`}
                    </Text>
                    <Text style={[styles.optionSub, { color: theme.colors.textSecondary }]}>Du {fmt(t)}</Text>
                    {busy === w && <ActivityIndicator size="small" color={theme.colors.sprintyBlue} style={styles.spinner} />}
                  </PressableScale>
                );
              })}
            </View>
          )}

          <PressableScale haptic="light" onPress={onClose} accessibilityRole="button" style={styles.cancel}>
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Fermer</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 26, borderCurve: 'continuous', padding: 22, gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  hint: { fontSize: 14, lineHeight: 20 },
  options: { gap: 8, marginTop: 8 },
  option: { borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 13 },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  spinner: { position: 'absolute', right: 16, top: 18 },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
