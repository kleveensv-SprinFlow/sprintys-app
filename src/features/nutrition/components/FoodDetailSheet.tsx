import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { resolveFoodPortion, ResolvedPortion } from '../data/portionDictionary';

export interface FoodAddPayload {
  totalGrams: number;
  calories: number;
  pro: number;
  glu: number;
  lip: number;
  inputQty: number;
  inputUnit: 'g' | 'piece' | 'serving';
  gramsPerUnit: number;
  unitLabel: string;
}

interface FoodDetailSheetProps {
  product: any | null; // CiqualFood | OFFProduct
  visible: boolean;
  onClose: () => void;
  onAdd: (data: FoodAddPayload) => void;
}

export const FoodDetailSheet: React.FC<FoodDetailSheetProps> = ({ product, visible, onClose, onAdd }) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('100');
  const [unit, setUnit] = useState<'g' | 'serving' | 'piece'>('g');
  const [portionInfo, setPortionInfo] = useState<ResolvedPortion | null>(null);

  useEffect(() => {
    if (visible && product) {
      const resolved = resolveFoodPortion(product);
      setPortionInfo(resolved);
      setUnit(resolved.defaultUnit);
      setInputValue(String(resolved.defaultQty));
    }
  }, [visible, product]);

  if (!product) return null;

  const numericValue = parseFloat(inputValue.replace(',', '.')) || 0;

  // Calcul du poids et des métadonnées selon l'unité
  let totalGrams = 0;
  let gramsPerUnit = 1;
  let unitLabel = 'g';

  if (unit === 'piece') {
    gramsPerUnit = portionInfo?.pieceWeight || 60;
    unitLabel = portionInfo?.pieceLabel || 'pièce';
    totalGrams = numericValue * gramsPerUnit;
  } else if (unit === 'serving') {
    gramsPerUnit = portionInfo?.servingWeight || 100;
    unitLabel = portionInfo?.servingLabel || 'portion';
    totalGrams = numericValue * gramsPerUnit;
  } else {
    gramsPerUnit = 1;
    unitLabel = 'g';
    totalGrams = numericValue;
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

  const handleSwitchUnit = (targetUnit: 'g' | 'piece' | 'serving') => {
    if (unit === targetUnit) return;

    if (targetUnit === 'g') {
      // Vers les grammes : conversion exacte
      let grams = numericValue;
      if (unit === 'piece') {
        grams = numericValue * (portionInfo?.pieceWeight || 60);
      } else if (unit === 'serving') {
        grams = numericValue * (portionInfo?.servingWeight || 100);
      }
      setUnit('g');
      setInputValue(String(Math.round(grams)));
    } else if (targetUnit === 'piece') {
      const pieceWeight = portionInfo?.pieceWeight || 60;
      if (inputValue === '100') {
        // Défaut 100 non touché -> bascule à 1
        setInputValue('1');
      } else {
        // Poids personnalisé -> arrondi au demi le plus proche
        let currentG = numericValue;
        if (unit === 'serving') currentG = numericValue * (portionInfo?.servingWeight || 100);
        const pieces = Math.round((currentG / pieceWeight) * 2) / 2 || 1;
        setInputValue(String(pieces));
      }
      setUnit('piece');
    } else if (targetUnit === 'serving') {
      const servingWeight = portionInfo?.servingWeight || 100;
      if (inputValue === '100') {
        setInputValue('1');
      } else {
        let currentG = numericValue;
        if (unit === 'piece') currentG = numericValue * (portionInfo?.pieceWeight || 60);
        const servings = Math.round((currentG / servingWeight) * 2) / 2 || 1;
        setInputValue(String(servings));
      }
      setUnit('serving');
    }
  };

  const handleAdd = () => {
    if (totalGrams <= 0 || numericValue <= 0) return;
    onAdd({
      totalGrams: Math.round(totalGrams),
      calories: currentMacros.calories,
      pro: currentMacros.proteines,
      glu: currentMacros.glucides,
      lip: currentMacros.lipides,
      inputQty: numericValue,
      inputUnit: unit,
      gramsPerUnit,
      unitLabel,
    });
  };

  // Libellé de traduction dynamique
  const renderTranslationText = () => {
    if (unit === 'piece') {
      const label = portionInfo?.pieceLabel || 'pièce';
      const plural = numericValue > 1 && !label.endsWith('s') && !label.endsWith('x') ? 's' : '';
      return `${inputValue} ${label}${plural} · ${Math.round(totalGrams)} g`;
    }
    if (unit === 'serving') {
      const plural = numericValue > 1 ? 's' : '';
      return `${inputValue} portion${plural} · ${Math.round(totalGrams)} g`;
    }
    return `${Math.round(totalGrams)} g`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContent, { backgroundColor: theme.colors.background }]}>
          {/* Poignée tactile */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* En-tête : Détail de l'aliment */}
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

          {/* ZONE DE SAISIE */}
          <View style={styles.inputZone}>
            <TextInput
              style={[styles.numberInput, { color: theme.colors.text, borderBottomColor: theme.colors.accent }]}
              keyboardType="numeric"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              selectTextOnFocus
              maxLength={6}
            />

            {/* Ligne de traduction claire */}
            <Text style={[styles.translationText, { color: theme.colors.textSecondary }]}>
              {renderTranslationText()}
            </Text>

            {/* Sélecteur d'unités conditionnel */}
            <View style={styles.unitToggle}>
              {/* Bouton g strict (retrait de g/ml ambigu) */}
              <TouchableOpacity 
                style={[styles.unitBtn, unit === 'g' && { backgroundColor: theme.colors.accent }]}
                onPress={() => handleSwitchUnit('g')}
              >
                <Text style={[styles.unitText, { color: unit === 'g' ? '#FFF' : theme.colors.text }]}>g</Text>
              </TouchableOpacity>

              {/* Bouton 1 Pièce : UNIQUEMENT si pièce naturelle connue */}
              {portionInfo?.hasPiece && (
                <TouchableOpacity 
                  style={[styles.unitBtn, unit === 'piece' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => handleSwitchUnit('piece')}
                >
                  <Text style={[styles.unitText, { color: unit === 'piece' ? '#FFF' : theme.colors.text }]}>
                    Pièce ({portionInfo.pieceWeight}g)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Bouton Portion : UNIQUEMENT si portion industrielle connue */}
              {portionInfo?.hasServing && (
                <TouchableOpacity 
                  style={[styles.unitBtn, unit === 'serving' && { backgroundColor: theme.colors.accent }]}
                  onPress={() => handleSwitchUnit('serving')}
                >
                  <Text style={[styles.unitText, { color: unit === 'serving' ? '#FFF' : theme.colors.text }]}>
                    Portion ({portionInfo.servingWeight}g)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MACROS EN DIRECT */}
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

          {/* BOUTON D'ACTION */}
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
    ...StyleSheet.absoluteFillObject,
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  numberInput: {
    fontSize: 54,
    fontWeight: '900',
    textAlign: 'center',
    borderBottomWidth: 3,
    minWidth: 140,
    paddingBottom: 4,
    marginBottom: 8,
  },
  translationText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  unitBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  unitText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  macrosPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
