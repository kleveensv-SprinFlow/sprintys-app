import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { TouchableOpacity } from '../../../shared/components/Tappable';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { PressableScale } from '../../../shared/components/PressableScale';
import { resolveFoodPortion, ResolvedPortion, InputUnit } from '../data/portionDictionary';
import { MacroLanes } from './MacroLanes';
import { MEAL_ACCENT, MEAL_ACCENT_TINT } from '../nutritionTheme';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';

export interface FoodAddPayload {
  totalGrams: number;
  calories: number;
  pro: number;
  glu: number;
  lip: number;
  inputQty: number;
  inputUnit: InputUnit;
  gramsPerUnit: number;
  unitLabel: string;
}

interface FoodDetailSheetProps {
  product: any | null; // CiqualFood | OFFProduct
  visible: boolean;
  onClose: () => void;
  onAdd: (data: FoodAddPayload, keepSearching?: boolean) => void;
}

export const FoodDetailSheet: React.FC<FoodDetailSheetProps> = ({ product, visible, onClose, onAdd }) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('100');
  const [unit, setUnit] = useState<InputUnit>('g');
  const [portionInfo, setPortionInfo] = useState<ResolvedPortion | null>(null);
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    if (visible && product) {
      const resolved = resolveFoodPortion(product);
      setPortionInfo(resolved);
      setUnit(resolved.defaultUnit);
      setInputValue(String(resolved.defaultQty));
      setUserEdited(Boolean(product.last_input_qty && product.last_input_unit));
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
  } else if (unit === 'ml') {
    gramsPerUnit = portionInfo?.mlDensity || 1;
    unitLabel = 'ml';
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

  const roundHalf = (value: number) => Math.round(value * 2) / 2;

  const handleSwitchUnit = (targetUnit: InputUnit) => {
    if (unit === targetUnit) return;

    let grams = numericValue;
    if (unit === 'piece') grams = numericValue * (portionInfo?.pieceWeight || 60);
    else if (unit === 'serving') grams = numericValue * (portionInfo?.servingWeight || 100);
    else if (unit === 'ml') grams = numericValue * (portionInfo?.mlDensity || 1);

    if (targetUnit === 'g') {
      setInputValue(String(Math.round(grams)));
    } else if (targetUnit === 'ml') {
      const density = portionInfo?.mlDensity || 1;
      const next = !userEdited && portionInfo?.liquidDefaultQty
        ? portionInfo.liquidDefaultQty
        : (roundHalf(grams / density) || 1);
      setInputValue(String(next));
    } else if (targetUnit === 'piece') {
      const pieceWeight = portionInfo?.pieceWeight || 60;
      setInputValue(String(!userEdited ? 1 : (roundHalf(grams / pieceWeight) || 1)));
    } else {
      const servingWeight = portionInfo?.servingWeight || 100;
      setInputValue(String(!userEdited ? 1 : (roundHalf(grams / servingWeight) || 1)));
    }

    setUnit(targetUnit);
    setUserEdited(true);
  };

  // Plain value, not a hook: this runs after the `!product` early return, and a
  // hook here changed the hook count when a food was opened (crash on tap).
  const quickPresets =
    unit === 'piece' ? ['1', '2', '3', '4']
    : unit === 'ml' ? ['100', '200', '250', '330']
    : unit === 'serving' ? ['1', '2', '3']
    : ['50', '100', '150', '200'];

  const handleAdd = (keepSearching: boolean = false) => {
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
    }, keepSearching);
  };

  const unitOptions: { key: InputUnit; label: string }[] = [
    ...(portionInfo?.hasPiece ? [{ key: 'piece' as InputUnit, label: portionInfo.pieceLabel || 'pièce' }] : []),
    { key: 'g' as InputUnit, label: 'g' },
    ...(portionInfo?.hasLiquid || unit === 'ml' ? [{ key: 'ml' as InputUnit, label: 'ml' }] : []),
    ...(portionInfo?.hasServing ? [{ key: 'serving' as InputUnit, label: 'Portion' }] : []),
  ];

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
    if (unit === 'ml') {
      return `${inputValue} ml · ${Math.round(totalGrams)} g`;
    }
    return `${Math.round(totalGrams)} g`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <FeedbackHost />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContent, { backgroundColor: theme.colors.surface }]}>
          {/* Poignée tactile */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* En-tête : Détail de l'aliment */}
          <View style={styles.productHeader}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: MEAL_ACCENT_TINT }]}>
                <Text style={styles.placeholderLetter}>
                  {((product.display_name || product.nom || product.name || '?').trim()[0] || '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={2}>
                {product.display_name || product.nom || product.name}
              </Text>
              <View style={styles.sourceRow}>
                <View style={[styles.sourceChip, { backgroundColor: product.nom ? MEAL_ACCENT_TINT : theme.colors.glassFill }]}>
                  <Text style={[styles.sourceChipText, { color: product.nom ? MEAL_ACCENT : theme.colors.textSecondary }]}>
                    {product.nom ? 'CIQUAL' : 'Open Food Facts'}
                  </Text>
                </View>
                <Text style={[styles.productBrand, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {product.nom ? product.etat || '' : product.brand || ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.glassFill }]} hitSlop={8}>
              <Feather name="x" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* ZONE DE SAISIE */}
          <View style={styles.inputZone}>
            <View style={styles.qtyRow}>
              {unit === 'piece' && (
                <TouchableOpacity
                  onPress={() => {
                    setUserEdited(true);
                    setInputValue(String(Math.max(1, numericValue - 1)));
                  }}
                  style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}
                >
                  <Feather name="minus" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              <TextInput
                style={[styles.numberInput, { color: theme.colors.text }]}
                keyboardType="numeric"
                value={inputValue}
                onChangeText={(value) => {
                  setUserEdited(true);
                  setInputValue(value);
                }}
                autoFocus
                selectTextOnFocus
                maxLength={6}
              />
              {unit === 'piece' && (
                <TouchableOpacity
                  onPress={() => {
                    setUserEdited(true);
                    setInputValue(String(numericValue + 1));
                  }}
                  style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}
                >
                  <Feather name="plus" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {/* Puces de portions rapides */}
            <View style={styles.presetsRow}>
              {quickPresets.map((preset) => {
                const isSelected = inputValue === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => {
                      setUserEdited(true);
                      setInputValue(preset);
                    }}
                    style={[
                      styles.presetChip,
                      { backgroundColor: isSelected ? MEAL_ACCENT : theme.colors.glassFill },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary }]}>
                      {unit === 'piece' ? `${preset} ${portionInfo?.pieceLabel || 'pce'}` : `${preset} ${unit}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ligne de traduction claire (inutile quand on saisit déjà en grammes) */}
            {unit !== 'g' && (
              <Text style={[styles.translationText, { color: theme.colors.textSecondary }]}>
                {renderTranslationText()}
              </Text>
            )}

            {/* Unit choice, only when there is a real choice */}
            {unitOptions.length > 1 && (
              <SegmentedControl style={styles.unitToggle} options={unitOptions} value={unit} onChange={handleSwitchUnit} />
            )}
          </View>

          {/* Live nutrition for the chosen quantity */}
          <View style={[styles.liveCard, { backgroundColor: theme.colors.glassFill }]}>
            <Text style={[styles.liveKcal, { color: theme.colors.text }]}>
              {currentMacros.calories}
              <Text style={[styles.liveKcalUnit, { color: theme.colors.textSecondary }]}> kcal</Text>
            </Text>
            <MacroLanes
              compact
              values={{ proteines: currentMacros.proteines, glucides: currentMacros.glucides, lipides: currentMacros.lipides }}
            />
          </View>

          {/* BOUTONS D'ACTION (CONTINUER OU VALIDER) */}
          <View style={styles.actionButtonGroup}>
            <PressableScale
              containerStyle={{ flex: 1.3 }}
              style={[styles.secondaryButton, { backgroundColor: MEAL_ACCENT_TINT }]}
              onPress={() => handleAdd(true)}
            >
              <Text style={[styles.secondaryButtonText, { color: MEAL_ACCENT }]} numberOfLines={1} adjustsFontSizeToFit>
                Ajouter et continuer
              </Text>
            </PressableScale>

            <PressableScale
              containerStyle={{ flex: 1 }}
              haptic="medium"
              style={[styles.submitButton, { backgroundColor: MEAL_ACCENT }]}
              onPress={() => handleAdd(false)}
            >
              <Text style={styles.submitText}>Ajouter</Text>
            </PressableScale>
          </View>
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
    borderRadius: 16,
    borderCurve: 'continuous',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: MEAL_ACCENT,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  productBrand: {
    flex: 1,
    fontSize: 13,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  sourceChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inputZone: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberInput: {
    fontSize: 54,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1.5,
    minWidth: 140,
    paddingVertical: 0,
    marginBottom: 10,
  },
  translationText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  unitToggle: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
  liveCard: {
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 20,
  },
  liveKcal: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  liveKcalUnit: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
