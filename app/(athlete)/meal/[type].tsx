import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../src/core/theme';
import { useNutritionStore } from '../../../src/store/nutrition/nutritionStore';
import { MealType, MealLog } from '../../../src/features/nutrition/types';
import { useAuthStore } from '../../../src/store/authStore';
import { FoodSearchModal } from '../../../src/features/nutrition/components/FoodSearchModal';

const mealInfo = {
  petit_dejeuner: { label: 'Petit déjeuner', icon: 'coffee', color: '#00C9A7', bg: '#E8FBF7' },
  dejeuner: { label: 'Déjeuner', icon: 'sun', color: '#FFB703', bg: '#FFF8E6' },
  diner: { label: 'Dîner', icon: 'moon', color: '#0069E8', bg: '#EDF5FF' },
  collation: { label: 'Collation', icon: 'smile', color: '#FF5252', bg: '#FFF0F0' },
};

export default function MealDetailScreen() {
  const { type } = useLocalSearchParams<{ type: MealType }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  
  const { mealLogs, openSearchModal, deleteMealLog, updateMealLog } = useNutritionStore();

  // State pour la modification de quantité d'un aliment
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [editGrams, setEditGrams] = useState<string>('');

  if (!type || !mealInfo[type]) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Repas introuvable.</Text>
      </View>
    );
  }

  const logs = mealLogs.filter(log => log.meal_type === type);
  const info = mealInfo[type];

  // Calculs macros pour ce repas
  const consumedKcal = logs.reduce((sum, log) => sum + Number(log.calories), 0);
  const consumedPro = logs.reduce((sum, log) => sum + Number(log.proteines), 0);
  const consumedGlu = logs.reduce((sum, log) => sum + Number(log.glucides), 0);
  const consumedLip = logs.reduce((sum, log) => sum + Number(log.lipides), 0);

  const mealDistribution = user?.mealDistribution || {
    petit_dejeuner: 25, dejeuner: 35, diner: 30, collation: 10
  };
  const kcalGoal = user?.manualKcalGoal || 2000;
  const targetKcal = Math.round((kcalGoal * mealDistribution[type]) / 100);

  // Objectifs macros proportionnels au repas
  const targetPro = Math.round((targetKcal * 0.3) / 4);
  const targetGlu = Math.round((targetKcal * 0.4) / 4);
  const targetLip = Math.round((targetKcal * 0.3) / 9);

  const handleDeleteFood = (log: MealLog) => {
    Alert.alert(
      'Supprimer l\'aliment',
      `Voulez-vous retirer "${log.custom_food_name || 'cet aliment'}" de votre repas ?`,
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
    setEditingLog(log);
    setEditGrams(String(log.quantity_g || 100));
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    const newGrams = parseFloat(editGrams.replace(',', '.')) || 0;
    if (newGrams <= 0) return;

    const oldGrams = editingLog.quantity_g || 100;
    const ratio = newGrams / oldGrams;

    await updateMealLog(editingLog.id, {
      quantity_g: Math.round(newGrams),
      calories: Math.round(editingLog.calories * ratio),
      proteines: Math.round(editingLog.proteines * ratio * 10) / 10,
      glucides: Math.round(editingLog.glucides * ratio * 10) / 10,
      lipides: Math.round(editingLog.lipides * ratio * 10) / 10,
    });

    setEditingLog(null);
  };

  const renderProgressBar = (label: string, current: number, max: number, unit: string = 'g', color: string = '#00C9A7') => {
    const percent = Math.min(100, max > 0 ? (current / max) * 100 : 0);
    return (
      <View style={styles.nutrientRow} key={label}>
        <View style={styles.nutrientHeader}>
          <Text style={[styles.nutrientLabel, { color: theme.colors.text }]}>{label}</Text>
          <Text style={[styles.nutrientValue, { color: theme.colors.textSecondary }]}>
            {Math.round(current)} / {max} {unit}
          </Text>
        </View>
        <View style={[styles.nutrientTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.nutrientFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{info.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO CARD AVEC ILLUSTRATION DU REPAS */}
        <View style={[styles.heroBanner, { backgroundColor: info.bg }]}>
          <View style={[styles.heroIconCircle, { backgroundColor: '#FFF' }]}>
            <Feather name={info.icon as any} size={32} color={info.color} />
          </View>
        </View>

        {/* GRILLE 2x2 MACROS STYLE YAZIO */}
        <View style={[styles.gridCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>{Math.round(consumedKcal)} kcal</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Calories</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>{consumedGlu.toFixed(1)} g</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Glucides</Text>
            </View>
          </View>
          <View style={[styles.gridRow, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <View style={[styles.gridCell, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>{consumedPro.toFixed(1)} g</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Protéines</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>{consumedLip.toFixed(1)} g</Text>
              <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Lipides</Text>
            </View>
          </View>
        </View>

        {/* LISTE DES ALIMENTS DU REPAS (STYLE YAZIO AVEC ÉDITION ET SUPPRESSION) */}
        {logs.length > 0 && (
          <View style={[styles.foodCardContainer, { backgroundColor: theme.colors.surface }]}>
            {logs.map((log, index) => {
              const displayName = log.custom_food_name || 'Aliment';
              const isLast = index === logs.length - 1;

              return (
                <TouchableOpacity
                  key={log.id} 
                  style={[
                    styles.foodRow, 
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => handleOpenEdit(log)}
                  activeOpacity={0.7}
                >
                  <View style={styles.foodInfo}>
                    <Text style={[styles.foodName, { color: theme.colors.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={[styles.foodPortion, { color: theme.colors.textSecondary }]}>
                      {log.quantity_g} g
                    </Text>
                  </View>

                  <View style={styles.foodRightCol}>
                    <Text style={[styles.foodCalories, { color: theme.colors.text }]}>
                      {Math.round(log.calories)} kcal
                    </Text>
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
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* SECTION VALEURS NUTRITIVES AVEC BARRES DE PROGRESSION */}
        <View style={styles.nutritionSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Valeurs nutritives</Text>
        </View>

        <View style={[styles.nutritionCard, { backgroundColor: theme.colors.surface }]}>
          {renderProgressBar('Calories', consumedKcal, targetKcal, 'kcal', '#00C9A7')}
          {renderProgressBar('Glucides', consumedGlu, targetGlu, 'g', '#00C9A7')}
          {renderProgressBar('Protéines', consumedPro, targetPro, 'g', '#00C9A7')}
          {renderProgressBar('Lipides', consumedLip, targetLip, 'g', '#00C9A7')}
        </View>

      </ScrollView>

      {/* BOUTON NOIR PILL FIXÉ EN BAS */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity 
          style={styles.pillAddBtn}
          onPress={() => openSearchModal(type)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <Text style={styles.pillAddBtnText}>Ajouter plus</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL D'ÉDITION DE PORTION */}
      <Modal visible={!!editingLog} transparent animationType="fade">
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
                    value={editGrams}
                    onChangeText={setEditGrams}
                    autoFocus
                    selectTextOnFocus
                  />
                  <Text style={[styles.editUnitLabel, { color: theme.colors.textSecondary }]}>grammes</Text>
                </View>

                <View style={styles.editModalActions}>
                  <TouchableOpacity 
                    style={[styles.editActionBtn, { backgroundColor: theme.colors.surfaceLight }]}
                    onPress={() => setEditingLog(null)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editActionBtn, { backgroundColor: '#111827' }]}
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

      {/* MODAL DE RECHERCHE D'ALIMENT */}
      <FoodSearchModal />
    </SafeAreaView>
  );
}

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
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  heroBanner: {
    height: 110,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  gridCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
  nutritionSectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  nutritionCard: {
    padding: 18,
    borderRadius: 20,
    gap: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nutrientRow: {
    gap: 6,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  nutrientValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  nutrientTrack: {
    height: 7,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  pillAddBtn: {
    backgroundColor: '#111827',
    borderRadius: 100,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
  }
});
