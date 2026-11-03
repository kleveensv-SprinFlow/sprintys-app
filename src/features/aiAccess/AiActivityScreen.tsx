import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { ListRow } from '../../shared/components/ListRow';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { AiAccessLogEntry, aiAccessService } from '../../services/aiAccessService';
import { Section } from './components/ui';
import { formatDateTime, scopesSummary } from './format';

/** Latest reads of the athlete's data by their AI keys (kept 90 days). */
export function AiActivityScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [log, setLog] = useState<AiAccessLogEntry[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setLog(await aiAccessService.listLog(50));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <GlassScreen>
      <Header title="Activité" showBackButton onBackPress={() => goBack(router, '/(athlete)/ai-access')} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
        {log == null && !error && <SkeletonCard />}
        {error && (
          <Section>
            <EmptyState compact icon="wifi-off" title="Impossible de charger" message="Vérifie ta connexion et réessaie." actionLabel="Réessayer" onAction={load} />
          </Section>
        )}
        {log?.length === 0 && <EmptyState icon="activity" title="Aucune lecture" message="Chaque fois qu’une IA lira tes données, tu le verras ici." />}
        {!!log?.length && (
          <Section footer="Les 50 dernières lectures. L’historique est gardé 90 jours.">
            {log.map((l, i) => (
              <ListRow key={`${l.used_at}-${i}`} title={l.key_label} subtitle={scopesSummary(l.scopes)} value={formatDateTime(l.used_at)} last={i === log.length - 1} />
            ))}
          </Section>
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
});
