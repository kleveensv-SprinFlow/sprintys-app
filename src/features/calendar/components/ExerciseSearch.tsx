import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { supabase } from '../../../services/supabase';
import { Database } from '../../../types/supabase';

export type ExerciseCatalogRow = Database['public']['Tables']['exercises_catalog']['Row'];

interface ExerciseSearchProps {
  onSelect: (exercise: ExerciseCatalogRow) => void;
  onCancel?: () => void;
}

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({ onSelect, onCancel }) => {
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
    <TouchableOpacity style={styles.resultItem} onPress={() => onSelect(item)}>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name_fr}</Text>
        <Text style={styles.resultNameEn}>{item.name_en || 'N/A'}</Text>
        
        <View style={styles.tagsContainer}>
          {item.equipment && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.equipment}</Text>
            </View>
          )}
          {item.zones && item.zones.map((zone, idx) => (
            <View key={idx} style={[styles.tag, styles.zoneTag]}>
              <Text style={styles.tagText}>{zone}</Text>
            </View>
          ))}
        </View>
      </View>
      <Feather name="plus" size={20} color={theme.colors.accent} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header / Search bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un exercice..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters (Optional expansion: could map actual catalog distinct equipments/zones) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
        <TouchableOpacity 
          style={[styles.filterChip, selectedEquipment === 'Haltères' && styles.filterChipActive]}
          onPress={() => setSelectedEquipment(prev => prev === 'Haltères' ? null : 'Haltères')}
        >
          <Text style={[styles.filterChipText, selectedEquipment === 'Haltères' && styles.filterChipTextActive]}>Haltères</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, selectedEquipment === 'Barre' && styles.filterChipActive]}
          onPress={() => setSelectedEquipment(prev => prev === 'Barre' ? null : 'Barre')}
        >
          <Text style={[styles.filterChipText, selectedEquipment === 'Barre' && styles.filterChipTextActive]}>Barre</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, selectedEquipment === 'Poids du corps' && styles.filterChipActive]}
          onPress={() => setSelectedEquipment(prev => prev === 'Poids du corps' ? null : 'Poids du corps')}
        >
          <Text style={[styles.filterChipText, selectedEquipment === 'Poids du corps' && styles.filterChipTextActive]}>Poids du corps</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, selectedZone === 'Jambes' && styles.filterChipActive]}
          onPress={() => setSelectedZone(prev => prev === 'Jambes' ? null : 'Jambes')}
        >
          <Text style={[styles.filterChipText, selectedZone === 'Jambes' && styles.filterChipTextActive]}>Jambes</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="inbox" size={40} color={theme.colors.border} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>Aucun exercice trouvé</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    marginLeft: 8,
  },
  cancelBtn: {
    marginLeft: 12,
  },
  cancelText: {
    color: theme.colors.accent,
    fontSize: 16,
  },
  filtersContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtersContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent + '20',
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.accent,
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultInfo: {
    flex: 1,
    paddingRight: 15,
  },
  resultName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultNameEn: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  zoneTag: {
    backgroundColor: '#3498db15',
    borderColor: '#3498db40',
  },
  tagText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
