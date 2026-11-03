import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../core/theme';
import { goBack } from '../../core/navigation';
import { Header } from '../../shared/components/Header';
import { GlassScreen } from '../../shared/components/GlassScreen';
import { ListRow } from '../../shared/components/ListRow';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { useFrostedHeader } from '../../shared/hooks/useFrostedHeader';
import { confirmAsync, toast } from '../../shared/feedback/appAlert';
import { ALL_AI_SCOPES, AiAccessKey, AiScope, aiAccessService, isActiveKey } from '../../services/aiAccessService';
import { ScopeSwitches } from './components/ScopeSwitches';
import { Section } from './components/ui';
import { expiryText, formatDate } from './format';

/** One key: what it may read (switches apply at once), its use, and revocation. */
export function AiKeyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scrollY, scrollProps } = useFrostedHeader();
  const [key, setKey] = useState<AiAccessKey | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<AiScope[]>(ALL_AI_SCOPES);
  const back = () => goBack(router, '/(athlete)/ai-access');

  const load = useCallback(async () => {
    try {
      const [list, scopes] = await Promise.all([aiAccessService.list(), aiAccessService.allowedScopes().catch(() => ALL_AI_SCOPES)]);
      setKey(list.find((k) => k.id === id && isActiveKey(k)) ?? null);
      setAllowed(scopes);
    } catch {
      setKey(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (s: AiScope) => {
    if (!key) return;
    const next = key.scopes.includes(s) ? key.scopes.filter((x) => x !== s) : [...key.scopes, s];
    setKey({ ...key, scopes: next });
    try {
      await aiAccessService.updateScopes(key.id, next);
    } catch {
      toast('error', 'Modification impossible. Réessaie.');
      load();
    }
  };

  const revoke = async () => {
    if (!key) return;
    const ok = await confirmAsync({
      title: `Révoquer « ${key.label} » ?`,
      message: 'Cette IA ne pourra plus lire tes données. C’est immédiat et définitif.',
      confirmText: 'Révoquer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await aiAccessService.revoke(key.id);
      toast('success', 'Clé révoquée');
      back();
    } catch {
      toast('error', 'Révocation impossible. Réessaie.');
    }
  };

  return (
    <GlassScreen>
      <Header title={key?.label ?? 'Clé'} showBackButton onBackPress={back} scrollY={scrollY} />
      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.content}>
        {key === undefined && <SkeletonCard />}

        {key === null && (
          <Section>
            <EmptyState compact icon="key" title="Clé introuvable" message="Elle a peut-être expiré ou été révoquée." actionLabel="Retour" onAction={back} />
          </Section>
        )}

        {key && (
          <>
            <Section>
              <ListRow title="Validité" value={expiryText(key.expires_at)} />
              <ListRow title="Utilisation" value={key.last_used_at ? `${key.use_count} · le ${formatDate(key.last_used_at)}` : 'Jamais'} />
              <ListRow title="Créée le" value={formatDate(key.created_at)} last />
            </Section>

            <ScopeSwitches value={key.scopes} allowed={allowed} onToggle={toggle} />
            {!key.scopes.some((s) => allowed.includes(s)) && (
              <Section footer="Rien n’est partagé : l’IA ne recevra aucune donnée.">
                <ListRow icon="alert-circle" iconColor={theme.colors.warning} title="Aucune catégorie active" last />
              </Section>
            )}

            <Section footer={`Préfixe ${key.key_prefix}… · la clé complète n’est jamais conservée.`}>
              <ListRow icon="slash" title="Révoquer la clé" destructive onPress={revoke} chevron={false} last />
            </Section>
          </>
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
});
