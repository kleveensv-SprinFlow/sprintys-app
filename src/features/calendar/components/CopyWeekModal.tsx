import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert, confirmAsync, toast } from '../../../shared/feedback/appAlert';
import { workoutService } from '../../../services/workoutService';
import { summarizeWeek, dayLabel, athletesLabel, WeekSessionPreview } from '../copyWeekPreview';

interface Props {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  /** Group whose week is copied (a coach may run several) */
  teamId?: string | null;
  /** Any day of the week to copy */
  day: Date;
  /** Group shown (when the coach runs several), to say exactly who is copied */
  teamName?: string | null;
  onCopied: () => void;
}

const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** Copy the planned week (every group and athlete) to a later week. */
export const CopyWeekModal: React.FC<Props> = ({ visible, onClose, coachId, teamId, day, teamName, onCopied }) => {
  const theme = useTheme();
  const monday = workoutService.weekStart(day);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const [sessions, setSessions] = useState<WeekSessionPreview[] | null>(null);
  const count = sessions == null ? null : sessions.length;
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSessions(null);
    let alive = true;
    workoutService
      .fetchWeekRows(coachId, monday, teamId)
      .then((rows) => {
        if (!alive) return;
        setSessions(summarizeWeek(rows, coachId));
      })
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, [visible, coachId, teamId, monday.getTime()]);

  const copyTo = async (weeksAhead: number) => {
    const target = new Date(monday);
    target.setDate(target.getDate() + 7 * weeksAhead);
    setBusy(weeksAhead);
    try {
      // A week that already has sessions would get them twice: ask first
      const existing = await workoutService.fetchWeekRows(coachId, target, teamId);
      if (existing.length > 0) {
        const there = summarizeWeek(existing, coachId);
        const n = there.length;
        const list = there.slice(0, 5).map((x) => `• ${dayLabel(x.date)} · ${x.title}`).join('\n');
        const more = n > 5 ? `\n• et ${n - 5} autre${n - 5 > 1 ? 's' : ''}` : '';
        const go = await confirmAsync({
          title: 'Semaine déjà remplie',
          message: `La semaine du ${fmt(target)} contient déjà ${n} séance${n > 1 ? 's' : ''} :\n${list}${more}\n\nLes séances copiées s’ajouteront à côté (rien n’est supprimé), attention aux doublons.`,
          confirmText: 'Copier quand même',
        });
        if (!go) return;
      }
      const { sessions } = await workoutService.copyWeek(coachId, monday, target, teamId);
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
                : `${count} séance${count > 1 ? 's' : ''} du ${fmt(monday)} au ${fmt(sunday)}${teamName ? `, groupe ${teamName}` : ''}. La semaine d’origine ne change pas, rien n’est validé sur les copies.`}
          </Text>

          {sessions != null && sessions.length > 0 && (
            <ScrollView style={[styles.list, { borderColor: theme.colors.hairline }]} nestedScrollEnabled>
              {sessions.map((x) => (
                <View key={x.key} style={styles.listRow}>
                  <Text style={[styles.listDay, { color: theme.colors.textSecondary }]}>{dayLabel(x.date)}</Text>
                  <Text style={[styles.listTitle, { color: theme.colors.text }]} numberOfLines={1}>{x.title}</Text>
                  <Text style={[styles.listWho, { color: theme.colors.textSecondary }]}>{athletesLabel(x.athletes)}</Text>
                </View>
              ))}
            </ScrollView>
          )}

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
  list: { maxHeight: 180, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  listDay: { width: 52, fontSize: 13, fontWeight: '700' },
  listTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  listWho: { fontSize: 13 },
  options: { gap: 8, marginTop: 8 },
  option: { borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 13 },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  spinner: { position: 'absolute', right: 16, top: 18 },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
