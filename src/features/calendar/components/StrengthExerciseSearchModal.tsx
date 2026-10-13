import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { coachExerciseService, CoachExercise } from '../../../services/coachExerciseService';
import { useAuthStore } from '../../../store/authStore';
import * as Haptics from 'expo-haptics';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { glassCard } from '../../../core/glass';
import { PressableScale } from '../../../shared/components/PressableScale';
import { IconButton } from '../../../shared/components/IconButton';
import { Input } from '../../../shared/components/Input';
import { EmptyState } from '../../../shared/components/EmptyState';

export interface SelectedStrengthExercise {
  id?: string;
  name: string;
  name_en?: string;
  is_custom?: boolean;
}

interface StrengthExerciseSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: SelectedStrengthExercise) => void;
}

interface CatalogExercise {
  id: string;
  name_fr: string;
  name_en?: string | null;
  equipment?: string | null;
  zones?: string[] | null;
}

type ExerciseFilter = 'all' | 'haut' | 'bas' | 'haltero';

const UPPER_BODY_ZONES = [
  'haut du dos', 'grand dorsal', 'main', 'extenseurs de l’avant-bras', 'brachial',
  'deltoïdes', 'rhomboïdes', 'biceps', 'pectoraux', 'dos', 'trapèzes',
  'deltoïdes postérieurs', 'dentelé antérieur', 'deltoïde antérieur', 'deltoïde moyen',
  'coiffe des rotateurs', 'deltoïdes moyens', 'épaules', 'pouce', 'deltoïde postérieur',
  'pectoraux supérieurs', 'pectoraux inférieurs', 'triceps', 'deltoïdes antérieurs',
  'fléchisseurs de l’avant-bras', 'avant-bras'
];

const LOWER_BODY_ZONES = [
  'ischio-jambiers', 'moyen fessier', 'tibial antérieur', 'soléaire', 'quadriceps',
  'adducteurs', 'abducteurs', 'gastrocnémien', 'fléchisseurs de hanche', 'jambes',
  'mollets', 'hanches', 'fessiers'
];

export const StrengthExerciseSearchModal: React.FC<StrengthExerciseSearchModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const safeTop =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
      : insets.top > 0
      ? insets.top + 6
      : 16;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExerciseFilter>('all');
  const [catalogResults, setCatalogResults] = useState<CatalogExercise[]>([]);
  const [coachCustomExercises, setCoachCustomExercises] = useState<CoachExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      loadCoachCustoms();
    }
  }, [visible, user?.id]);

  const loadCoachCustoms = async () => {
    if (!user?.id) return;
    try {
      const customs = await coachExerciseService.fetchExercises(user.id, 'musculation');
      setCoachCustomExercises(customs || []);
    } catch (e) {
      console.warn('Erreur chargement exercices coach', e);
    }
  };

  useEffect(() => {
    if (!visible) return;
    
    const timer = setTimeout(() => {
      fetchCatalog(searchQuery, activeFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, visible]);

  const fetchCatalog = async (query: string, filter: ExerciseFilter) => {
    setIsLoading(true);
    try {
      let req = supabase.from('exercises_catalog').select('id, name_fr, name_en, equipment, zones');
      
      if (query.trim()) {
        const escaped = query.trim().replace(/'/g, "''");
        req = req.or(`name_fr.ilike.%${escaped}%,name_en.ilike.%${escaped}%`);
      }

      if (filter === 'haut') {
        req = req.overlaps('zones', UPPER_BODY_ZONES);
      } else if (filter === 'bas') {
        req = req.overlaps('zones', LOWER_BODY_ZONES);
      } else if (filter === 'haltero') {
        req = req.or('name_fr.ilike.%arraché%,name_fr.ilike.%épaulé%,name_fr.ilike.%jeté%,name_en.ilike.%snatch%,name_en.ilike.%clean%,name_en.ilike.%jerk%');
      }

      const { data, error } = await req.limit(40);

      if (!error && data) {
        setCatalogResults(data);
      } else {
        setCatalogResults([]);
      }
    } catch (err) {
      console.error('Erreur recherche exercices catalog:', err);
      setCatalogResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter coach custom exercises by search query
  const filteredCoachExercises = coachCustomExercises.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const handleSelectCatalog = (item: CatalogExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect({
      id: item.id,
      name: item.name_fr,
      name_en: item.name_en || undefined,
      is_custom: false,
    });
    onClose();
  };

  const handleSelectCoach = (item: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect({
      id: item.id,
      name: item.name,
      is_custom: true,
    });
    onClose();
  };

  const handleCreateCustom = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !user?.id) return;

    setIsCreatingCustom(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const created = await coachExerciseService.saveExercise(user.id, {
        name: trimmed,
        category: 'musculation',
      });

      if (created) {
        setCoachCustomExercises((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        onSelect({
          id: created.id,
          name: created.name,
          is_custom: true,
        });
        onClose();
      } else {
        onSelect({
          name: trimmed,
          is_custom: true,
        });
        onClose();
      }
    } catch (e) {
      console.error('Erreur creation custom exercise:', e);
      onSelect({
        name: trimmed,
        is_custom: true,
      });
      onClose();
    } finally {
      setIsCreatingCustom(false);
    }
  };

  const exactMatchExists =
    filteredCoachExercises.some((c) => c.name.toLowerCase() === searchQuery.trim().toLowerCase()) ||
    catalogResults.some(
      (c) =>
        c.name_fr.toLowerCase() === searchQuery.trim().toLowerCase() ||
        (c.name_en && c.name_en.toLowerCase() === searchQuery.trim().toLowerCase())
    );

  const trimmedQuery = searchQuery.trim();
  const showCoachSection = filteredCoachExercises.length > 0 && activeFilter === 'all';
  const hasNoResults = catalogResults.length === 0 && !showCoachSection;

  const FILTERS: { label: string; value: ExerciseFilter }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Haut du corps', value: 'haut' },
    { label: 'Bas du corps', value: 'bas' },
    { label: 'Haltérophilie', value: 'haltero' },
  ];

  const renderAddBadge = () => (
    <View style={styles.addBadge}>
      <Feather name="plus" size={16} color={theme.colors.sprintyBlue} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: safeTop }]}>
            <View style={styles.headerRow}>
              <IconButton icon="x" onPress={onClose} accessibilityLabel="Fermer" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Ajouter un exercice
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <Input
              placeholder="Rechercher (ex. squat, développé couché…)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              containerStyle={styles.searchInputContainer}
              leftIcon={<Feather name="search" size={18} color={theme.colors.textSecondary} />}
              rightIcon={
                searchQuery.length > 0 ? (
                  <PressableScale
                    haptic="selection"
                    onPress={() => setSearchQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel="Effacer la recherche"
                    style={styles.clearSearchBtn}
                  >
                    <Feather name="x-circle" size={18} color={theme.colors.textMuted} />
                  </PressableScale>
                ) : undefined
              }
            />
          </View>

          {/* Filters */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filtersScroll}
            >
              {FILTERS.map(({ label, value }) => {
                const isActive = activeFilter === value;
                return (
                  <PressableScale
                    key={value}
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setActiveFilter(value)}
                  >
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {/* Quick Action: Create Custom Exercise if query is typed */}
            {trimmedQuery.length > 1 && !exactMatchExists && (
              <PressableScale
                haptic="none"
                style={[styles.createCard, isCreatingCustom && { opacity: 0.7 }]}
                onPress={handleCreateCustom}
                disabled={isCreatingCustom}
                accessibilityRole="button"
                accessibilityLabel={`Créer l’exercice ${trimmedQuery}`}
              >
                <View style={styles.createIconBadge}>
                  {isCreatingCustom ? (
                    <ActivityIndicator size="small" color={theme.colors.surface} />
                  ) : (
                    <Feather name="plus" size={18} color={theme.colors.surface} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.createTitle} numberOfLines={2}>
                    Créer « {trimmedQuery} »
                  </Text>
                  <Text style={styles.createSubtitle}>Ajouté à ta bibliothèque, visible par toi seul</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </PressableScale>
            )}

            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={theme.colors.sprintyBlue} />
                <Text style={styles.loaderText}>Recherche…</Text>
              </View>
            ) : hasNoResults ? (
              <EmptyState
                icon="search"
                title="Aucun exercice trouvé"
                message={
                  trimmedQuery
                    ? `Rien pour « ${trimmedQuery} » avec ce filtre. Essaie un autre mot-clé ou crée ton propre exercice.`
                    : 'Essaie un autre filtre ou tape le nom d’un exercice.'
                }
                actionLabel={activeFilter !== 'all' ? 'Voir tous les exercices' : undefined}
                onAction={activeFilter !== 'all' ? () => setActiveFilter('all') : undefined}
              />
            ) : (
              <>
                {/* Coach Custom Exercises Section */}
                {showCoachSection && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                      <Feather name="bookmark" size={13} color={theme.colors.sprintyBlue} style={{ marginRight: 6 }} />
                      <Text style={[styles.sectionTitle, { color: theme.colors.sprintyBlue }]}>
                        Mes exercices ({filteredCoachExercises.length})
                      </Text>
                    </View>
                    <View style={styles.cardGroup}>
                      {filteredCoachExercises.map((item, idx) => {
                        const isLast = idx === filteredCoachExercises.length - 1;
                        return (
                          <PressableScale
                            key={item.id}
                            haptic="none"
                            activeScale={0.98}
                            accessibilityRole="button"
                            accessibilityLabel={`Ajouter ${item.name}`}
                            style={[styles.itemRow, !isLast && styles.rowBorder]}
                            onPress={() => handleSelectCoach(item)}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemSub}>Exercice personnalisé</Text>
                            </View>
                            {renderAddBadge()}
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Catalog Exercises Section */}
                {catalogResults.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                      <Feather name="book-open" size={13} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={styles.sectionTitle}>Catalogue ({catalogResults.length})</Text>
                    </View>
                    <View style={styles.cardGroup}>
                      {catalogResults.map((item, idx) => {
                        const isLast = idx === catalogResults.length - 1;
                        return (
                          <PressableScale
                            key={item.id}
                            haptic="none"
                            activeScale={0.98}
                            accessibilityRole="button"
                            accessibilityLabel={`Ajouter ${item.name_fr}`}
                            style={[styles.itemRow, !isLast && styles.rowBorder]}
                            onPress={() => handleSelectCatalog(item)}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={styles.itemName}>{item.name_fr}</Text>
                              {!!item.name_en && <Text style={styles.itemNameEn}>{item.name_en}</Text>}
                              {!!item.equipment && (
                                <View style={styles.equipmentChip}>
                                  <Text style={styles.equipmentText}>{item.equipment}</Text>
                                </View>
                              )}
                            </View>
                            {renderAddBadge()}
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: theme.colors.text,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 38,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  clearSearchBtn: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: theme.colors.sprintyBlue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.surface,
  },
  createCard: {
    ...glassCard,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 20,
    borderColor: 'rgba(0, 105, 232, 0.25)',
  },
  createIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.sprintyBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createSubtitle: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  loaderContainer: {
    paddingTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
  },
  cardGroup: {
    ...glassCard,
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  itemNameEn: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  itemSub: {
    fontSize: 13,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  equipmentChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  equipmentText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
