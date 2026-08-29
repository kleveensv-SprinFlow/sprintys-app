import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FoodDetailSheet } from './FoodDetailSheet';

type TabType = 'recents' | 'frequents' | 'repas';

export const FoodSearchModal: React.FC = () => {
  const theme = useTheme();
  const { 
    isSearchModalOpen, closeSearchModal, activeSearchMealType, 
    addMealLog, currentDate,
    fetchHistory, recentFoods, frequentFoods, savedMeals
  } = useNutritionStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'barcode'>('text');
  const [activeTab, setActiveTab] = useState<TabType>('recents');
  
  const [permission, requestPermission] = useCameraPermissions();
  const debouncedQuery = useDebounce(searchQuery, 500);

  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchHistory();
    }
  }, [isSearchModalOpen]);

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
        setSelectedProduct(product);
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

  const handleConfirmAdd = async (totalGrams: number, calories: number, pro: number, glu: number, lip: number) => {
    if (!activeSearchMealType || !selectedProduct) return;
    
    setIsLoading(true);
    await addMealLog({
      meal_type: activeSearchMealType,
      consumed_at: currentDate,
      food_id: selectedProduct.id,
      custom_food_name: selectedProduct.name,
      quantity_g: totalGrams,
      calories,
      proteines: pro,
      glucides: glu,
      lipides: lip,
    });
    
    setIsLoading(false);
    setSelectedProduct(null);
    closeSearchModal();
  };

  const renderProductItem = ({ item }: { item: OFFProduct }) => (
    <TouchableOpacity 
      style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => setSelectedProduct(item)}
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
          {item.brand || 'Aliment'} • {item.macros_100g?.calories || 0} kcal / 100g
        </Text>
      </View>
      <Feather name="plus-circle" size={24} color={theme.colors.accent} />
    </TouchableOpacity>
  );

  if (!isSearchModalOpen) return null;

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Modal visible={isSearchModalOpen} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        
        <FoodDetailSheet 
          product={selectedProduct} 
          visible={!!selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onAdd={handleConfirmAdd}
        />

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
                <Feather name="chevron-down" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {activeSearchMealType === 'petit_dejeuner' ? 'Petit Déjeuner' :
                 activeSearchMealType === 'dejeuner' ? 'Déjeuner' :
                 activeSearchMealType === 'diner' ? 'Dîner' : 'Collation'}
              </Text>
              <View style={{ width: 28 }} />
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
                  autoFocus={false}
                />
                {searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={openScanner}>
                    <Feather name="maximize" size={20} color={theme.colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* TABS (Only show if not typing a search query) */}
            {!isSearching && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity 
                  style={[styles.tabBtn, activeTab === 'recents' && { borderBottomColor: theme.colors.accent }]}
                  onPress={() => setActiveTab('recents')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'recents' ? theme.colors.accent : theme.colors.textSecondary }]}>Récents</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabBtn, activeTab === 'frequents' && { borderBottomColor: theme.colors.accent }]}
                  onPress={() => setActiveTab('frequents')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'frequents' ? theme.colors.accent : theme.colors.textSecondary }]}>Fréquents</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabBtn, activeTab === 'repas' && { borderBottomColor: theme.colors.accent }]}
                  onPress={() => setActiveTab('repas')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'repas' ? theme.colors.accent : theme.colors.textSecondary }]}>Mes Repas</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* RESULTS LIST */}
            <View style={styles.resultsContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
              ) : isSearching ? (
                /* OPENFOODFACTS SEARCH RESULTS */
                results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    keyboardShouldPersistTaps="handled"
                    renderItem={renderProductItem}
                  />
                ) : searchQuery.length > 2 ? (
                  <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                    Aucun produit trouvé. Essayez de scanner le code-barres.
                  </Text>
                ) : null
              ) : (
                /* TABS CONTENT */
                <>
                  {activeTab === 'recents' && (
                    recentFoods.length > 0 ? (
                      <FlatList
                        data={recentFoods}
                        keyExtractor={(item, index) => `recent-${item.id}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderProductItem}
                      />
                    ) : (
                      <View style={styles.emptyState}>
                        <Feather name="clock" size={40} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 15 }} />
                        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                          Vos aliments récents apparaîtront ici.
                        </Text>
                      </View>
                    )
                  )}

                  {activeTab === 'frequents' && (
                    frequentFoods.length > 0 ? (
                      <FlatList
                        data={frequentFoods}
                        keyExtractor={(item, index) => `freq-${item.id}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderProductItem}
                      />
                    ) : (
                      <View style={styles.emptyState}>
                        <Feather name="star" size={40} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 15 }} />
                        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                          Les aliments que vous mangez souvent apparaîtront ici.
                        </Text>
                      </View>
                    )
                  )}

                  {activeTab === 'repas' && (
                    savedMeals.length > 0 ? (
                      <FlatList
                        data={savedMeals}
                        keyExtractor={(item) => `meal-${item.id}`}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <View style={[styles.mealItem, { borderBottomColor: theme.colors.border }]}>
                            <View style={styles.mealInfo}>
                              <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                              <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]}>
                                {item.saved_meal_items?.length || 0} aliment(s)
                              </Text>
                            </View>
                            <TouchableOpacity style={[styles.addMealBtn, { backgroundColor: theme.colors.accent }]}>
                              <Feather name="plus" size={20} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                      />
                    ) : (
                      <View style={styles.emptyState}>
                        <Feather name="list" size={40} color={theme.colors.textSecondary} style={{ opacity: 0.5, marginBottom: 15 }} />
                        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                          Vous n'avez pas encore sauvegardé de repas.
                        </Text>
                        <TouchableOpacity style={[styles.createMealBtn, { borderColor: theme.colors.accent }]}>
                          <Text style={[styles.createMealText, { color: theme.colors.accent }]}>Créer un repas</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </>
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
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
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
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  mealInfo: {
    flex: 1,
  },
  addMealBtn: {
    padding: 8,
    borderRadius: 20,
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
    paddingTop: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  createMealBtn: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createMealText: {
    fontWeight: 'bold',
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
