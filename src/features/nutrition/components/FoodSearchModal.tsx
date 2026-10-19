import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TouchableOpacity } from '../../../shared/components/Tappable';
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
import { formatRecentSubtitle, pluralizeLabel, quantityFromAiItem, resolveFoodPortion } from '../data/portionDictionary';
import { spokenFoodTitle, foodStateLabel } from '../../../services/foodSearchRank';
import { aiNutritionService, ParsedFoodItem } from '../../../services/aiNutritionService';
import { LinearGradient } from 'expo-linear-gradient';
import { glassSurface } from '../../../core/glass';
import { GlowBackground } from '../../../shared/components/GlowBackground';
import { PressableScale } from '../../../shared/components/PressableScale';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { MealIcon } from './MealIcon';
import { useConsentStore } from '../../../store/consentStore';
import { MacroLanes } from './MacroLanes';
import { mealLabel, MACROS, MacroKey, MEAL_ACCENT, MEAL_ACCENT_TINT } from '../nutritionTheme';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert } from '../../../shared/feedback/appAlert';
import { AIQuotaError } from '../../../services/aiNutritionService';
import { useEntitlementStore, billingOn, remainingToday } from '../../../store/entitlementStore';
import { useAuthStore } from '../../../store/authStore';
import { isMinorAthlete } from '../../../legal/age';

type TabType = 'recents' | 'frequents' | 'repas';

const formatMacro = (n: number) =>
  n > 0 && n < 10 ? (Math.round(n * 10) / 10).toLocaleString('fr-FR') : Math.round(n).toLocaleString('fr-FR');

/** Macros as three colored dots (P / G / L) with their grams. */
const MacroDots = ({ values }: { values: Record<MacroKey, number> }) => (
  <View style={styles.macroDots}>
    {MACROS.map((m) => (
      <View key={m.key} style={styles.macroDot}>
        <View style={[styles.macroDotMark, { backgroundColor: m.color }]} />
        <Text style={styles.macroDotText}>
          {formatMacro(values[m.key] || 0)} g {m.short}
        </Text>
      </View>
    ))}
  </View>
);

export const FoodSearchModal: React.FC = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const isMinor = isMinorAthlete(user);
  const { 
    isSearchModalOpen, closeSearchModal, activeSearchMealType, 
    addMealLog, currentDate,
    fetchHistory, recentFoods, frequentFoods, savedMeals,
    quickAddFood, logSavedMeal, deleteSavedMeal
  } = useNutritionStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [results, setResults] = useState<HybridFoodResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'barcode' | 'ai-text' | 'ai-loading' | 'ai-review'>('text');
  const [aiOriginalText, setAiOriginalText] = useState('');
  const [aiParsedMeal, setAiParsedMeal] = useState<(ParsedFoodItem & { matchedItem?: HybridFoodResult; stateUnconfirmed?: boolean })[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('recents');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');
  const [replaceResults, setReplaceResults] = useState<HybridFoodResult[]>([]);
  const [isReplacingLoading, setIsReplacingLoading] = useState(false);
  const [sessionAddedCount, setSessionAddedCount] = useState(0);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const debouncedQuery = useDebounce(searchQuery, 500);

  // We keep selectedProduct as any for now, since FoodDetailSheet will need updates too.
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (isSearchModalOpen) {
      fetchHistory();
      setSearchQuery('');
      setAiQuery('');
      setMode('text');
      setResults([]);
      setSessionAddedCount(0);
      setNotificationMessage(null);
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
      stateUnconfirmed: false,
    };
    setAiParsedMeal(newArr);
    setReplacingIndex(null);
  };

  const performSearch = async (query: string) => {
    const seq = ++searchSeq.current;
    setIsLoading(true);
    const generic = await nutritionService.searchCiqual(query);
    if (seq !== searchSeq.current) return;
    setResults(generic);
    setIsLoading(false);
    const packaged = await nutritionService.searchPackaged(query);
    if (seq !== searchSeq.current) return;
    if (packaged.length > 0) setResults([...generic, ...packaged]);
  };

  /** A limit was reached: close this sheet first (two modals cannot be open together on iOS), then offer the plans. */
  const planInfo = useEntitlementStore((st) => st.info);
  /** Uses left today for a limited plan (null when nothing is limited). */
  const leftOf = (kind: 'scan' | 'photo' | 'text'): number | null => {
    if (!planInfo || !planInfo.billing_enabled || planInfo.source !== 'free') return null;
    return remainingToday(planInfo, kind);
  };

  const showPaywall = (feature: 'photo' | 'text' | 'scan', detail?: string) => {
    closeSearchModal();
    setTimeout(() => useEntitlementStore.getState().openPaywall(feature, detail), 450);
  };

  const limitDetail = (kind: 'photo' | 'text' | 'scan') => {
    const info = useEntitlementStore.getState().info;
    if (kind === 'scan') return undefined;
    if (info?.photo_text_per_week != null) return `Tu as utilisé tes ${info.photo_text_per_week} analyses de repas de la semaine (photo ou phrase). Avec Plus, plus de limite.`;
    const limit = kind === 'photo' ? info?.photo_per_day : info?.text_per_day;
    return limit ? `Tu as atteint ta limite de ${kind === 'photo' ? 'photos' : 'saisies en une phrase'} du jour.` : undefined;
  };

  /** Quick check before opening the camera or the keyboard, so nobody takes a photo for nothing. */
  const limitReached = (kind: 'photo' | 'text' | 'scan') => {
    if (!billingOn() || kind === 'scan') return false;
    if (remainingToday(useEntitlementStore.getState().info, kind) !== 0) return false;
    showPaywall(kind, limitDetail(kind));
    return true;
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setMode('text');
    setIsLoading(true);
    try {
      const product = await openFoodFactsService.getFoodByBarcode(data);
      if (product) {
        setSelectedProduct(product);
      } else {
        appAlert("Introuvable", "Ce produit n'a pas été trouvé dans la base de données.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openScanner = async () => {
    if (limitReached('scan')) return;
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        appAlert("Permission requise", "L'accès à la caméra est nécessaire pour scanner.");
        return;
      }
    }
    setMode('barcode');
  };

  const handleAIPhoto = async () => {
    // Asked before the camera opens: the photo is sent to the AI provider
    if (limitReached('photo')) return;
    if (!(await useConsentStore.getState().ensureAIConsent())) return;
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      appAlert("Permission requise", "L'accès à l'appareil photo est nécessaire.");
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
    let parsedItems: Awaited<ReturnType<typeof aiNutritionService.analyzeFood>> = null;
    try {
      parsedItems = await aiNutritionService.analyzeFood(input);
    } catch (e) {
      setIsAILoading(false);
      setMode('text');
      if (e instanceof AIQuotaError) {
        showPaywall(e.feature, limitDetail(e.feature));
        useEntitlementStore.getState().refresh();
        return;
      }
    }
    setIsAILoading(false);
    if (parsedItems && parsedItems.length > 0) {
      useEntitlementStore.getState().noteUse(input.base64Image ? 'photo' : 'text');
    }

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

            const matchedBlob = bestMatch.type === 'ciqual'
              ? `${(bestMatch.item as CiqualFood).etat || ''} ${(bestMatch.item as CiqualFood).nom || ''}`.toLowerCase()
              : '';
            const cookedWords = ['cuit', 'plat', 'roti', 'rôti', 'vapeur', 'grille'];
            const wantsCooked = cookedWords.some((word) => targetEtat.includes(word));
            const foodIsCooked = cookedWords.some((word) => matchedBlob.includes(word));
            const stateUnconfirmed = Boolean(targetEtat)
              && bestMatch.type === 'ciqual'
              && !matchedBlob.includes(targetEtat)
              && !(wantsCooked && foodIsCooked);

            return { ...item, matchedItem: bestMatch, stateUnconfirmed };
         }
         return item;
      }));
      setAiParsedMeal(matchedArray);
      setMode('ai-review');
    } else {
      appAlert("Erreur", "L'IA n'a pas pu analyser cette demande.");
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

      const weighed = quantityFromAiItem(item, f_name);
      const weightG = weighed.weightG;
      const gramsPerUnit = weighed.gramsPerUnit;
      const unitLabel = weighed.unitLabel;

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
    setReplacingIndex(null);
    closeSearchModal();
  };

  const removeItem = (index: number) => {
    const newArr = [...aiParsedMeal];
    newArr.splice(index, 1);
    setAiParsedMeal(newArr);
    if (newArr.length === 0) setMode('text');
  };

  const handleConfirmAdd = async (payload: FoodAddPayload, keepSearching: boolean = false) => {
    if (!activeSearchMealType || !selectedProduct) return;
    
    setIsLoading(true);
    const displayName = selectedProduct.display_name || selectedProduct.nom || selectedProduct.name || 'Aliment';
    await addMealLog({
      meal_type: activeSearchMealType,
      consumed_at: currentDate,
      food_id: selectedProduct.id,
      custom_food_name: displayName,
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
    setSessionAddedCount((prev) => prev + 1);
    setNotificationMessage(
      isMinor
        ? `${displayName} ajouté !`
        : `${displayName} ajouté (${payload.calories} kcal)`
    );
    setTimeout(() => setNotificationMessage(null), 3000);

    if (!keepSearching) {
      closeSearchModal();
    }
  };

  const handleQuickAddRecent = async (item: any) => {
    if (!activeSearchMealType) return;
    const ok = await quickAddFood(item, activeSearchMealType);
    if (ok) {
      const name = item.food_name || item.name || 'Aliment';
      setSessionAddedCount((prev) => prev + 1);
      setNotificationMessage(
        isMinor
          ? `${name} ajouté !`
          : `${name} ajouté (${Math.round(item.last_calories || 0)} kcal)`
      );
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleLogSavedMeal = async (savedMeal: any) => {
    if (!activeSearchMealType) return;
    const ok = await logSavedMeal(savedMeal, activeSearchMealType);
    if (ok) {
      const itemsCount = savedMeal.saved_meal_items?.length || 0;
      setSessionAddedCount((prev) => prev + itemsCount);
      setNotificationMessage(`Repas "${savedMeal.name}" ajouté !`);
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleDeleteSavedMeal = (id: string, name: string) => {
    appAlert(
      'Supprimer ce repas',
      `Le repas enregistré « ${name} » sera supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteSavedMeal(id),
        },
      ]
    );
  };

  const renderSavedMealItem = ({ item }: { item: any }) => {
    const items = item.saved_meal_items || [];
    const totalKcal = Math.round(items.reduce((sum: number, it: any) => sum + Number(it.calories || 0), 0));
    const totalPro = Math.round(items.reduce((sum: number, it: any) => sum + Number(it.proteines || 0), 0));
    const totalGlu = Math.round(items.reduce((sum: number, it: any) => sum + Number(it.glucides || 0), 0));
    const totalLip = Math.round(items.reduce((sum: number, it: any) => sum + Number(it.lipides || 0), 0));
    const namesSummary = items.map((it: any) => it.custom_food_name || 'Aliment').join(', ');

    return (
      <View style={[styles.savedMealCard, glassSurface]}>
        <View style={styles.savedMealHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.savedMealName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.savedMealSummary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {namesSummary || 'Aucun aliment'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteSavedMeal(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4 }}
          >
            <Feather name="trash-2" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.savedMealFooter}>
          <View style={{ flex: 1 }}>
            {isMinor ? (
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>
                {item.items.length} aliment{item.items.length > 1 ? 's' : ''}
              </Text>
            ) : (
              <>
                <Text style={[styles.savedMealKcal, { color: theme.colors.text }]}>{totalKcal} kcal</Text>
                <MacroDots values={{ proteines: totalPro, glucides: totalGlu, lipides: totalLip }} />
              </>
            )}
          </View>

          <PressableScale style={styles.savedMealAddBtn} onPress={() => handleLogSavedMeal(item)}>
            <Feather name="plus" size={15} color="#FFF" />
            <Text style={styles.savedMealAddText}>Ajouter tout</Text>
          </PressableScale>
        </View>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: HybridFoodResult | any }) => {
    let name = '';
    let detail = '';
    let kcalLabel = '';
    let macros: Record<MacroKey, number> | null = null;
    let kind: 'ciqual' | 'off' | 'recent' = 'recent';

    if (item.type === 'ciqual' || item.type === 'off') {
      kind = item.type;
      if (item.type === 'ciqual') {
        const c = item.item as CiqualFood;
        name = c.display_name || spokenFoodTitle(c.nom);
        const portion = resolveFoodPortion({ nom: c.nom });
        const grams = portion.defaultUnit === 'piece' && portion.pieceWeight
          ? Math.round(portion.pieceWeight)
          : portion.defaultUnit === 'ml'
            ? portion.defaultQty
            : 100;
        const factor = grams / 100;
        kcalLabel = `${Math.round((c.energie_kcal || 0) * factor)} kcal`;
        const state = foodStateLabel(c.nom, c.etat || '');
        detail = portion.defaultUnit === 'piece'
          ? `Aliment · 1 ${portion.pieceLabel} · ${grams} g`
          : portion.defaultUnit === 'ml'
            ? `Aliment · ${grams} ml`
            : `Aliment${state ? ` · ${state}` : ''} · 100 g`;
        macros = {
          proteines: (c.proteines || 0) * factor,
          glucides: (c.glucides || 0) * factor,
          lipides: (c.lipides || 0) * factor,
        };
      } else {
        const o = item.item as OFFProduct;
        name = o.name;
        const portion = resolveFoodPortion({
          name: o.name,
          serving_quantity: o.serving_quantity,
          serving_size: o.serving_size,
        });
        const grams = portion.defaultUnit === 'piece' && portion.pieceWeight
          ? Math.round(portion.pieceWeight)
          : portion.defaultUnit === 'ml'
            ? portion.defaultQty
            : 100;
        const factor = grams / 100;
        const kcal = o.macros_100g?.calories ? Math.round(o.macros_100g.calories * factor) : 0;
        kcalLabel = kcal ? `${kcal} kcal` : '';
        detail = portion.defaultUnit === 'piece'
          ? `${o.brand || 'Produit'} · 1 ${portion.pieceLabel}`
          : portion.defaultUnit === 'ml'
            ? `${o.brand || 'Produit'} · ${grams} ml`
            : `${o.brand || 'Produit'} · 100 g`;
        macros = {
          proteines: (o.macros_100g.proteines || 0) * factor,
          glucides: (o.macros_100g.glucides || 0) * factor,
          lipides: (o.macros_100g.lipides || 0) * factor,
        };
      }
    } else {
      name = item.food_name || item.name;
      detail = (item.last_calories != null || item.last_quantity_g != null)
        ? formatRecentSubtitle(item, isMinor)
        : (isMinor ? 'Déjà ajouté' : `Déjà ajouté · ${Math.round(item.macros_100g?.calories || 0)} kcal / 100 g`);
    }

    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: theme.colors.hairline }]}
        onPress={() => setSelectedProduct(item.type ? item.item : item)}
        activeOpacity={0.6}
      >
        <View style={[styles.productImagePlaceholder, { backgroundColor: kind === 'ciqual' ? MEAL_ACCENT_TINT : theme.colors.glassFill }]}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: kind === 'ciqual' ? MEAL_ACCENT : theme.colors.textSecondary }}>
            {(name.trim()[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {detail}
          </Text>
          {!isMinor && macros ? <MacroDots values={macros} /> : null}
        </View>
        {!isMinor && kcalLabel ? (
          <Text style={[styles.kcalLabel, { color: theme.colors.text }]}>{kcalLabel}</Text>
        ) : null}
        <PressableScale
          onPress={() => {
            if (kind === 'recent') {
              handleQuickAddRecent(item);
            } else {
              setSelectedProduct(item.type ? item.item : item);
            }
          }}
          hitSlop={10}
          style={styles.addCircle}
        >
          <Feather name="plus" size={18} color={MEAL_ACCENT} />
        </PressableScale>
      </TouchableOpacity>
    );
  };

  if (!isSearchModalOpen) return null;

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Modal
      visible={isSearchModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      // Android back leaves the scanner or the AI review first; an iOS swipe down always closes the sheet
      onRequestClose={() => (Platform.OS === 'android' && (mode === 'barcode' || mode === 'ai-review') ? setMode('text') : closeSearchModal())}
    >
      <FeedbackHost />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backdrop }]}>
        <GlowBackground />
        
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
            <Text style={styles.aiLoadingText}>Sprinty analyse ton repas…</Text>
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
              <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 16, fontWeight: '600' }}>Place le code-barres dans le cadre</Text>
            </View>
          </View>
        ) : mode === 'ai-loading' ? (
          <View style={{ flex: 1, padding: 16 }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={[styles.closeCircle, glassSurface]}>
                   <Feather name="chevron-left" size={22} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>Analyse en cours...</Text>
               <View style={{ width: 38 }} />
             </View>

             <View style={styles.aiUnderstoodBox}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.aiUnderstoodTitle}>Ce que Sprinty a compris</Text>
                  <Text style={[styles.aiUnderstoodText, { color: theme.colors.text }]}>"{aiOriginalText}"</Text>
                </View>
                <Feather name="message-square" size={22} color={MEAL_ACCENT} />
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
          <View style={{ flex: 1, padding: 16 }}>
             <View style={[styles.header, { marginBottom: 24 }]}>
               <TouchableOpacity onPress={() => setMode('ai-text')} style={[styles.closeCircle, glassSurface]}>
                   <Feather name="chevron-left" size={22} color={theme.colors.text} />
               </TouchableOpacity>
               <Text style={[styles.title, { color: theme.colors.text }]}>
                 {aiParsedMeal.length > 1 ? "Résumé du repas" : ""}
               </Text>
               <View style={{ width: 38 }} />
             </View>

             <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
               <View style={styles.aiUnderstoodBox}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.aiUnderstoodTitle}>Ce que Sprinty a compris</Text>
                    <Text style={[styles.aiUnderstoodText, { color: theme.colors.text }]}>"{aiOriginalText}"</Text>
                  </View>
                  <Feather name="message-square" size={22} color={MEAL_ACCENT} />
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

                   const matchedName = isCiqual
                     ? (item.matchedItem?.item as any).nom
                     : (isMatched ? (item.matchedItem?.item as any).name : item.name);
                   const weightG = quantityFromAiItem(item, matchedName).weightG;
                   const mult = weightG / 100;
                   
                   const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                   const bPro = isMatched ? (isCiqual ? (item.matchedItem?.item as any).proteines : ((item.matchedItem?.item as any).macros_100g?.proteines || 0)) : item.fallback_pro_100g;
                   const bGlu = isMatched ? (isCiqual ? (item.matchedItem?.item as any).glucides : ((item.matchedItem?.item as any).macros_100g?.glucides || 0)) : item.fallback_glu_100g;
                   const bLip = isMatched ? (isCiqual ? (item.matchedItem?.item as any).lipides : ((item.matchedItem?.item as any).macros_100g?.lipides || 0)) : item.fallback_lip_100g;

                   tKcal += bKcal * mult; tPro += bPro * mult; tGlu += bGlu * mult; tLip += bLip * mult;
                 });

                 return (
                   <View style={[styles.aiTotalCard, glassSurface]}>
                     <View style={styles.aiTotalTop}>
                       {isMinor ? (
                         <Text style={[styles.aiTotalKcal, { color: theme.colors.text }]}>
                           {aiParsedMeal.length} aliment{aiParsedMeal.length > 1 ? 's reconnus' : ' reconnu'}
                         </Text>
                       ) : (
                         <Text style={[styles.aiTotalKcal, { color: theme.colors.text }]}>
                           {Math.round(tKcal)}
                           <Text style={[styles.aiTotalUnit, { color: theme.colors.textSecondary }]}> kcal</Text>
                         </Text>
                       )}
                       <Text style={[styles.aiTotalBadge, { color: allCiqual ? theme.colors.success : theme.colors.textSecondary }]}>
                         {allCiqual ? 'Vérifié CIQUAL' : 'Estimation'}
                       </Text>
                     </View>
                     {!isMinor && <MacroLanes compact values={{ proteines: tPro, glucides: tGlu, lipides: tLip }} />}
                   </View>
                 );
               })()}

               <View style={{ gap: 12, marginBottom: 24 }}>
                    {aiParsedMeal.map((item, index) => {
                       const isMatched = !!item.matchedItem;
                       const isCiqual = isMatched && item.matchedItem?.type === 'ciqual';
                       const matchedName = isCiqual
                         ? (item.matchedItem?.item as any).nom
                         : (isMatched ? (item.matchedItem?.item as any).name : item.name);
                       const weighed = quantityFromAiItem(item, matchedName);
                       const bKcal = isMatched ? (isCiqual ? (item.matchedItem?.item as any).energie_kcal : ((item.matchedItem?.item as any).macros_100g?.calories || 0)) : item.fallback_kcal_100g;
                       const totalKcal = Math.round(bKcal * (weighed.weightG / 100));
                       const unitSuffix = item.unit === 'piece'
                         ? `${pluralizeLabel(weighed.unitLabel, item.qty)} · ${Math.round(weighed.weightG)} g`
                         : 'g';

                       return (
                         <View key={index} style={[{ padding: 12, borderRadius: 16 }, glassSurface]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                               <TouchableOpacity onPress={() => handleOpenReplace(index, item)}>
                                 <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{item.name}</Text>
                                 <Text style={{ fontSize: 13, color: item.stateUnconfirmed ? '#B45309' : theme.colors.textSecondary, marginTop: 2 }}>
                                   {matchedName && matchedName !== item.name ? matchedName : 'Changer l’aliment'}
                                   {item.stateUnconfirmed ? ' · état non confirmé' : ''}
                                 </Text>
                               </TouchableOpacity>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <TextInput 
                                    style={{ fontSize: 14, color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.border, minWidth: 40, textAlign: 'center', marginRight: 4, padding: 0 }}
                                    keyboardType="numeric"
                                    value={String(item.qty)}
                                    onChangeText={(val) => {
                                       const num = parseFloat(val.replace(',', '.'));
                                       const newArr = [...aiParsedMeal];
                                       newArr[index] = { ...item, qty: Number.isFinite(num) ? num : 0 };
                                       setAiParsedMeal(newArr);
                                    }}
                                  />
                                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>{unitSuffix}{!isMinor ? `  •  ${totalKcal} kcal` : ''}</Text>
                               </View>
                            </View>
                            <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 8 }}>
                               <Feather name="x" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            </View>
                            {replacingIndex === index && (
                              <View style={{ marginTop: 10 }}>
                                <TextInput
                                  value={replaceSearchQuery}
                                  onChangeText={handleSearchReplace}
                                  placeholder="Changer l’aliment"
                                  placeholderTextColor={theme.colors.textSecondary}
                                  style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text, marginBottom: 8 }}
                                />
                                {isReplacingLoading ? (
                                  <ActivityIndicator color={theme.colors.accent} />
                                ) : replaceResults.slice(0, 6).map((result, resultIndex) => {
                                  const label = result.type === 'ciqual' ? (result.item as CiqualFood).nom : (result.item as OFFProduct).name;
                                  const detail = result.type === 'ciqual' ? (result.item as CiqualFood).etat : (result.item as OFFProduct).brand;
                                  return (
                                    <TouchableOpacity key={`${label}-${resultIndex}`} onPress={() => handleSelectReplacement(result)} style={{ paddingVertical: 8 }}>
                                      <Text style={{ color: theme.colors.text, fontSize: 14 }}>{label}{detail ? ` · ${detail}` : ''}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            )}
                         </View>
                       );
                    })}
                  </View>
             </ScrollView>

             <TouchableOpacity 
                 style={{ backgroundColor: MEAL_ACCENT, borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: isLoading ? 0.7 : 1 }} 
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={{ padding: 16, flex: 1 }}>
              <View style={[styles.header, { marginBottom: 32 }]}>
                <TouchableOpacity onPress={() => setMode('text')} style={[styles.closeCircle, glassSurface]}>
                    <Feather name="chevron-left" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ width: 38 }} />
              </View>

              <Text style={{ fontSize: 32, fontWeight: '800', color: theme.colors.text, marginBottom: 24, lineHeight: 38 }}>
                Décris ton repas
              </Text>

              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    ...glassSurface,
                    borderRadius: 16,
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
                
                <TouchableOpacity style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: MEAL_ACCENT_TINT, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="mic" size={16} color={MEAL_ACCENT} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ padding: 16, paddingBottom: 32 }}>
              <TouchableOpacity 
                style={{ backgroundColor: MEAL_ACCENT, borderRadius: 100, paddingVertical: 16, alignItems: 'center', opacity: (!aiQuery || !aiQuery.trim() || isAILoading) ? 0.5 : 1 }}
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
              <PressableScale onPress={closeSearchModal} haptic="selection" hitSlop={8} style={[styles.closeCircle, glassSurface]}>
                <Feather name="chevron-down" size={22} color={theme.colors.text} />
              </PressableScale>
              <View style={styles.headerTitleRow}>
                {activeSearchMealType && <MealIcon type={activeSearchMealType} size={18} tile={false} />}
                <Text style={[styles.title, { color: theme.colors.text }]}>{mealLabel(activeSearchMealType)}</Text>
              </View>
              <View style={{ width: 38 }} />
            </View>

            {/* STANDARD SEARCH BAR */}
            <View style={styles.searchSection}>
              <View style={[styles.searchInputContainer, glassSurface]}>
                <Feather name="search" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Un aliment, un produit… (riz, œuf, skyr)"
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
                {[
                  { key: 'scan', icon: 'maximize', label: 'Code-barres', onPress: openScanner },
                  { key: 'photo', icon: 'camera', label: 'Photo', onPress: handleAIPhoto },
                  {
                    key: 'text',
                    icon: 'edit-3',
                    label: 'Décrire',
                    onPress: async () => {
                      if (limitReached('text')) return;
                      if (await useConsentStore.getState().ensureAIConsent()) setMode('ai-text');
                    },
                  },
                ].map((action) => (
                  <PressableScale
                    key={action.key}
                    onPress={action.onPress}
                    containerStyle={{ flex: 1 }}
                    style={[styles.aiActionTile, glassSurface]}
                  >
                    <View style={styles.aiActionIcon}>
                      <Feather name={action.icon as any} size={18} color={MEAL_ACCENT} />
                    </View>
                    <Text style={[styles.aiActionText, { color: theme.colors.text }]}>{action.label}</Text>
                    {leftOf(action.key as 'scan' | 'photo' | 'text') !== null && (
                      <Text style={styles.aiActionLeft}>
                        {leftOf(action.key as 'scan' | 'photo' | 'text')} {leftOf(action.key as 'scan' | 'photo' | 'text') === 1 ? 'restant' : 'restants'}
                      </Text>
                    )}
                  </PressableScale>
                ))}
              </View>
            )}

            {/* TABS */}
            {!isSearching && (
              <View style={styles.tabsContainer}>
                <SegmentedControl
                  options={[
                    { key: 'recents', label: 'Récents' },
                    { key: 'frequents', label: 'Fréquents' },
                    { key: 'repas', label: 'Mes repas' },
                  ]}
                  value={activeTab}
                  onChange={(key) => setActiveTab(key)}
                />
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
                    savedMeals.length > 0 ? (
                      <FlatList
                        data={savedMeals}
                        keyExtractor={(item, index) => `saved-meal-${item.id}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderSavedMealItem}
                        contentContainerStyle={{ paddingBottom: sessionAddedCount > 0 ? 80 : 20 }}
                      />
                    ) : (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Feather name="bookmark" size={36} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                        <Text style={[styles.noResults, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                          Aucun repas enregistré.{"\n"}Ouvre un repas déjà rempli et touche « Enregistrer » pour le retrouver ici en un geste.
                        </Text>
                      </View>
                    )
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        )}

        {/* BANDEAU FLOTTANT DE VALIDATION MULTI-AJOUT */}
        {sessionAddedCount > 0 && (
          <View style={[styles.sessionFloatingBar, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.sessionBarCount, { color: theme.colors.text }]}>
                {sessionAddedCount} ajouté{sessionAddedCount > 1 ? 's' : ''} à ce repas
              </Text>
              {notificationMessage && (
                <Text style={[styles.sessionBarMessage, { color: MEAL_ACCENT }]} numberOfLines={1}>
                  {notificationMessage}
                </Text>
              )}
            </View>
            <PressableScale style={styles.sessionDoneBtn} onPress={closeSearchModal} haptic="medium">
              <Text style={styles.sessionDoneText}>Terminé</Text>
            </PressableScale>
          </View>
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
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  aiActionTile: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    gap: 6,
  },
  aiActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEAL_ACCENT_TINT,
  },
  aiActionLeft: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 1 },
  aiActionText: {
    fontWeight: '700',
    fontSize: 13,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kcalLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 10,
    fontVariant: ['tabular-nums'],
  },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEAL_ACCENT_TINT,
  },
  macroDots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  macroDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDotMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  productImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
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
  aiUnderstoodBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    marginBottom: 20,
    backgroundColor: MEAL_ACCENT_TINT,
  },
  aiUnderstoodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MEAL_ACCENT,
    marginBottom: 4,
  },
  aiUnderstoodText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  aiTotalCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 20,
  },
  aiTotalTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  aiTotalKcal: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  aiTotalUnit: {
    fontSize: 15,
    fontWeight: '600',
  },
  aiTotalBadge: {
    fontSize: 13,
    fontWeight: '700',
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
  },
  savedMealCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  savedMealKcal: {
    fontSize: 16,
    fontWeight: '800',
  },
  savedMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  savedMealName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  savedMealSummary: {
    fontSize: 13,
  },
  savedMealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  savedMealMacros: {
    fontSize: 13,
  },
  savedMealAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: MEAL_ACCENT,
  },
  savedMealAddText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionFloatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  sessionBarCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionBarMessage: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  sessionDoneBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: MEAL_ACCENT,
  },
  sessionDoneText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
