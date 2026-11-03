import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { ListRow } from '../../shared/components/ListRow';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { AiAccessKey, AiAccessLogEntry, aiAccessService, isActiveKey } from '../../services/aiAccessService';
import { Section } from './components/ui';
import { formatShortDate, keySubtitle } from './format';

/** « Accès IA » : the athlete's keys, then help, notes and activity, each behind its own screen. */
export function AiAccessHomeScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [keys, setKeys] = useState<AiAccessKey[] | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [lastRead, setLastRead] = useState<AiAccessLogEntry | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [list, notes, log] = await Promise.all([
        aiAccessService.list(),
        // Secondary rows: an error there must not hide the keys
        aiAccessService.listNotes().catch(() => []),
        aiAccessService.listLog(1).catch(() => []),
      ]);
      setKeys(list);
      setNotesCount(notes.length);
      setLastRead(log[0] ?? null);
    } catch {
      setError(true);
    }
  }, []);

  // Reload when coming back from a key, the notes or the creation screen
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = (keys ?? []).filter(isActiveKey);
  const open = (path: string) => router.push(path as never);

  return (
    <GlassScreen>
      <Header title="Accès IA" showBackButton onBackPress={() => goBack(router, '/(athlete)/settings')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="cpu" size={26} color={theme.colors.sprintyBlue} />
          </View>
          <Text style={styles.heroTitle}>Ton IA, tes données</Text>
          <Text style={styles.heroText}>ChatGPT, Claude… lisent ce que tu choisis. Rien d’autre, et sans rien modifier.</Text>
        </View>

        {keys == null && !error && <SkeletonCard />}

        {error && (
          <Section>
            <EmptyState compact icon="wifi-off" title="Impossible de charger" message="Vérifie ta connexion et réessaie." actionLabel="Réessayer" onAction={load} />
          </Section>
        )}

        {keys != null && active.length === 0 && (
          <Button title="Connecter une IA" onPress={() => open('/(athlete)/ai-access/new')} style={styles.cta} />
        )}

        {active.length > 0 && (
          <Section title="Tes clés">
            {active.map((k) => (
              <ListRow key={k.id} icon="key" title={k.label} subtitle={keySubtitle(k)} onPress={() => open(`/(athlete)/ai-access/${k.id}`)} />
            ))}
            <ListRow icon="plus" title="Nouvelle clé" onPress={() => open('/(athlete)/ai-access/new')} last />
          </Section>
        )}

        {keys != null && (
          <Section>
            <ListRow icon="book-open" title="Mode d’emploi" subtitle="ChatGPT, Claude et autres IA" onPress={() => open('/(athlete)/ai-access/guide')} />
            <ListRow icon="bookmark" title="Notes de tes IA" value={notesCount ? String(notesCount) : undefined} onPress={() => open('/(athlete)/ai-access/notes')} />
            <ListRow
              icon="activity"
              title="Activité"
              value={lastRead ? formatShortDate(lastRead.used_at) : undefined}
              onPress={() => open('/(athlete)/ai-access/activity')}
              last
            />
          </Section>
        )}

        <Text style={styles.foot}>Lecture seule · jamais ton nom ni ton e-mail · révocable à tout moment</Text>
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  hero: { alignItems: 'center', paddingVertical: theme.spacing.lg, marginBottom: theme.spacing.sm },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: `${theme.colors.sprintyBlue}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: theme.colors.text },
  heroText: { fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: theme.spacing.lg },
  cta: { marginBottom: theme.spacing.xl },
  foot: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
});
