import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/core/theme';
import { Header } from '../../src/shared/components/Header';
import { useCoachStore } from '../../src/store/coach/coachStore';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { glassCard } from '../../src/core/glass';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { IconButton } from '../../src/shared/components/IconButton';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { SkeletonCard } from '../../src/shared/components/Skeleton';

import { appAlert, confirmAsync, toast } from '../../src/shared/feedback/appAlert';

import { useRefresh } from '../../src/shared/hooks/useRefresh';

export default function CoachLibraryScreen() {
  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const { workoutTemplates, fetchWorkoutTemplates, deleteWorkoutTemplate } = useCoachStore();
  const [loaded, setLoaded] = useState(workoutTemplates.length > 0);

  const refreshControl = useRefresh(() => fetchWorkoutTemplates());
  useEffect(() => {
    fetchWorkoutTemplates().finally(() => setLoaded(true));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmAsync({
      title: 'Supprimer le modèle ?',
      message: `Le modèle « ${name} » sera supprimé. C’est définitif.`,
      confirmText: 'Supprimer',
      destructive: true,
      icon: 'trash-2',
    });
    if (!ok) return;
    await deleteWorkoutTemplate(id);
    // The store swallows errors: the template is still listed when the delete failed
    if (useCoachStore.getState().workoutTemplates.some((t) => t.id === id)) {
      toast('error', 'Impossible de supprimer ce modèle.', 'Oups');
    } else {
      toast('success', 'Modèle supprimé');
    }
  };

  return (
    <GlassScreen scrollY={scrollY}>
      <Header scrollY={scrollY} title="Bibliothèque" showBackButton onBackPress={() => router.back()} />

      <Animated.ScrollView
        {...scrollProps}
        refreshControl={refreshControl}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Tes modèles de séances prêts à l’emploi.</Text>

        {!loaded && workoutTemplates.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : workoutTemplates.length === 0 ? (
          <View style={glassCard}>
            <GlassSheen radius={22} />
            <EmptyState
              icon="book-open"
              title="Aucun modèle enregistré"
              message="Crée une séance depuis le calendrier puis touche « Sauvegarder comme modèle » pour la retrouver ici."
            />
          </View>
        ) : (
          workoutTemplates.map((template) => {
            const isGym = template.type_seance === 'musculation';
            const blockCount = Array.isArray(template.blocks) ? template.blocks.length : 0;
            return (
              <View key={template.id} style={[glassCard, styles.templateCard]}>
                <GlassSheen radius={22} />
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {template.name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: isGym ? 'rgba(0, 105, 232, 0.1)' : 'rgba(245, 158, 11, 0.12)' }]}>
                      <Feather name={isGym ? 'trending-up' : 'wind'} size={12} color={isGym ? theme.colors.sprintyBlue : theme.colors.warning} />
                      <Text style={[styles.badgeText, { color: isGym ? theme.colors.sprintyBlue : theme.colors.warning }]}>
                        {isGym ? 'Musculation' : 'Course / Hybride'}
                      </Text>
                    </View>
                  </View>
                  <IconButton
                    icon="trash-2"
                    tone="danger"
                    size={36}
                    accessibilityLabel={`Supprimer ${template.name}`}
                    onPress={() => handleDelete(template.id, template.name)}
                  />
                </View>

                {!!template.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.statsRow}>
                    <Feather name="layers" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.cardStats}>
                      {blockCount} bloc{blockCount > 1 ? 's' : ''} configuré{blockCount > 1 ? 's' : ''}
                    </Text>
                  </View>

                  <PressableScale
                    style={styles.useBtn}
                    accessibilityRole="button"
                    onPress={() => {
                      // TODO: Insert flow
                      appAlert('Bientôt', 'L’importation de ce modèle dans le calendrier sera activée dans la prochaine étape.');
                    }}
                  >
                    <Text style={styles.useBtnText}>Utiliser</Text>
                  </PressableScale>
                </View>
              </View>
            );
          })
        )}
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    marginLeft: 4,
  },
  templateCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: theme.colors.text,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    paddingTop: 12,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStats: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  useBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sprintyBlue,
  },
  useBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
