import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useWorkoutBuilderStore, LibraryExercise, WorkoutCategory } from '../../../store/workoutBuilderStore';
import { theme } from '../../../core/theme';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>BIBLIOTHÈQUE D'EXERCICES</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>FERMER</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagContainer}>
            {TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagActive
                ]}
              >
                <Text style={[
                  styles.tagText,
                  selectedTags.includes(tag) && styles.tagTextActive
                ]}>{tag.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scroll}>
            <View style={styles.customRow}>
              <Input
                placeholder="Créer un exercice personnalisé..."
                value={customName}
                onChangeText={setCustomName}
                containerStyle={styles.customInput}
              />
              <Button
                title="AJOUTER"
                onPress={handleAddCustom}
                disabled={!customName}
                style={styles.customBtn}
              />
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginTop: 20 }} />
            ) : filteredLibrary.length === 0 ? (
              <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 20 }}>
                Aucun exercice dans votre bibliothèque.
              </Text>
            ) : (
              filteredLibrary.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => handleSelect(ex)}
                  style={styles.libItem}
                >
                  <View>
                    <Text style={styles.libName}>{ex.name}</Text>
                    <Text style={styles.libCat}>{ex.category}</Text>
                  </View>
                  <View style={styles.itemTags}>
                    {ex.tags.map(t => (
                      <View key={t} style={styles.miniTag}>
                        <Text style={styles.miniTagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    height: '80%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold as any,
    letterSpacing: 2,
  },
  closeBtn: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  tagText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.fontWeights.bold as any,
  },
  tagTextActive: {
    color: theme.colors.accent,
  },
  scroll: {
    paddingHorizontal: theme.spacing.xl,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  customInput: {
    flex: 1,
    marginBottom: 0,
  },
  customBtn: {
    height: 48,
  },
  libItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  libName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.semibold as any,
  },
  libCat: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold as any,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemTags: {
    flexDirection: 'row',
    gap: 4,
  },
  miniTag: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniTagText: {
    color: theme.colors.textMuted,
    fontSize: 8,
  },
});
