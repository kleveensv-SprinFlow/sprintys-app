import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';

interface FoodDetailSheetProps {
  product: any | null; // CiqualFood | OFFProduct
  visible: boolean;
  onClose: () => void;
  onAdd: (totalGrams: number, calories: number, pro: number, glu: number, lip: number) => void;
}

export const FoodDetailSheet: React.FC<FoodDetailSheetProps> = ({ product, visible, onClose, onAdd }) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('100');
  const [unit, setUnit] = useState<'g' | 'serving' | 'piece'>('g');
  
  useEffect(() => {
    // Reset when product changes
    if (visible && product) {
      if (product.serving_quantity) {
        setUnit('serving');
        setInputValue('1');
      } else {
        setUnit('g');
        setInputValue('100');
      }
    }
  }, [visible, product]);

  if (!product) return null;

  const numericValue = parseFloat(inputValue.replace(',', '.')) || 0;
  
  let totalGrams = 0;
  if (unit === 'g') {
    totalGrams = numericValue;
  } else if (unit === 'serving') {
    totalGrams = numericValue * (product.serving_quantity || 100);
  } else if (unit === 'piece') {
    // 60g par oeuf/fruit par défaut si on choisit pièce (à améliorer avec table des portions)
    totalGrams = numericValue * 60; 
  }

  const multiplier = totalGrams / 100;
  
  // Extract macros safely depending on CIQUAL or OFF format
  const baseKcal = product.energie_kcal ?? product.macros_100g?.calories ?? 0;
  const basePro = product.proteines ?? product.macros_100g?.proteines ?? 0;
  const baseGlu = product.glucides ?? product.macros_100g?.glucides ?? 0;
  const baseLip = product.lipides ?? product.macros_100g?.lipides ?? 0;

  const currentMacros = {
    calories: Math.round(baseKcal * multiplier),
    proteines: Math.round(basePro * multiplier),
    glucides: Math.round(baseGlu * multiplier),
    lipides: Math.round(baseLip * multiplier),
  };

  const handleAdd = () => {
    if (totalGrams <= 0) return;
    onAdd(totalGrams, currentMacros.calories, currentMacros.proteines, currentMacros.glucides, currentMacros.lipides);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContent, { backgroundColor: theme.colors.background }]}>
          
          {/* Handle for swipe down feel */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* HEADER: Product Info */}
          <View style={styles.productHeader}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: product.nom ? 'rgba(76, 175, 80, 0.1)' : theme.colors.surface }]}>
                <Feather name={product.nom ? 'check-circle' : 'image'} size={30} color={product.nom ? '#4CAF50' : theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={2}>
                {product.nom || product.name}
              </Text>
              <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]}>
                {product.nom ? `CIQUAL 🛡️ ${product.etat ? `• ${product.etat}` : ''}` : (product.brand || 'Produit industriel 🛒')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* INPUT ZONE (Yazio Style) */}
          <View style={styles.inputZone}>
            <TextInput
              style={[styles.numberInput, { color: theme.colors.text, borderBottomColor: theme.colors.accent }]}
              keyboardType="numeric"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              selectTextOnFocus
              maxLength={5}
            />
            
            {/* Unit Toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity 
                style={[styles.unitBtn, unit === 'g' && { backgroundColor: theme.colors.accent }]}
                onPress={() => setUnit('g')}
              >
                <Text style={[styles.unitText, { color: unit === 'g' ? '#FFF' : theme.colors.text }]}>g / ml</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.unitBtn, unit === 'piece' && { backgroundColor: theme.colors.accent }]}
                onPress={() => setUnit('piece')}
              >
                <Text style={[styles.unitText, { color: unit === 'piece' ? '#FFF' : theme.colors.text }]}>1 Pièce</Text>
              </TouchableOpacity>

              {product.serving_quantity ? (
                <TouchableOpacity 
                  style={[styles.unitBtn, unit === 'serving' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => setUnit('serving')}
                >
                  <Text style={[styles.unitText, { color: unit === 'serving' ? '#FFF' : theme.colors.text }]}>
                    Portion ({product.serving_quantity}g)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* LIVE MACROS PREVIEW */}
          <View style={styles.macrosPreview}>
            <View style={[styles.macroPill, { backgroundColor: theme.colors.surfaceLight }]}>
              <Text style={[styles.macroValue, { color: theme.colors.text }]}>{currentMacros.calories}</Text>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Kcal</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: '#FF6B6B20' }]}>
              <Text style={[styles.macroValue, { color: '#FF6B6B' }]}>{currentMacros.proteines}g</Text>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Protéines</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: '#4ECDC420' }]}>
              <Text style={[styles.macroValue, { color: '#2BA69C' }]}>{currentMacros.glucides}g</Text>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Glucides</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: '#FFE66D20' }]}>
              <Text style={[styles.macroValue, { color: '#D4B82A' }]}>{currentMacros.lipides}g</Text>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Lipides</Text>
            </View>
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: theme.colors.accent }]} 
            onPress={handleAdd}
          >
            <Text style={styles.submitText}>Ajouter au journal</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
  },
  closeBtn: {
    padding: 5,
  },
  inputZone: {
    alignItems: 'center',
    marginBottom: 30,
  },
  numberInput: {
    fontSize: 60,
    fontWeight: '900',
    textAlign: 'center',
    borderBottomWidth: 3,
    minWidth: 150,
    paddingBottom: 5,
    marginBottom: 20,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  unitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  unitText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  macrosPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  macroPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  submitButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
