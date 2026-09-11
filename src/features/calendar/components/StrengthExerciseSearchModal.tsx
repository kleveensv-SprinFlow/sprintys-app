import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { coachExerciseService, CoachExercise } from '../../../services/coachExerciseService';
import { useAuthStore } from '../../../store/authStore';
import * as Haptics from 'expo-haptics';

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
  const [catalogResults, setCatalogResults] = useState<CatalogExercise[]>([]);
  const [coachCustomExercises, setCoachCustomExercises] = useState<CoachExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Load coach custom exercises on open
  useEffect(() => {
    if (visible && user?.id) {
      loadCoachCustoms();
      fetchInitialCatalog();
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

  const fetchInitialCatalog = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exercises_catalog')
        .select('id, name_fr, name_en, equipment, zones')
        .limit(30);

      if (!error && data) {
        setCatalogResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search across catalog
  useEffect(() => {
    if (!visible) return;
    const clean = searchQuery.trim();
    if (!clean) {
      fetchInitialCatalog();
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const escaped = clean.replace(/'/g, "''");
        const { data, error } = await supabase
          .from('exercises_catalog')
          .select('id, name_fr, name_en, equipment, zones')
          .or(`name_fr.ilike.%${escaped}%,name_en.ilike.%${escaped}%`)
          .limit(40);

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
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  // Filter coach custom exercises by search query
  const filteredCoachExercises = coachCustomExercises.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Handle select an existing catalog exercise
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

  // Handle select coach custom exercise
  const handleSelectCoach = (item: CoachExercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect({
      id: item.id,
      name: item.name,
      is_custom: true,
    });
    onClose();
  };

  // Handle create new coach custom exercise
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
        // Fallback if network or duplicate
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

  // Check if current search exactly matches any existing name
  const exactMatchExists =
    filteredCoachExercises.some((c) => c.name.toLowerCase() === searchQuery.trim().toLowerCase()) ||
    catalogResults.some(
      (c) =>
        c.name_fr.toLowerCase() === searchQuery.trim().toLowerCase() ||
        (c.name_en && c.name_en.toLowerCase() === searchQuery.trim().toLowerCase())
    );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: safeTop, borderBottomColor: theme.colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Feather name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Rechercher (ex: Squat, Bench...)"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.colors.accent }]}>Annuler</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Action: Create Custom Exercise if query is typed */}
          {searchQuery.trim().length > 1 && !exactMatchExists && (
            <TouchableOpacity
              style={[styles.createRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
              onPress={handleCreateCustom}
              disabled={isCreatingCustom}
              activeOpacity={0.7}
            >
              <View style={[styles.createIconBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                {isCreatingCustom ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Feather name="plus" size={18} color={theme.colors.accent} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.createTitle, { color: theme.colors.text }]}>
                  Créer « {searchQuery.trim()} »
                </Text>
                <Text style={[styles.createSubtitle, { color: theme.colors.textSecondary }]}>
                  Ajouter à ma bibliothèque coach (visible uniquement par moi)
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* List of Results */}
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loaderText, { color: theme.colors.textSecondary }]}>Recherche dans la base...</Text>
            </View>
          ) : (
            <FlatList
              data={[]}
              keyExtractor={() => ''}
              renderItem={null}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View>
                  {/* Coach Custom Exercises Section */}
                  {filteredCoachExercises.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeader}>
                        <Feather name="bookmark" size={14} color={theme.colors.accent} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>
                          MES EXERCICES PERSONNALISÉS ({filteredCoachExercises.length})
                        </Text>
                      </View>
                      <View style={[styles.cardGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        {filteredCoachExercises.map((item, idx) => {
                          const isLast = idx === filteredCoachExercises.length - 1;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.itemRow,
                                !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                              ]}
                              onPress={() => handleSelectCoach(item)}
                              activeOpacity={0.6}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
                                <Text style={[styles.itemSub, { color: theme.colors.textSecondary }]}>
                                  Exercice personnalisé coach
                                </Text>
                              </View>
                              <Feather name="plus-circle" size={20} color={theme.colors.accent} />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Catalog Exercises Section */}
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                      <Feather name="database" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                        CATALOGUE D'EXERCICES ({catalogResults.length})
                      </Text>
                    </View>
                    {catalogResults.length === 0 ? (
                      <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                          Aucun exercice trouvé dans le catalogue pour « {searchQuery} »
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.cardGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        {catalogResults.map((item, idx) => {
                          const isLast = idx === catalogResults.length - 1;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.itemRow,
                                !isLast && [styles.rowBorder, { borderBottomColor: theme.colors.border }],
                              ]}
                              onPress={() => handleSelectCatalog(item)}
                              activeOpacity={0.6}
                            >
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name_fr}</Text>
                                {item.name_en && (
                                  <Text style={[styles.itemNameEn, { color: theme.colors.textSecondary }]}>
                                    {item.name_en}
                                  </Text>
                                )}
                              </View>
                              <Feather name="plus-circle" size={20} color={theme.colors.accent} />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 0,
  },
  cancelBtn: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  createIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  createSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loaderContainer: {
    paddingTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemNameEn: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
