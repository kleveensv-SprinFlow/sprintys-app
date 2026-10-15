import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { EmptyState } from '../../../shared/components/EmptyState';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { confirmAsync, appAlert } from '../../../shared/feedback/appAlert';
import { workoutService } from '../../../services/workoutService';

interface Props {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  /** Called with the chosen template; the caller plans it on the day. */
  onPick: (template: any) => void | Promise<void>;
}

const summaryOf = (t: any): string => {
  const blocks: any[] = Array.isArray(t.blocks) ? t.blocks : [];
  const exercises = blocks.reduce((n, b) => n + (b?.exercises?.length || 0), 0) || (Array.isArray(t.exercises) ? t.exercises.length : 0);
  const notes = Array.isArray(t.measures?.technical_notes) ? t.measures.technical_notes.length : 0;
  if (notes > 0) return `${notes} consigne${notes > 1 ? 's' : ''} technique${notes > 1 ? 's' : ''}`;
  if (exercises > 0) return `${exercises} exercice${exercises > 1 ? 's' : ''}`;
  return t.description ? String(t.description).split('\n')[0].slice(0, 60) : 'Séance';
};

/** The coach's saved sessions (any type): pick one to plan it on the day in one tap. */
export const TemplatePickerModal: React.FC<Props> = ({ visible, onClose, coachId, onPick }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await workoutService.fetchWorkoutTemplates(coachId));
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const remove = async (t: any) => {
    const ok = await confirmAsync({
      title: 'Supprimer cette séance type ?',
      message: `« ${t.name} » sera retirée de tes séances types. Les séances déjà planifiées ne changent pas.`,
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!ok) return;
    try {
      await workoutService.deleteWorkoutTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    } catch {
      appAlert('Erreur', 'Impossible de supprimer cette séance type.');
    }
  };

  const pick = async (t: any) => {
    setBusyId(t.id);
    try {
      await onPick(t);
    } finally {
      setBusyId(null);
    }
  };

  const top = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8 : 16;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: top }]}>
          <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Séances types</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Touche une séance pour la planifier ce jour</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.sprintyBlue} />
          </View>
        ) : templates.length === 0 ? (
          <View style={[glassCard, styles.empty]}>
            <EmptyState
              compact
              icon="star"
              title="Aucune séance type"
              message="Ouvre une séance planifiée puis touche « Type » pour la garder et la reprogrammer en un geste."
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false}>
            {templates.map((t) => (
              <PressableScale
                key={t.id}
                onPress={() => pick(t)}
                disabled={busyId != null}
                accessibilityRole="button"
                accessibilityLabel={`Planifier ${t.name}`}
                style={[glassCard, styles.card]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {t.type_seance} · {summaryOf(t)}
                  </Text>
                </View>
                {busyId === t.id ? (
                  <ActivityIndicator size="small" color={theme.colors.sprintyBlue} />
                ) : (
                  <IconButton icon="trash-2" tone="plain" size={36} color={theme.colors.textMuted} onPress={() => remove(t)} accessibilityLabel={`Supprimer ${t.name}`} />
                )}
              </PressableScale>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { margin: 16, padding: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, fontWeight: '500', marginTop: 3 },
});
