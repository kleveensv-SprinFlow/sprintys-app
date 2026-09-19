import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FoodDetailSheet } from './FoodDetailSheet';
import { aiNutritionService } from '../../../services/aiNutritionService';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [isAILoading, setIsAILoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'barcode'>('text');
  const [activeTab, setActiveTab] = useState<TabType>('recents');
  
  const [permission, requestPermission] = useCameraPermissions();
  const debouncedQuery = useDebounce(searchQuery, 500);

  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchHistory();
      setSearchQuery('');
      setMode('text');
      setResults([]);
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

  const handleAIPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission requise", "L'accès à l'appareil photo est nécessaire.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // We need base64 for OpenAI
    });

    if (!result.canceled && result.assets[0].base64) {
      await performAIAnalysis({ base64Image: result.assets[0].base64 });
    }
  };

  const handleAIText = async () => {
    if (searchQuery.trim().length < 3) return;
    await performAIAnalysis({ text: searchQuery.trim() });
  };

  const performAIAnalysis = async (input: { text?: string; base64Image?: string }) => {
    setIsAILoading(true);
    const result = await aiNutritionService.analyzeFood(input);
    setIsAILoading(false);

    if (result) {
      // Map AI Result to OFFProduct mock to open the detail sheet directly
      const aiMockProduct: OFFProduct = {
        id: `ai-${Date.now()}`,
        name: result.name,
        brand: 'Estimation IA ✨',
        image_url: '',
        macros_100g: {
          calories: (result.calories / result.quantity_g) * 100,
          proteines: (result.proteines / result.quantity_g) * 100,
          glucides: (result.glucides / result.quantity_g) * 100,
          lipides: (result.lipides / result.quantity_g) * 100,
        }
      };
      
      // We pass the exact estimated quantity as a property we can read later, 
      // but FoodDetailSheet handles 100g base. We will just set it as selected.
      // Wait, FoodDetailSheet defaults to 100g input. Let's just set the product, 
      // the user will type the quantity_g themselves if they want, 
      // or we can just inject the AI quantity.
      setSelectedProduct(aiMockProduct);
    } else {
      Alert.alert("Erreur", "L'IA n'a pas pu analyser cette demande.");
    }
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
        <View style={[styles.productImagePlaceholder, { backgroundColor: theme.colors.surfaceLight }]}>
          <Feather name="image" size={24} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]}>
          {item.brand || 'Aliment'} • {item.macros_100g?.calories ? Math.round(item.macros_100g.calories) : 0} kcal / 100g
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

        {/* AI Loading Overlay */}
        {isAILoading && (
          <View style={styles.aiLoadingOverlay}>
            <LinearGradient colors={['#0069E8', '#00DCFD']} style={styles.aiLoaderCircle}>
              <ActivityIndicator size="large" color="#FFF" />
            </LinearGradient>
            <Text style={styles.aiLoadingText}>L'IA analyse ton repas...</Text>
          </View>
        )}

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

            {/* SMART SEARCH BAR */}
            <View style={styles.searchSection}>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Feather name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Rechercher ou décrire à l'IA..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                
                {searchQuery.length > 0 ? (
                  <>
                    <TouchableOpacity onPress={handleAIText} style={styles.aiButtonTiny}>
                      <Feather name="zap" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 8 }}>
                      <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={openScanner}>
                      <Feather name="maximize" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAIPhoto}>
                      <Feather name="camera" size={20} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
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
                /* SEARCH RESULTS */
                <>
                  {/* AI Fallback Card when typing */}
                  <TouchableOpacity style={styles.aiFallbackCard} onPress={handleAIText}>
                    <LinearGradient colors={['rgba(0,105,232,0.1)', 'rgba(0,220,253,0.1)']} style={styles.aiFallbackGradient}>
                      <View style={styles.aiFallbackIcon}>
                        <Feather name="zap" size={20} color={theme.colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.aiFallbackTitle, { color: theme.colors.accent }]}>Demander à l'IA</Text>
                        <Text style={[styles.aiFallbackSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          "{searchQuery}"
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={theme.colors.accent} />
                    </LinearGradient>
                  </TouchableOpacity>

                  {results.length > 0 ? (
                    <FlatList
                      data={results}
                      keyExtractor={(item, index) => `${item.id}-${index}`}
                      keyboardShouldPersistTaps="handled"
                      renderItem={renderProductItem}
                    />
                  ) : searchQuery.length > 2 ? (
                    <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                      Aucun produit standard trouvé. Utilisez le bouton IA ci-dessus pour estimer ce repas !
                    </Text>
                  ) : null}
                </>
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
                      <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>Aucun aliment récent.</Text>
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
                      <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>Aucun aliment fréquent.</Text>
                    )
                  )}
                  {activeTab === 'repas' && (
                    <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>Vos repas sauvegardés apparaîtront ici.</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  aiButtonTiny: {
    backgroundColor: '#0069E8',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
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
    paddingHorizontal: 20,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  closeScannerBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 20,
    zIndex: 10,
  },
  aiLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLoaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0026AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  aiLoadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0069E8',
  },
  aiFallbackCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 105, 232, 0.2)',
  },
  aiFallbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  aiFallbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiFallbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiFallbackSub: {
    fontSize: 13,
  },
});
