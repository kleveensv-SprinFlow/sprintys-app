import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { PressableScale } from '../../shared/components/PressableScale';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { confirmAsync, toast } from '../../shared/feedback/appAlert';
import { AI_NOTE_LABELS, AiNote, aiAccessService } from '../../services/aiAccessService';
import { Section } from './components/ui';
import { formatShortDate } from './format';

/** What the athlete's AIs chose to remember. The athlete can delete any note. */
export function AiNotesScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [notes, setNotes] = useState<AiNote[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setNotes(await aiAccessService.listNotes());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (n: AiNote) => {
    const ok = await confirmAsync({ title: 'Supprimer cette note ?', message: 'Ton IA ne la relira plus.', confirmText: 'Supprimer', destructive: true });
    if (!ok) return;
    setNotes((prev) => prev?.filter((x) => x.id !== n.id) ?? prev);
    try {
      await aiAccessService.deleteNote(n.id);
    } catch {
      toast('error', 'Suppression impossible. Réessaie.');
      load();
    }
  };

  return (
    <GlassScreen>
      <Header title="Notes de tes IA" showBackButton onBackPress={() => goBack(router, '/(athlete)/ai-access')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
        {notes == null && !error && <SkeletonCard />}
        {error && (
          <Section>
            <EmptyState compact icon="wifi-off" title="Impossible de charger" message="Vérifie ta connexion et réessaie." actionLabel="Réessayer" onAction={load} />
          </Section>
        )}
        {notes?.length === 0 && (
          <EmptyState
            icon="bookmark"
            title="Aucune note"
            message="Active « Notes de l’IA » sur une clé, puis demande à ton IA de retenir quelque chose : la note apparaîtra ici."
          />
        )}
        {!!notes?.length && (
          <Section footer="Ton IA relit ces notes avant de te répondre. Elle ne modifie jamais tes autres données.">
            {notes.map((n, i) => (
              <View key={n.id} style={[styles.row, i < notes.length - 1 && styles.divider]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.tag}>{AI_NOTE_LABELS[n.categorie] ?? n.categorie}</Text>
                  <Text style={styles.text}>{n.texte}</Text>
                  <Text style={styles.meta}>
                    {n.source} · {formatShortDate(n.created_at)}
                  </Text>
                </View>
                <PressableScale haptic="light" onPress={() => remove(n)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Supprimer cette note">
                  <Feather name="trash-2" size={18} color={theme.colors.textMuted} />
                </PressableScale>
              </View>
            ))}
          </Section>
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.colors.sprintyBlue, textTransform: 'uppercase', marginBottom: 3 },
  text: { fontSize: 15, lineHeight: 21, color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
