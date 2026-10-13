import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutBuilderStore, LibraryExercise, WorkoutCategory } from '../../../store/workoutBuilderStore';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Skeleton } from '../../../shared/components/Skeleton';

interface Props {
  blockId: string;
  visible: boolean;
  onClose: () => void;
}

const TAGS = ['Haut du corps', 'Bas du corps', 'Ischios', 'Quadri', 'Haltérophilie'];

export const ExerciseLibraryModal: React.FC<Props> = ({ blockId, visible, onClose }) => {
  const { user } = useAuthStore();
  const { addExerciseToBlock } = useWorkoutBuilderStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customName, setCustomName] = useState('');
  
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && user?.id) {
      loadExercises();
    }
  }, [visible, user?.id]);

  const loadExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coach_exercises')
      .select('*')
      .eq('coach_id', user!.id)
      .order('name');
      
    if (data) {
      const mapped: LibraryExercise[] = data.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category as WorkoutCategory,
        tags: [] // Ajoute des tags si gérés en base plus tard
      }));
      setLibrary(mapped);
    }
    setLoading(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredLibrary = library.filter(ex => 
    selectedTags.length === 0 || selectedTags.every(t => ex.tags.includes(t))
  );

  const handleSelect = (ex: LibraryExercise) => {
    addExerciseToBlock(blockId, ex.name, ex.category);
    onClose();
  };

  const handleAddCustom = async () => {
    if (customName && user?.id) {
      // 1. Ajouter dans le WorkoutBuilder localement pour que ce soit réactif
      addExerciseToBlock(blockId, customName, 'Général');
      
      // 2. Sauvegarder dans la BDD pour les prochaines fois
      const newEx = {
        name: customName,
        category: 'Général',
        coach_id: user.id
      };
      
      await supabase.from('coach_exercises').insert(newEx);
      
      setCustomName('');
      onClose();
    }
  };

  const canAdd = !!customName.trim();
  const onAddPress = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await handleAddCustom();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <FeedbackHost />
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Bibliothèque d’exercices</Text>
              <IconButton icon="x" accessibilityLabel="Fermer" onPress={onClose} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagContainer}
              style={styles.tagScroll}
            >
              {TAGS.map(tag => {
                const on = selectedTags.includes(tag);
                return (
                  <PressableScale
                    key={tag}
                    haptic="selection"
                    onPress={() => toggleTag(tag)}
                    hitSlop={6}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[styles.tag, on && styles.tagActive]}
                  >
                    <Text style={[styles.tagText, on && styles.tagTextActive]}>{tag}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.customRow}>
                <Input
                  placeholder="Créer un exercice personnalisé…"
                  value={customName}
                  onChangeText={setCustomName}
                  containerStyle={styles.customInput}
                  returnKeyType="done"
                  onSubmitEditing={() => canAdd && onAddPress()}
                  leftIcon={<Feather name="plus-circle" size={18} color={theme.colors.textMuted} />}
                />
                <Button
                  title="Ajouter"
                  onPress={onAddPress}
                  disabled={!canAdd}
                  loading={adding}
                  style={styles.customBtn}
                />
              </View>

              <Text style={styles.sectionLabel}>Mes exercices</Text>

              {loading ? (
                <View style={[glassCard, styles.listCard]}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[styles.libItem, i < 3 && styles.divider, { gap: 6 }]}>
                      <Skeleton width="60%" height={14} />
                      <Skeleton width="30%" height={10} />
                    </View>
                  ))}
                </View>
              ) : filteredLibrary.length === 0 ? (
                <EmptyState
                  compact
                  icon="book-open"
                  title="Aucun exercice"
                  message="Crée ton premier exercice ci-dessus : il sera gardé pour tes prochaines séances."
                />
              ) : (
                <View style={[glassCard, styles.listCard]}>
                  {filteredLibrary.map((ex, i) => (
                    <PressableScale
                      key={ex.id}
                      activeScale={0.985}
                      haptic="selection"
                      onPress={() => handleSelect(ex)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ajouter ${ex.name}`}
                      style={[styles.libItem, styles.libRow, i < filteredLibrary.length - 1 && styles.divider]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.libName} numberOfLines={1}>{ex.name}</Text>
                        <Text style={styles.libCat}>{ex.category}</Text>
                      </View>
                      <View style={styles.itemTags}>
                        {ex.tags.map(t => (
                          <View key={t} style={styles.miniTag}>
                            <Text style={styles.miniTagText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                      <Feather name="plus" size={18} color={theme.colors.sprintyBlue} />
                    </PressableScale>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    height: '80%',
    backgroundColor: theme.colors.backdrop,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  tagScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  tagContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
  tag: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
  },
  tagActive: {
    backgroundColor: 'rgba(0, 105, 232, 0.12)',
  },
  tagText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tagTextActive: {
    color: theme.colors.sprintyBlue,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  customInput: {
    flex: 1,
    width: undefined,
    marginBottom: 0,
  },
  customBtn: {
    paddingHorizontal: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  listCard: {
    paddingVertical: 4,
  },
  libItem: {
    minHeight: 56,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  libName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  libCat: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  itemTags: {
    flexDirection: 'row',
    gap: 4,
  },
  miniTag: {
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
});
