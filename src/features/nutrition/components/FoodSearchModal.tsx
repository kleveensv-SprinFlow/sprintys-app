import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { openFoodFactsService, OFFProduct } from '../../../services/openFoodFactsService';
import { useNutritionStore, MealType } from '../../../store/nutritionStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface FoodSearchModalProps {
  visible: boolean;
  onClose: () => void;
  mealType: MealType;
}

type ModalStep = 'search' | 'scan' | 'quantity';

export const FoodSearchModal = ({ visible, onClose, mealType }: FoodSearchModalProps) => {
  const addFoodLog = useNutritionStore((state) => state.addFoodLog);
  
  const [step, setStep] = useState<ModalStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<OFFProduct | null>(null);
  const [quantity, setQuantity] = useState('100');
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setStep('search');
      setSearchQuery('');
      setResults([]);
      setSelectedFood(null);
      setQuantity('100');
      setScanned(false);
    }
  }, [visible]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const data = await openFoodFactsService.searchFood(searchQuery);
    setResults(data);
    setLoading(false);
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    
    const product = await openFoodFactsService.getProductByBarcode(data);
    setLoading(false);
    
    if (product) {
      setSelectedFood(product);
      setStep('quantity');
    } else {
      Alert.alert('Produit non trouvé', 'Ce code-barres n\'est pas dans notre base de données.', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  const handleSelectFood = (food: OFFProduct) => {
    setSelectedFood(food);
    setStep('quantity');
  };

  const handleAddLog = () => {
    if (!selectedFood) return;
    
    const qtyGrams = parseFloat(quantity) || 0;
    if (qtyGrams <= 0) {
      Alert.alert('Quantité invalide', 'Veuillez entrer une quantité supérieure à 0.');
      return;
    }

    const ratio = qtyGrams / 100;
    
    addFoodLog({
      id: Math.random().toString(36).substr(2, 9),
      name: selectedFood.name,
      calories: Math.round(selectedFood.kcal100g * ratio),
      protein: Math.round(selectedFood.protein100g * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbs100g * ratio * 10) / 10,
      fats: Math.round(selectedFood.fat100g * ratio * 10) / 10,
      mealType: mealType,
      timestamp: Date.now(),
      quantity: qtyGrams,
    });

    onClose();
  };

  const renderScanner = () => {
    if (!permission) return <ActivityIndicator size="large" color="#00E5FF" />;
    
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Accès à la caméra requis pour scanner</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>AUTORISER LA CAMÉRA</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerWrapper}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scanTarget} />
            <Text style={styles.scanHint}>PLACE LE CODE-BARRES DANS LE CADRE</Text>
          </View>
        </CameraView>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('search')}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <Text style={styles.backBtnText}>RETOUR À LA RECHERCHE</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearch = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{mealType}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="RECHERCHER UN ALIMENT..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#00E5FF" />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.scanBtn} onPress={() => setStep('scan')}>
          <Ionicons name="barcode-outline" size={24} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectFood(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.name.toUpperCase()}</Text>
                <Text style={styles.foodBrand}>{item.brand}</Text>
              </View>
              <Text style={styles.foodKcal}>{item.kcal100g} KCAL / 100G</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchQuery ? <Text style={styles.emptyText}>AUCUN RÉSULTAT</Text> : null
          }
        />
      )}
    </View>
  );

  const renderQuantity = () => {
    if (!selectedFood) return null;
    
    const qty = parseFloat(quantity) || 0;
    const ratio = qty / 100;
    const calories = Math.round(selectedFood.kcal100g * ratio);
    const p = Math.round(selectedFood.protein100g * ratio * 10) / 10;
    const c = Math.round(selectedFood.carbs100g * ratio * 10) / 10;
    const l = Math.round(selectedFood.fat100g * ratio * 10) / 10;

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('search')} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>DÉTAILS</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.quantityHeader}>
            <Text style={styles.selectedFoodName}>{selectedFood.name.toUpperCase()}</Text>
            <Text style={styles.selectedFoodBrand}>{selectedFood.brand.toUpperCase()}</Text>
          </View>

          <View style={styles.macroPreview}>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{calories}</Text>
              <Text style={styles.macroLab}>KCAL</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{p}G</Text>
              <Text style={styles.macroLab}>PROT</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{c}G</Text>
              <Text style={styles.macroLab}>GLUC</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{l}G</Text>
              <Text style={styles.macroLab}>LIP</Text>
            </View>
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.label}>QUANTITÉ (GRAMMES)</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
              selectTextOnFocus
            />
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleAddLog}>
            <LinearGradient
              colors={['#00E5FF', '#BF5AF2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.confirmBtnText}>AJOUTER AU JOURNAL</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={Platform.OS === 'android' ? 100 : 80} tint="dark" style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          {step === 'search' && renderSearch()}
          {step === 'scan' && renderScanner()}
          {step === 'quantity' && renderQuantity()}
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  content: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase' },
  closeBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    alignItems: 'center',
    paddingRight: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: 18,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBtn: { padding: 12 },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 4 },
  scanBtn: { padding: 12 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  foodName: { color: '#FFF', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  foodBrand: { color: '#8E8E93', fontSize: 11, fontWeight: '600' },
  foodKcal: { color: '#00E5FF', fontSize: 11, fontWeight: '900' },
  emptyText: { color: '#8E8E93', textAlign: 'center', marginTop: 40, fontWeight: '700', letterSpacing: 1 },
  
  // Scanner
  scannerWrapper: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: width * 0.7,
    height: width * 0.4,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  scanHint: { color: '#FFF', fontSize: 12, fontWeight: '900', marginTop: 32, letterSpacing: 1.5 },
  backBtn: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: { color: '#FFF', marginLeft: 12, fontWeight: '800', fontSize: 13 },
  
  // Permission
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  permissionBtn: { backgroundColor: '#00E5FF', padding: 20, borderRadius: 16 },
  permissionBtnText: { color: '#000', fontWeight: '900', fontSize: 13 },

  // Quantity
  quantityHeader: { marginBottom: 40 },
  selectedFoodName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  selectedFoodBrand: { color: '#8E8E93', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  macroPreview: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 24, 
    padding: 24, 
    justifyContent: 'space-between',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  macroItem: { alignItems: 'center' },
  macroVal: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  macroLab: { color: '#8E8E93', fontSize: 9, fontWeight: '900' },
  macroDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  quantityContainer: { marginBottom: 40 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '900', marginBottom: 16, letterSpacing: 1.5 },
  quantityInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    color: '#00E5FF',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  confirmBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientBtn: {
    padding: 22,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});

