import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, ScrollView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { supabase } from '../../../services/supabase';
import { Database } from '../../../types/supabase';
import { IconButton } from '../../../shared/components/IconButton';
import { PressableScale } from '../../../shared/components/PressableScale';
import { EmptyState } from '../../../shared/components/EmptyState';

export type ExerciseCatalogRow = Database['public']['Tables']['exercises_catalog']['Row'];

interface ExerciseSearchProps {
  onSelect: (exercise: ExerciseCatalogRow) => void;
  onCancel?: () => void;
}

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({ onSelect, onCancel }) => {
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 24) + 8
    : (insets.top > 0 ? insets.top + 6 : 16);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ExerciseCatalogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Optional filters (for UI demonstration, could be expanded later)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const fetchExercises = async (query: string, equipment: string | null, zone: string | null) => {
    setIsLoading(true);
    try {
      let sbQuery = supabase.from('exercises_catalog').select('*');

      if (query.trim()) {
        const cleanQuery = query.trim().replace(/'/g, "''"); // escape single quotes
        sbQuery = sbQuery.or(`name_fr.ilike.%${cleanQuery}%,name_en.ilike.%${cleanQuery}%`);
      }

      if (equipment) {
        sbQuery = sbQuery.ilike('equipment', `%${equipment}%`);
      }

      if (zone) {
        // Assuming zones is a string[] in DB, Supabase allows array contains
        sbQuery = sbQuery.contains('zones', [zone]);
      }

      // We limit to 50 for performance but it's enough for a specific search
      sbQuery = sbQuery.limit(50);

      const { data, error } = await sbQuery;
      
      if (error) {
        console.error('Erreur recherche exercice:', error);
        setResults([]);
      } else {
        setResults(data || []);
      }
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchExercises(searchQuery, selectedEquipment, selectedZone);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedEquipment, selectedZone]);

  const renderItem = ({ item }: { item: ExerciseCatalogRow }) => (
    <PressableScale
      activeScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Ajouter ${item.name_fr}`}
      style={[glassCard, styles.resultItem]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name_fr}</Text>
        {!!item.name_en && <Text style={styles.resultNameEn}>{item.name_en}</Text>}

        {(!!item.equipment || (item.zones && item.zones.length > 0)) && (
          <View style={styles.tagsContainer}>
            {item.equipment && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.equipment}</Text>
              </View>
            )}
            {item.zones && item.zones.map((zone, idx) => (
              <View key={idx} style={[styles.tag, styles.zoneTag]}>
                <Text style={[styles.tagText, styles.zoneTagText]}>{zone}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.addCircle}>
        <Feather name="plus" size={18} color={theme.colors.sprintyBlue} />
      </View>
    </PressableScale>
  );

  const renderFilter = (label: string, active: boolean, onPress: () => void) => (
    <PressableScale
      key={label}
      haptic="selection"
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </PressableScale>
  );

  return (
    <View style={styles.container}>
      {/* Header / search bar */}
      <View style={[styles.searchHeader, { paddingTop: safeTop }]}>
        {onCancel && <IconButton icon="x" onPress={onCancel} accessibilityLabel="Fermer" />}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un exercice…"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.sprintyBlue}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <PressableScale
              haptic="selection"
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
            </PressableScale>
          )}
        </View>
      </View>

      {/* Quick filters */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {renderFilter('Haltères', selectedEquipment === 'Haltères', () => setSelectedEquipment(prev => prev === 'Haltères' ? null : 'Haltères'))}
          {renderFilter('Barre', selectedEquipment === 'Barre', () => setSelectedEquipment(prev => prev === 'Barre' ? null : 'Barre'))}
          {renderFilter('Poids du corps', selectedEquipment === 'Poids du corps', () => setSelectedEquipment(prev => prev === 'Poids du corps' ? null : 'Poids du corps'))}
          {renderFilter('Jambes', selectedZone === 'Jambes', () => setSelectedZone(prev => prev === 'Jambes' ? null : 'Jambes'))}
        </ScrollView>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.sprintyBlue} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            icon="search"
            title="Aucun exercice trouvé"
            message="Essaie un autre mot-clé ou retire un filtre."
            compact
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glassFill,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 16,
    marginLeft: 8,
    height: '100%',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.glassFill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
    borderColor: theme.colors.sprintyBlue,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.sprintyBlue,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultInfo: {
    flex: 1,
    paddingRight: 12,
  },
  resultName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  resultNameEn: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: theme.colors.glassFill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  zoneTag: {
    backgroundColor: 'rgba(0, 105, 232, 0.08)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  zoneTagText: {
    color: theme.colors.sprintyBlue,
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 105, 232, 0.1)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
