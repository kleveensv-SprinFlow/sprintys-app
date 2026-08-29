import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { useDebounce } from '../../../shared/hooks/useDebounce';
// import { BarcodeScanner } from './BarcodeScanner'; // To be implemented
// import { FoodDetailSheet } from './FoodDetailSheet'; // To be implemented

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { CameraView, useCameraPermissions } from 'expo-camera';

export const FoodSearchModal: React.FC = () => {
  const theme = useTheme();
  const { isSearchModalOpen, closeSearchModal, activeSearchMealType, addMealLog, currentDate } = useNutritionStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'barcode' | 'ai'>('text');
  
  const [permission, requestPermission] = useCameraPermissions();
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedQuery.trim().length > 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    const data = await openFoodFactsService.searchFood(query);
    setResults(data);
    setIsLoading(false);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setMode('text');
    setIsLoading(true);
    try {
      const product = await openFoodFactsService.getFoodByBarcode(data);
      if (product) {
        handleSelectProduct(product);
      } else {
        Alert.alert("Introuvable", "Ce produit n'a pas été trouvé dans la base de données.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission requise", "L'accès à la caméra est nécessaire pour scanner.");
        return;
      }
    }
    setMode('barcode');
  };

  const handleSelectProduct = async (product: OFFProduct) => {
    if (!activeSearchMealType) return;
    
    setIsLoading(true);
    // Pour l'instant on ajoute la portion par défaut (100g) pour débloquer l'utilisateur
    const quantity = 100; 
    const multiplier = quantity / 100;

    await addMealLog({
      meal_type: activeSearchMealType,
      consumed_at: currentDate,
      food_id: product.id,
      custom_food_name: product.name,
      quantity_g: quantity,
      calories: product.macros_100g.calories * multiplier,
      proteines: product.macros_100g.proteines * multiplier,
      glucides: product.macros_100g.glucides * multiplier,
      lipides: product.macros_100g.lipides * multiplier,
    });
    
    setIsLoading(false);
    closeSearchModal();
  };

  if (!isSearchModalOpen) return null;

  return (
    <Modal visible={isSearchModalOpen} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {mode === 'barcode' ? (
          <View style={{ flex: 1 }}>
            <CameraView 
              style={{ flex: 1 }} 
              facing="back"
              onBarcodeScanned={isLoading ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scannerOverlay}>
              <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setMode('text')}>
                <Feather name="x" size={24} color="#FFF" />
                <Text style={{ color: '#FFF', marginLeft: 8, fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
              <View style={styles.scanTarget} />
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity onPress={closeSearchModal} style={styles.iconButton}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {activeSearchMealType === 'petit_dejeuner' ? 'Petit Déjeuner' :
                 activeSearchMealType === 'dejeuner' ? 'Déjeuner' :
                 activeSearchMealType === 'diner' ? 'Dîner' : 'Collation'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* SEARCH BAR & QUICK ACTIONS */}
            <View style={styles.searchSection}>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface }]}>
                <Feather name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Rechercher un aliment..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={mode === 'text'}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.quickActions}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} onPress={openScanner}>
                  <Feather name="maximize" size={20} color={theme.colors.accent} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Scanner</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface, opacity: 0.5 }]}>
                  <Feather name="camera" size={20} color={theme.colors.accent} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Photo IA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface, opacity: 0.5 }]}>
                  <Feather name="mic" size={20} color={theme.colors.accent} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Dicter</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RESULTS LIST */}
            <View style={styles.resultsContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
              ) : results.length > 0 ? (
                <FlatList
                  data={results}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleSelectProduct(item)}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.productImage} />
                      ) : (
                        <View style={[styles.productImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
                          <Feather name="image" size={24} color={theme.colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]}>
                          {item.brand || 'Marque inconnue'} • {item.macros_100g.calories} kcal / 100g
                        </Text>
                      </View>
                      <Feather name="plus-circle" size={24} color={theme.colors.accent} />
                    </TouchableOpacity>
                  )}
                />
              ) : searchQuery.length > 2 ? (
                <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                  Aucun produit trouvé. Essayez de scanner le code-barres.
                </Text>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 15 }} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    Recherchez un aliment ou scannez un produit pour l'ajouter à votre repas.
                  </Text>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconButton: {
    padding: 5,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 13,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeScannerBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 20,
  },
  scanTarget: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  }
});
