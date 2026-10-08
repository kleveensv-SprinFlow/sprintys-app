import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { nutritionService, HybridFoodResult, CiqualFood } from '../../../services/nutritionService';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FoodDetailSheet, FoodAddPayload } from './FoodDetailSheet';
import { resolveFoodPortion } from '../data/portionDictionary';
import { aiNutritionService, ParsedFoodItem } from '../../../services/aiNutritionService';
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
  const [aiQuery, setAiQuery] = useState('');
  const [results, setResults] = useState<HybridFoodResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'barcode' | 'ai-text' | 'ai-loading' | 'ai-review'>('text');
  const [aiOriginalText, setAiOriginalText] = useState('');
  const [isEditingList, setIsEditingList] = useState(false);
  const [aiParsedMeal, setAiParsedMeal] = useState<(ParsedFoodItem & { matchedItem?: HybridFoodResult })[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('recents');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');
  const [replaceResults, setReplaceResults] = useState<HybridFoodResult[]>([]);
  const [isReplacingLoading, setIsReplacingLoading] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const debouncedQuery = useDebounce(searchQuery, 500);

  // We keep selectedProduct as any for now, since FoodDetailSheet will need updates too.
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchHistory();
      setSearchQuery('');
      setAiQuery('');
      setMode('text');
      setResults([]);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (mode === 'text' && debouncedQuery.trim().length > 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, mode]);

  const handleOpenReplace = (index: number, currentItem: any) => {
    setReplacingIndex(index);
    const q = currentItem.query || currentItem.name;
    setReplaceSearchQuery(q);
    setIsReplacingLoading(true);
    nutritionService.searchFoodHybrid(q).then(res => {
      setReplaceResults(res);
      setIsReplacingLoading(false);
    });
  };

  const handleSearchReplace = (text: string) => {
    setReplaceSearchQuery(text);
    if (text.trim().length > 1) {
      setIsReplacingLoading(true);
      nutritionService.searchFoodHybrid(text.trim()).then(res => {
        setReplaceResults(res);
        setIsReplacingLoading(false);
      });
    }
  };

  const handleSelectReplacement = (result: HybridFoodResult) => {
    if (replacingIndex === null) return;
    const newArr = [...aiParsedMeal];
    const oldItem = newArr[replacingIndex];
    const newName = result.type === 'ciqual' ? (result.item as CiqualFood).nom : (result.item as OFFProduct).name;
    newArr[replacingIndex] = {
      ...oldItem,
      name: newName,
      matchedItem: result,
    };
    setAiParsedMeal(newArr);
    setReplacingIndex(null);
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    const data = await nutritionService.searchFoodHybrid(query);
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
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await performAIAnalysis({ base64Image: result.assets[0].base64 });
    }
  };

  const handleAIText = async () => {
    if (aiQuery.trim().length < 3) return;
    await performAIAnalysis({ text: aiQuery.trim() });
  };

  const performAIAnalysis = async (input: { text?: string; base64Image?: string }) => {
    if (input.text) setAiOriginalText(input.text);
    if (input.base64Image) setAiOriginalText('Photo de mon assiette');
    setMode('ai-loading');
    setIsAILoading(true);
    const parsedItems = await aiNutritionService.analyzeFood(input);
    setIsAILoading(false);

    if (parsedItems && parsedItems.length > 0) {
      const matchedArray = await Promise.all(parsedItems.map(async (item) => {
         const results = await nutritionService.searchFoodHybrid(item.query);
         if (results.length > 0) {
            const targetEtat = (item.etat || '').toLowerCase();
            let bestMatch = results[0];

            if (targetEtat) {
              const ciqualMatches = results.filter(r => r.type === 'ciqual');
              if (ciqualMatches.length > 0) {
                const exactState = ciqualMatches.find(r => {
                  const c = r.item as CiqualFood;
                  const cEtat = (c.etat || '').toLowerCase();
                  const cNom = (c.nom || '').toLowerCase();
                  return cEtat.includes(targetEtat) || cNom.includes(targetEtat);
                });

                if (exactState) {
                  bestMatch = exactState;
                } else {
                  const isLookingForCooked = targetEtat.includes('cuit') || targetEtat.includes('plat') || targetEtat.includes('roti') || targetEtat.includes('rôti');
                  const notOpposite = ciqualMatches.find(r => {
                    const c = r.item as CiqualFood;
                    const cEtat = (c.etat || '').toLowerCase();
                    const cNom = (c.nom || '').toLowerCase();
                    return isLookingForCooked ? (!cEtat.includes('cru') && !cNom.includes('cru')) : (!cEtat.includes('cuit') && !cNom.includes('cuit'));
                  });
                  if (notOpposite) bestMatch = notOpposite;
                  else bestMatch = ciqualMatches[0];
                }
              }
            }

            return { ...item, matchedItem: bestMatch };
         }
         return item;
      }));
      setAiParsedMeal(matchedArray);
      setMode('ai-review');
    } else {
      Alert.alert("Erreur", "L'IA n'a pas pu analyser cette demande.");
    }
  };
  const confirmAIMeal = async () => {
    if (!activeSearchMealType) return;
    setIsLoading(true);
    for (const item of aiParsedMeal) {
      let f_id = undefined;
      let f_name = item.name;
      let kcal = item.fallback_kcal_100g;
      let pro = item.fallback_pro_100g;
      let glu = item.fallback_glu_100g;
      let lip = item.fallback_lip_100g;

      if (item.matchedItem) {
        if (item.matchedItem.type === 'ciqual') {
           const c = item.matchedItem.item as any;
           f_id = c.id;
           f_name = c.nom;
           kcal = c.energie_kcal;
           pro = c.proteines;
           glu = c.glucides;
           lip = c.lipides;
        } else {
           const o = item.matchedItem.item as any;
           f_id = o.id;
           f_name = o.name;
           kcal = o.macros_100g?.calories || 0;
           pro = o.macros_100g?.proteines || 0;
           glu = o.macros_100g?.glucides || 0;
           lip = o.macros_100g?.lipides || 0;
        }
      }

      let weightG = item.qty;
      let gramsPerUnit = 1;
      let unitLabel = item.unit === 'piece' ? 'pièce' : 'g';

      if (item.unit === 'piece') {
        const portionInfo = resolveFoodPortion({ nom: f_name });
        gramsPerUnit = portionInfo.pieceWeight || 60;
        unitLabel = portionInfo.pieceLabel || 'pièce';
        weightG = item.qty * gramsPerUnit;
      }

      const multiplier = weightG / 100;

      await addMealLog({
        meal_type: activeSearchMealType,
        consumed_at: currentDate,
        food_id: f_id,
        custom_food_name: f_name,
        quantity_g: Math.round(weightG),
        calories: Math.round(kcal * multiplier),
        proteines: Math.round(pro * multiplier),
        glucides: Math.round(glu * multiplier),
        lipides: Math.round(lip * multiplier),
        input_qty: item.qty,
        input_unit: item.unit,
        grams_per_unit: gramsPerUnit,
        unit_label: unitLabel,
      });
    }
    setIsLoading(false);
    setMode('text');
    setAiQuery('');
    setAiParsedMeal([]);
    setAiOriginalText('');
    setIsEditingList(false);
    closeSearchModal();
  };

  const removeItem = (index: number) => {
    const newArr = [...aiParsedMeal];
    newArr.splice(index, 1);
    setAiParsedMeal(newArr);
    if (newArr.length === 0) setMode('text');
  };

  const handleConfirmAdd = async (payload: FoodAddPayload) => {
    if (!activeSearchMealType || !selectedProduct) return;
    
    setIsLoading(true);
    await addMealLog({
      meal_type: activeSearchMealType,
      consumed_at: currentDate,
      food_id: selectedProduct.id,
      custom_food_name: selectedProduct.nom || selectedProduct.name || 'Aliment',
      quantity_g: payload.totalGrams,
      calories: payload.calories,
      proteines: payload.pro,
      glucides: payload.glu,
      lipides: payload.lip,
      input_qty: payload.inputQty,
      input_unit: payload.inputUnit,
      grams_per_unit: payload.gramsPerUnit,
      unit_label: payload.unitLabel,
    });
    
    setIsLoading(false);
    setSelectedProduct(null);
    closeSearchModal();
  };

  const renderProductItem = ({ item }: { item: HybridFoodResult | any }) => {
    let name = '';
    let sub = '';
    let imageUrl = null;
    let calories = 0;
    let type = 'recent'; // par défaut
    
    // Si c'est un résultat de recherche hybride
    if (item.type === 'ciqual' || item.type === 'off') {
      type = item.type;
      const data = item.item;
      if (item.type === 'ciqual') {
        const c = data as CiqualFood;
        name = c.nom;
        sub = `CIQUAL 🛡️ ${c.etat ? `• ${c.etat}` : ''} • ${Math.round(c.energie_kcal)} kcal / 100g`;
        calories = c.energie_kcal;
      } else {
        const o = data as OFFProduct;
        name = o.name;
        sub = `${o.brand || 'Produit industriel'} 🛒 • ${o.macros_100g?.calories ? Math.round(o.macros_100g.calories) : 0} kcal / 100g`;
        imageUrl = o.image_url;
      }
    } else {
      // Pour l'historique (frequent / recent)
      name = item.food_name || item.name;
      sub = `Historique • ${Math.round(item.calories || item.macros_100g?.calories || 0)} kcal`;
      imageUrl = item.image_url;
    }

    return (
      <TouchableOpacity 
        style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => setSelectedProduct(item.type ? item.item : item)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImagePlaceholder, { backgroundColor: type === 'ciqual' ? 'rgba(76, 175, 80, 0.1)' : theme.colors.surfaceLight }]}>
            <Feather name={type === 'ciqual' ? 'check-circle' : 'image'} size={24} color={type === 'ciqual' ? '#4CAF50' : theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Feather name="plus-circle" size={24} color={theme.colors.accent} />
      </TouchableOpacity>
    );
  };

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
        ) : mode === 'ai-loading' ? (
          <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={styles.iconButton}>
                   <Feather name="arrow-left" size={28} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>Analyse en cours...</Text>
               <View style={{ width: 28 }} />
             </View>

             <View style={{ backgroundColor: '#E8F7F3', padding: 16, borderRadius: 12, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1B5E20', marginBottom: 4 }}>Voici ce que nous avons compris</Text>
                  <Text style={{ fontSize: 16, color: '#2E7D32', fontStyle: 'italic' }}>"{aiOriginalText}"</Text>
                </View>
                <Feather name="message-square" size={24} color="#81C784" />
             </View>

             <View style={{ gap: 16 }}>
                <View style={{ height: 32, width: '70%', backgroundColor: theme.colors.border, borderRadius: 8, opacity: 0.5 }} />
                <View style={{ height: 20, width: '40%', backgroundColor: theme.colors.border, borderRadius: 4, opacity: 0.5 }} />
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                  <View style={{ width: '48%', height: 70, backgroundColor: theme.colors.border, borderRadius: 12, opacity: 0.5 }} />
                </View>
             </View>
          </View>
        ) : mode === 'ai-review' ? (
          <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={styles.iconButton}>
                   <Feather name="arrow-left" size={28} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>
                 {aiParsedMeal.length > 1 ? "Résumé du repas" : ""}
               </Text>
               <View style={{ width: 28 }} />
             </View>

             <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
               <View style={{ backgroundColor: '#E8F7F3', padding: 16, borderRadius: 12, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1B5E20', marginBottom: 4 }}>Voici ce que nous avons compris</Text>
                    <Text style={{ fontSize: 16, color: '#2E7D32', fontStyle: 'italic' }}>"{aiOriginalText}"</Text>
                  </View>
                  <Feather name="message-square" size={24} color="#81C784" />
               </View>

               {aiParsedMeal.length === 1 && (
                 <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 20 }}>
                   {aiParsedMeal[0].name}
                 </Text>
               )}

               {/* GRILLE 2x2 TOTALE */}
               {(() => {
                 let tKcal = 0, tPro = 0, tGlu = 0, tLip = 0;
                 let allCiqual = aiParsedMeal.length > 0;
                 
                 aiParsedMeal.forEach(item => {
                   const isMatched = !!item.matchedItem;
                   const isCiqual = isMatched && item.matchedItem?.type === 'ciqual';
                   if (!isMatched || !isCiqual) allCiqual = false;

                   let weightG = item.qty;
                   if (item.unit === 'piece') weightG = item.qty * 60;
                   const mult = weightG / 100;
                   
                   const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                   const bPro = isMatched ? (isCiqual ? (item.matchedItem?.item as any).proteines : ((item.matchedItem?.item as any).macros_100g?.proteines || 0)) : item.fallback_pro_100g;
                   const bGlu = isMatched ? (isCiqual ? (item.matchedItem?.item as any).glucides : ((item.matchedItem?.item as any).macros_100g?.glucides || 0)) : item.fallback_glu_100g;
                   const bLip = isMatched ? (isCiqual ? (item.matchedItem?.item as any).lipides : ((item.matchedItem?.item as any).macros_100g?.lipides || 0)) : item.fallback_lip_100g;

                   tKcal += bKcal * mult; tPro += bPro * mult; tGlu += bGlu * mult; tLip += bLip * mult;
                 });

                 return (
                   <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 24 }}>
                     <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.border }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{Math.round(tKcal)} kcal</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Calories</Text>
                        </View>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tGlu.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Glucides</Text>
                        </View>
                     </View>
                     <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.border }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tPro.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Protéines</Text>
                        </View>
                        <View style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                           <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>{tLip.toFixed(1)} g</Text>
                           <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Matières grasses</Text>
                        </View>
                     </View>
                     <View style={{ padding: 12, backgroundColor: theme.colors.surfaceLight, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                          {allCiqual ? "Vérifié CIQUAL" : "Estimation"}
                        </Text>
                     </View>
                   </View>
                 );
               })()}

               {(aiParsedMeal.length > 1 || isEditingList) ? (
                  <View style={{ gap: 12, marginBottom: 24 }}>
                    {aiParsedMeal.map((item, index) => {
                       const isMatched = !!item.matchedItem;
                       const isCiqual = isMatched && item.matchedItem?.type === 'ciqual';
                       let weightG = item.qty;
                       if (item.unit === 'piece') weightG = item.qty * 60;
                       
                       const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                       const totalKcal = Math.round(bKcal * (weightG / 100));

                       return (
                         <View key={index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                            <View style={{ flex: 1 }}>
                               <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{item.name}</Text>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <TextInput 
                                    style={{ fontSize: 14, color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.border, minWidth: 40, textAlign: 'center', marginRight: 4, padding: 0 }}
                                    keyboardType="numeric"
                                    value={weightG.toString()}
                                    onChangeText={(val) => {
                                       const num = parseInt(val) || 0;
                                       const newArr = [...aiParsedMeal];
                                       newArr[index] = { ...item, qty: num, unit: 'g' };
                                       setAiParsedMeal(newArr);
                                    }}
                                  />
                                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>g  •  {totalKcal} kcal</Text>
                               </View>
                            </View>
                            <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8 }}>
                               <Feather name="x" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                         </View>
                       );
                    })}
                  </View>
               ) : (
                  <TouchableOpacity onPress={() => setIsEditingList(true)} style={{ paddingVertical: 12, alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1B5E20' }}>Ajouter ou modifier des éléments</Text>
                  </TouchableOpacity>
               )}
             </ScrollView>

             <TouchableOpacity 
                 style={{ backgroundColor: '#1C1C1E', borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: isLoading ? 0.7 : 1 }} 
                 onPress={confirmAIMeal}
                 disabled={isLoading}
             >
                 {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                 ) : (
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Confirmer et ajouter</Text>
                 )}
             </TouchableOpacity>
          </View>
        ) : mode === 'ai-text' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ padding: 16, flex: 1 }}>
              <View style={[styles.header, { marginBottom: 32 }]}>
                <TouchableOpacity onPress={() => setMode('text')} style={styles.iconButton}>
                    <Feather name="arrow-left" size={28} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ width: 28 }} />
              </View>

              <Text style={{ fontSize: 32, fontWeight: '800', color: theme.colors.text, marginBottom: 24, lineHeight: 38 }}>
                Dites-nous ce que{"\n"}vous mangez
              </Text>

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 16,
                    paddingBottom: 40,
                    fontSize: 16,
                    color: theme.colors.text,
                    minHeight: 180,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Une cuillère à soupe de sauce huître"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  autoFocus
                  maxLength={500}
                  value={aiQuery}
                  onChangeText={setAiQuery}
                />
                
                <Text style={{ position: 'absolute', bottom: 16, left: 16, fontSize: 12, color: theme.colors.textSecondary }}>
                  {500 - (aiQuery || '').length} caractères restants
                </Text>
                
                <TouchableOpacity style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F7F3', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="mic" size={16} color="#1B5E20" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ padding: 16, paddingBottom: 32 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#1C1C1E', borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: (!aiQuery || !aiQuery.trim() || isAILoading) ? 0.5 : 1 }}
                onPress={handleAIText}
                disabled={!aiQuery || !aiQuery.trim() || isAILoading}
              >
                {isAILoading ? (
                   <ActivityIndicator color="#FFF" />
                ) : (
                   <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Analyser mon repas</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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

            {/* STANDARD SEARCH BAR */}
            <View style={styles.searchSection}>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Feather name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Rechercher un aliment (ex: oeuf, riz)..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Feather name="x-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* QUICK ACTIONS ROW */}
            {!isSearching && (
              <View style={styles.aiActionRow}>
                <TouchableOpacity style={styles.aiActionBtn} onPress={() => setMode('ai-text')}>
                  <View style={[styles.aiActionGradient, { backgroundColor: theme.colors.surfaceLight }]}>
                    <Feather name="edit-3" size={16} color={theme.colors.text} />
                    <Text style={[styles.aiActionText, { color: theme.colors.text }]}>Décrire</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.aiActionBtn} onPress={handleAIPhoto}>
                  <View style={[styles.aiActionGradient, { backgroundColor: theme.colors.surfaceLight }]}>
                    <Feather name="camera" size={16} color={theme.colors.text} />
                    <Text style={[styles.aiActionText, { color: theme.colors.text }]}>Photo</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.aiActionBtn} onPress={openScanner}>
                  <View style={[styles.aiActionGradient, { backgroundColor: theme.colors.surfaceLight }]}>
                    <Feather name="maximize" size={16} color={theme.colors.text} />
                    <Text style={[styles.aiActionText, { color: theme.colors.text }]}>Scanner</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* TABS */}
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
                results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.type === 'ciqual' ? (item.item as any).id : ((item.item as any).id || index)}-${index}`}
                    keyboardShouldPersistTaps="handled"
                    renderItem={renderProductItem}
                  />
                ) : searchQuery.length > 2 ? (
                  <Text style={[styles.noResults, { color: theme.colors.textSecondary }]}>
                    Aucun produit trouvé.
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
  aiActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  aiActionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,105,232,0.15)',
  },
  aiActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  aiActionText: {
    fontWeight: 'bold',
    fontSize: 14,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
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
  aiTextContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  aiIconLarge: {
    marginBottom: 16,
  },
  aiIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiTextSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  aiTextInput: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  aiSubmitBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  aiSubmitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
