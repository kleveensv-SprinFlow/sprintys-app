import { goBack } from '../../../src/core/navigation';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Animated } from 'react-native';
import { TouchableOpacity } from '../../../src/shared/components/Tappable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../src/core/theme';
import { useNutritionStore, getLocalDateString } from '../../../src/store/nutrition/nutritionStore';
import { MealType, MealLog } from '../../../src/features/nutrition/types';
import { useAuthStore } from '../../../src/store/authStore';
import { FoodSearchModal } from '../../../src/features/nutrition/components/FoodSearchModal';
import { supabase } from '../../../src/services/supabase';
import { GlowBackground } from '../../../src/shared/components/GlowBackground';
import { glassCard, glassSurface } from '../../../src/core/glass';
import { GlassTabBarBackground } from '../../../src/shared/components/GlassTabBarBackground';
import { GlassSheen } from '../../../src/shared/components/GlassSheen';
import { MealIcon } from '../../../src/features/nutrition/components/MealIcon';
import { MacroLanes } from '../../../src/features/nutrition/components/MacroLanes';
import { MEALS, mealLabel, MEAL_ACCENT, MEAL_ACCENT_TINT } from '../../../src/features/nutrition/nutritionTheme';
import { EmptyState } from '../../../src/shared/components/EmptyState';
import { Header } from '../../../src/shared/components/Header';
import { PressableScale } from '../../../src/shared/components/PressableScale';
import { useFrostedHeader } from '../../../src/shared/hooks/useFrostedHeader';

import { FeedbackHost } from '../../../src/shared/feedback/FeedbackHost';
import { appAlert } from '../../../src/shared/feedback/appAlert';

export default function MealDetailScreen() {
  const params = useLocalSearchParams<{ type: MealType; athleteId?: string; readonly?: string }>();
  const type = params.type;
  const athleteId = params.athleteId;
  const readonly = params.readonly === 'true';

  const router = useRouter();
  const { scrollY, scrollProps } = useFrostedHeader();
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const { 
    mealLogs, openSearchModal, deleteMealLog, updateMealLog,
    currentDate, copyMealFromDate, saveCurrentMealAsTemplate 
  } = useNutritionStore();

  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editUnit, setEditUnit] = useState<'g' | 'ml' | 'piece' | 'serving'>('g');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState('');
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [yesterdayKcal, setYesterdayKcal] = useState(0);

  useEffect(() => {
    if (athleteId) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', athleteId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setAthleteProfile(data);
        });
    } else {
      setAthleteProfile(null);
    }
  }, [athleteId]);

  const yesterdayDate = React.useMemo(() => {
    if (!currentDate) return '';
    const [y, m, d] = currentDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    return getLocalDateString(prev);
  }, [currentDate]);

  useEffect(() => {
    const targetUserId = athleteId || user?.id;
    if (!targetUserId || !yesterdayDate || !type) return;
    supabase
      .from('meal_logs')
      .select('calories')
      .eq('user_id', targetUserId)
      .eq('consumed_at', yesterdayDate)
      .eq('meal_type', type)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setYesterdayCount(data.length);
          setYesterdayKcal(Math.round(data.reduce((sum, item) => sum + Number(item.calories || 0), 0)));
        } else {
          setYesterdayCount(0);
          setYesterdayKcal(0);
        }
      });
  }, [currentDate, yesterdayDate, athleteId, user?.id, type]);

  const handleSaveMealTemplate = async () => {
    if (!savedTemplateName.trim()) return;
    const ok = await saveCurrentMealAsTemplate(savedTemplateName.trim(), type, athleteId);
    if (ok) {
      setShowSaveModal(false);
      setSavedTemplateName('');
      appAlert('Repas enregistré', 'Tu le retrouveras dans « Mes repas » au moment d\'ajouter un aliment.');
    }
  };

  if (!type || !MEALS.some((m) => m.type === type)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.backdrop }]}>
        <GlowBackground />
        <Header title="Repas" showBackButton onBackPress={() => goBack(router, '/(athlete)/nutrition')} />
        <EmptyState
          icon="coffee"
          title="Repas introuvable"
          message="Ce lien ne correspond à aucun repas."
          actionLabel="Retour à la nutrition"
          onAction={() => router.replace('/(athlete)/nutrition')}
          style={{ marginTop: 80 }}
        />
      </View>
    );
  }

  const logs = mealLogs.filter(log => log.meal_type === type);
  const label = mealLabel(type);

  // Calculs macros pour ce repas
  const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = logs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = logs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = logs.reduce((sum, log) => sum + Number(log.lipides), 0);

  const activeProfile = athleteProfile || user;
  const mealDistribution = activeProfile?.mealDistribution || activeProfile?.meal_distribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = activeProfile?.manualKcalGoal || activeProfile?.manual_kcal_goal || 2000;
  const targetKcal = Math.round((kcalGoal * mealDistribution[type]) / 100);

  // Objectifs macros proportionnels au repas
  const targetPro = Math.round((targetKcal * 0.3) / 4);
  const targetGlu = Math.round((targetKcal * 0.4) / 4);
  const targetLip = Math.round((targetKcal * 0.3) / 9);

  const handleDeleteFood = (log: MealLog) => {
    if (readonly) return;
    appAlert(
      'Supprimer l\'aliment',
      `« ${log.custom_food_name || 'Cet aliment'} » sera retiré de ce repas.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteMealLog(log.id)
        }
      ]
    );
  };

  const handleOpenEdit = (log: MealLog) => {
    if (readonly) return;
    setEditingLog(log);
    const unit = log.input_unit || 'g';
    setEditUnit(unit);
    setEditQty(String(log.input_qty ?? Math.round(log.quantity_g) ?? 100));
  };

  const handleSaveEdit = async () => {
    if (!editingLog || readonly) return;
    const numericQty = parseFloat(editQty.replace(',', '.')) || 0;
    if (numericQty <= 0) return;

    const gramsPerUnit = editingLog.grams_per_unit || (editingLog.quantity_g / (editingLog.input_qty || 1)) || 1;
    let newTotalGrams = numericQty;
    if (editUnit === 'piece' || editUnit === 'serving' || editUnit === 'ml') {
      newTotalGrams = numericQty * gramsPerUnit;
    }

    const oldGrams = editingLog.quantity_g || 100;
    const ratio = newTotalGrams / oldGrams;

    await updateMealLog(editingLog.id, {
      quantity_g: Math.round(newTotalGrams),
      calories: Math.round(editingLog.calories * ratio),
      proteines: Math.round(editingLog.proteines * ratio * 10) / 10,
      glucides: Math.round(editingLog.glucides * ratio * 10) / 10,
      lipides: Math.round(editingLog.lipides * ratio * 10) / 10,
      input_qty: numericQty,
      input_unit: editUnit,
      grams_per_unit: gramsPerUnit,
      unit_label: editingLog.unit_label || (editUnit === 'piece' ? 'pièce' : editUnit === 'serving' ? 'portion' : editUnit === 'ml' ? 'ml' : 'g'),
    });

    setEditingLog(null);
  };

  return (
    // Top inset handled by <Header />
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.backdrop }]} edges={['bottom', 'left', 'right']}>
      <GlowBackground />
      <Header
        title={label}
        showBackButton
        onBackPress={() => goBack(router, '/(athlete)/nutrition')}
        scrollY={scrollY}
        rightComponent={
          !readonly && logs.length > 0 ? (
            <PressableScale onPress={() => setShowSaveModal(true)} haptic="selection" hitSlop={8} style={styles.saveHeaderBtn}>
              <Feather name="bookmark" size={14} color={MEAL_ACCENT} style={{ marginRight: 4 }} />
              <Text style={[styles.saveHeaderText, { color: MEAL_ACCENT }]}>Enregistrer</Text>
            </PressableScale>
          ) : undefined
        }
      />

      <Animated.ScrollView {...scrollProps} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Meal summary: icon, total vs target, macro lanes */}
        <View style={[glassCard, styles.summaryCard]}>
          <GlassSheen radius={22} />
          <View style={styles.summaryTop}>
            <MealIcon type={type} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKcal, { color: theme.colors.text }]}>
                {Math.round(consumedKcal).toLocaleString('fr-FR')}
                <Text style={[styles.summaryKcalUnit, { color: theme.colors.textSecondary }]}> kcal</Text>
              </Text>
              <Text style={[styles.summaryTarget, { color: theme.colors.textSecondary }]}>
                sur {targetKcal.toLocaleString('fr-FR')} kcal prévues pour ce repas
              </Text>
            </View>
          </View>
          <View style={[styles.summaryTrack, { backgroundColor: theme.colors.glassFill }]}>
            <View
              style={[
                styles.summaryFill,
                { width: `${Math.min(100, targetKcal > 0 ? (consumedKcal / targetKcal) * 100 : 0)}%` },
              ]}
            />
          </View>
          <MacroLanes
            compact
            values={{ proteines: consumedPro, glucides: consumedGlu, lipides: consumedLip }}
            goals={{ proteines: targetPro, glucides: targetGlu, lipides: targetLip }}
          />
        </View>

        {/* LISTE DES ALIMENTS DU REPAS */}
        {logs.length > 0 ? (
          <View style={[styles.foodCardContainer, glassSurface]}>
            <GlassSheen radius={20} />
            {logs.map((log, index) => {
              const displayName = log.custom_food_name || 'Aliment';
              const isLast = index === logs.length - 1;

              return (
                <TouchableOpacity
                  key={log.id} 
                  style={[
                    styles.foodRow, 
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.hairline }
                  ]}
                  onPress={() => handleOpenEdit(log)}
                  activeOpacity={readonly ? 1 : 0.7}
                  disabled={readonly}
                >
                  <View style={styles.foodInfo}>
                    <Text style={[styles.foodName, { color: theme.colors.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={[styles.foodPortion, { color: theme.colors.textSecondary }]}>
                      {log.input_unit === 'piece'
                        ? `${log.input_qty ?? 1} ${log.unit_label || 'pièce'}${Number(log.input_qty) > 1 && !log.unit_label?.endsWith('s') && !log.unit_label?.endsWith('x') ? 's' : ''} · ${Math.round(log.quantity_g)} g`
                        : log.input_unit === 'serving'
                        ? `${log.input_qty ?? 1} portion${Number(log.input_qty) > 1 ? 's' : ''} · ${Math.round(log.quantity_g)} g`
                        : log.input_unit === 'ml'
                        ? `${log.input_qty ?? Math.round(log.quantity_g)} ml · ${Math.round(log.quantity_g)} g`
                        : `${Math.round(log.quantity_g)} g`}
                    </Text>
                  </View>

                  <View style={styles.foodRightCol}>
                    <Text style={[styles.foodCalories, { color: theme.colors.text }]}>
                      {Math.round(log.calories)} kcal
                    </Text>
                    {!readonly && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteFood(log);
                        }}
                        style={styles.trashBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="trash-2" size={15} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyMealCard, glassSurface]}>
            <GlassSheen radius={20} />
            <Text style={[styles.emptyMealTitle, { color: theme.colors.text }]}>
              Aucun aliment dans ce repas
            </Text>
            <Text style={[styles.emptyMealSubtitle, { color: theme.colors.textSecondary }]}>
              Ajoute tes aliments ou reprends ton repas de la veille.
            </Text>

            {yesterdayCount > 0 && !readonly && (
              <TouchableOpacity
                style={[styles.repeatYesterdayBigBtn, { backgroundColor: MEAL_ACCENT_TINT, borderColor: 'transparent' }]}
                onPress={async () => {
                  await copyMealFromDate(yesterdayDate, type, athleteId);
                }}
                activeOpacity={0.8}
              >
                <Feather name="rotate-ccw" size={16} color={MEAL_ACCENT} style={{ marginRight: 8 }} />
                <Text style={[styles.repeatYesterdayBigText, { color: MEAL_ACCENT }]}>
                  Reprendre le {label.toLowerCase()} d'hier · {yesterdayKcal} kcal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </Animated.ScrollView>

      {/* Frosted bottom bar with the main action (hidden in the coach's read-only view) */}
      {!readonly && (
        <View style={styles.bottomBar}>
          <GlassTabBarBackground />
          <TouchableOpacity 
            style={styles.pillAddBtn}
            onPress={() => openSearchModal(type)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={styles.pillAddBtnText}>Ajouter un aliment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL D'ÉDITION DE PORTION */}
      <Modal visible={!!editingLog} transparent animationType="fade" onRequestClose={() => setEditingLog(null)}>
        <FeedbackHost />
        <TouchableWithoutFeedback onPress={() => setEditingLog(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.editModalContent, { backgroundColor: theme.colors.surface }]}
              >
                <Text style={[styles.editModalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  Modifier la portion
                </Text>
                <Text style={[styles.editModalFoodName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {editingLog?.custom_food_name || 'Aliment'}
                </Text>

                <View style={styles.editInputRow}>
                  <TextInput
                    style={[styles.editTextInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    keyboardType="numeric"
                    value={editQty}
                    onChangeText={setEditQty}
                    autoFocus
                    selectTextOnFocus
                  />
                  <Text style={[styles.editUnitLabel, { color: theme.colors.textSecondary }]}>
                    {editUnit === 'piece'
                      ? (editingLog?.unit_label || 'pièce(s)')
                      : editUnit === 'serving'
                      ? 'portion(s)'
                      : editUnit === 'ml'
                      ? 'ml'
                      : 'g'}
                  </Text>
                </View>

                {editUnit !== 'g' && editingLog && (
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 }}>
                    ≈ {Math.round((parseFloat(editQty.replace(',', '.')) || 0) * (editingLog.grams_per_unit || (editingLog.quantity_g / (editingLog.input_qty || 1)) || 1))} g au total
                  </Text>
                )}

                <View style={styles.editModalActions}>
                  <TouchableOpacity 
                    style={[styles.editActionBtn, { backgroundColor: theme.colors.surfaceLight }]}
                    onPress={() => setEditingLog(null)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editActionBtn, { backgroundColor: theme.colors.sprintyBlue }]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DE SAUVEGARDE DE REPAS TYPE */}
      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <FeedbackHost />
        <TouchableWithoutFeedback onPress={() => setShowSaveModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.editModalContent, { backgroundColor: theme.colors.surface }]}
              >
                <Text style={[styles.editModalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  Enregistrer ce repas
                </Text>
                <Text style={[styles.saveModalSubtitle, { color: theme.colors.textSecondary }]}>
                  Donnez un nom à ce repas pour l'ajouter en 1 clic plus tard.
                </Text>

                <View style={styles.editInputRow}>
                  <TextInput
                    style={[
                      styles.editTextInput, 
                      { 
                        color: theme.colors.text, 
                        borderColor: theme.colors.border,
                        fontSize: 16,
                        textAlign: 'left',
                        paddingHorizontal: 16,
                        width: '100%',
                        fontWeight: '500'
                      }
                    ]}
                    placeholder="Ex: Mon déjeuner type"
                    placeholderTextColor={theme.colors.textMuted}
                    value={savedTemplateName}
                    onChangeText={setSavedTemplateName}
                    autoFocus
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.editCancelBtn, { borderColor: theme.colors.border }]}
                    onPress={() => setShowSaveModal(false)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editActionBtn, { backgroundColor: theme.colors.sprintyBlue, opacity: savedTemplateName.trim() ? 1 : 0.5 }]}
                    onPress={handleSaveMealTemplate}
                    disabled={!savedTemplateName.trim()}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DE RECHERCHE D'ALIMENT (si non readonly) */}
      {!readonly && <FoodSearchModal />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryKcal: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  summaryKcalUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryTarget: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  summaryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 16,
  },
  summaryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: MEAL_ACCENT,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  foodCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  foodInfo: {
    flex: 1,
    paddingRight: 12,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  foodPortion: {
    fontSize: 12,
    fontWeight: '500',
  },
  foodRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodCalories: {
    fontSize: 15,
    fontWeight: '700',
  },
  trashBtn: {
    padding: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  pillAddBtn: {
    backgroundColor: MEAL_ACCENT,
    borderRadius: 100,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: MEAL_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  pillAddBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editModalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  editModalFoodName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  editTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  editUnitLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: MEAL_ACCENT_TINT,
  },
  saveHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyMealCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyMealTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyMealSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  repeatYesterdayBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  repeatYesterdayBigText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveModalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
});
