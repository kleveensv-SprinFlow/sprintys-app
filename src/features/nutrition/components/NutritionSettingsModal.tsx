import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { MealDistribution } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const OBJECTIVES = [
  { id: 'Perte de poids', label: 'Perte de poids', icon: 'trending-down' as const },
  { id: 'Prendre du poids', label: 'Prendre du poids', icon: 'trending-up' as const },
  { id: 'Se muscler', label: 'Se muscler', icon: 'activity' as const },
  { id: 'Stabiliser', label: 'Stabiliser', icon: 'shield' as const },
];

const ACTIVITY_LEVELS = [
  { id: 'faible', label: 'Faible', desc: 'Sédentaire / Peu d’exercice' },
  { id: 'moyen', label: 'Moyen', desc: '1 à 3 séances / sem' },
  { id: 'élevé', label: 'Élevé', desc: '4 à 5 séances / sem' },
  { id: 'très élevé', label: 'Très élevé', desc: 'Quotidien / Haute intensité' },
];

const MEALS: Array<{
  key: keyof MealDistribution;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}> = [
  { key: 'petit_dejeuner', label: 'Petit-déjeuner', icon: 'sun', color: '#F59E0B' },
  { key: 'dejeuner', label: 'Déjeuner', icon: 'coffee', color: '#10B981' },
  { key: 'diner', label: 'Dîner', icon: 'moon', color: '#6366F1' },
  { key: 'collation', label: 'Collation', icon: 'zap', color: '#EC4899' },
];

const DEFAULT_DISTRIBUTION: MealDistribution = {
  petit_dejeuner: 25,
  dejeuner: 35,
  diner: 30,
  collation: 10,
};

export const NutritionSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, reloadProfile } = useAuthStore();
  const updateProfile = useNutritionStore((state) => state.updateNutritionProfile);

  // Active Tab: 0 = Objectifs & Calories, 1 = Répartition des repas
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  // Form State
  const [objective, setObjective] = useState(user?.objective || 'Perte de poids');
  const [startWeight, setStartWeight] = useState(user?.startWeight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState(user?.activityLevel || 'moyen');
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyWeightGoal?.toString() || '0.5');
  const [kcalGoal, setKcalGoal] = useState(user?.manualKcalGoal?.toString() || '2000');
  const [distribution, setDistribution] = useState<MealDistribution>(
    user?.mealDistribution || DEFAULT_DISTRIBUTION
  );

  const [isSaving, setIsSaving] = useState(false);
  const [recalcNotice, setRecalcNotice] = useState<string | null>(null);

  // Sync state whenever modal opens or user profile changes
  useEffect(() => {
    if (visible && user) {
      setObjective(user.objective || 'Perte de poids');
      setStartWeight(user.startWeight ? user.startWeight.toString() : '');
      setTargetWeight(user.targetWeight ? user.targetWeight.toString() : '');
      setActivityLevel(user.activityLevel || 'moyen');
      setWeeklyGoal(
        user.weeklyWeightGoal !== undefined && user.weeklyWeightGoal !== null
          ? user.weeklyWeightGoal.toString()
          : '0.5'
      );
      setKcalGoal(user.manualKcalGoal ? user.manualKcalGoal.toString() : '2000');
      if (user.mealDistribution) {
        setDistribution(user.mealDistribution);
      }
    }
  }, [visible, user]);

  const totalDist =
    (distribution.petit_dejeuner || 0) +
    (distribution.dejeuner || 0) +
    (distribution.diner || 0) +
    (distribution.collation || 0);

  const parsedWeekly = parseFloat(weeklyGoal);
  const isWeeklyValid = !isNaN(parsedWeekly) && Math.abs(parsedWeekly) <= 1;
  const isKcalValid = !isNaN(parseInt(kcalGoal, 10)) && parseInt(kcalGoal, 10) >= 800;
  const isFormValid = totalDist === 100 && isWeeklyValid && isKcalValid;

  const handleRecalculateKcal = () => {
    // Mifflin-St Jeor equation
    const weight = user?.weight || parseFloat(startWeight) || 70;
    const height = user?.height || 170;
    const age = 25; // Base athlète par défaut si non renseigné
    const isMale = user?.gender !== 'femme';

    const bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);

    let activityMultiplier = 1.2;
    if (activityLevel === 'faible') activityMultiplier = 1.375;
    if (activityLevel === 'moyen') activityMultiplier = 1.55;
    if (activityLevel === 'élevé') activityMultiplier = 1.725;
    if (activityLevel === 'très élevé') activityMultiplier = 1.9;

    let tdee = bmr * activityMultiplier;

    // Ajustement selon rythme hebdomadaire (1kg ~ 7700 kcal / 7 jours = 1100 kcal/jour)
    const weeklyKg = Math.abs(parseFloat(weeklyGoal)) || 0;
    const dailyAdjustment = weeklyKg * 1100;

    const lowerObj = objective.toLowerCase();
    if (lowerObj.includes('perte')) {
      tdee -= dailyAdjustment;
    } else if (lowerObj.includes('prend') || lowerObj.includes('muscle')) {
      tdee += dailyAdjustment;
    }

    const calculatedKcal = Math.round(Math.max(1200, tdee));
    setKcalGoal(calculatedKcal.toString());
    setRecalcNotice(`Calculé : ${calculatedKcal} kcal / jour`);
    setTimeout(() => setRecalcNotice(null), 3000);
  };

  const handleStepMeal = (mealKey: keyof MealDistribution, delta: number) => {
    setDistribution((prev) => {
      const currentVal = prev[mealKey] || 0;
      const nextVal = Math.max(0, Math.min(100, currentVal + delta));
      return { ...prev, [mealKey]: nextVal };
    });
  };

  const handleSetMealText = (mealKey: keyof MealDistribution, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : Math.min(100, parseInt(cleaned, 10));
    setDistribution((prev) => ({ ...prev, [mealKey]: num }));
  };

  const handleResetDistribution = () => {
    setDistribution(DEFAULT_DISTRIBUTION);
  };

  const handleSave = async () => {
    if (totalDist !== 100) {
      Alert.alert(
        'Répartition incomplète',
        `Le total des repas doit être exactement de 100% (actuel : ${totalDist}%).`
      );
      return;
    }

    if (!isWeeklyValid) {
      Alert.alert(
        'Rythme invalide',
        'Le rythme hebdomadaire maximal conseillé est de 1.0 kg/semaine.'
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        activity_level: activityLevel,
        start_weight: parseFloat(startWeight) || undefined,
        target_weight: parseFloat(targetWeight) || undefined,
        weekly_weight_goal: parsedWeekly,
        manual_kcal_goal: parseInt(kcalGoal, 10),
        meal_distribution: distribution,
      });

      await reloadProfile();
      Alert.alert('Succès 🎉', 'Votre profil nutritionnel a été mis à jour.');
      onClose();
    } catch (err: any) {
      console.error('Error saving nutrition settings:', err);
      Alert.alert('Erreur', 'Impossible d’enregistrer le profil nutritionnel.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header standard avec bouton [X] à gauche et titre centré */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              paddingTop: Math.max(insets.top, 12) + 8,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Profil Nutritionnel
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Segmented Control à 2 onglets */}
        <View style={styles.tabContainer}>
          <View style={[styles.segmentedControl, { backgroundColor: theme.colors.surfaceLight }]}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeTab === 0 && [styles.activeSegmentTab, { backgroundColor: theme.colors.surface }],
              ]}
              onPress={() => setActiveTab(0)}
              activeOpacity={0.7}
            >
              <Feather
                name="target"
                size={16}
                color={activeTab === 0 ? theme.colors.accent : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  { color: activeTab === 0 ? theme.colors.text : theme.colors.textSecondary },
                  activeTab === 0 && styles.segmentTabTextActive,
                ]}
              >
                Objectifs & Calories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeTab === 1 && [styles.activeSegmentTab, { backgroundColor: theme.colors.surface }],
              ]}
              onPress={() => setActiveTab(1)}
              activeOpacity={0.7}
            >
              <Feather
                name="pie-chart"
                size={16}
                color={activeTab === 1 ? theme.colors.accent : theme.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  { color: activeTab === 1 ? theme.colors.text : theme.colors.textSecondary },
                  activeTab === 1 && styles.segmentTabTextActive,
                ]}
              >
                Répartition repas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu avec ScrollView */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 0 ? (
            /* ======================================================== */
            /* ONGLET 1 : OBJECTIFS & CALORIES                           */
            /* ======================================================== */
            <>
              {/* Carte 1 : Objectif Principal */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <Feather name="flag" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Objectif principal
                  </Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  Sélectionnez la trajectoire de votre alimentation
                </Text>

                <View style={styles.pillsGrid}>
                  {OBJECTIVES.map((obj) => {
                    const isSelected =
                      objective === obj.id ||
                      (obj.id === 'Perte de poids' && objective.toLowerCase().includes('perte')) ||
                      (obj.id === 'Prendre du poids' && objective.toLowerCase().includes('prend')) ||
                      (obj.id === 'Se muscler' && objective.toLowerCase().includes('muscle')) ||
                      (obj.id === 'Stabiliser' && objective.toLowerCase().includes('stabilis'));

                    return (
                      <TouchableOpacity
                        key={obj.id}
                        style={[
                          styles.pillButton,
                          {
                            backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceLight,
                            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => setObjective(obj.id)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={obj.icon}
                          size={15}
                          color={isSelected ? '#FFF' : theme.colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.pillText,
                            { color: isSelected ? '#FFF' : theme.colors.text },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Carte 2 : Mensurations & Activité */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <Feather name="activity" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Mensurations & Niveau d'activité
                  </Text>
                </View>

                {/* Poids départ */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                      Poids de départ
                    </Text>
                    <Text style={[styles.inputSublabel, { color: theme.colors.textSecondary }]}>
                      Référence initiale
                    </Text>
                  </View>
                  <View style={[styles.inputBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight }]}>
                    <TextInput
                      style={[styles.inputField, { color: theme.colors.text }]}
                      keyboardType="numeric"
                      placeholder="70"
                      placeholderTextColor={theme.colors.textMuted}
                      value={startWeight}
                      onChangeText={setStartWeight}
                    />
                    <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>kg</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Poids cible */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                      Poids cible
                    </Text>
                    <Text style={[styles.inputSublabel, { color: theme.colors.textSecondary }]}>
                      Votre objectif final
                    </Text>
                  </View>
                  <View style={[styles.inputBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight }]}>
                    <TextInput
                      style={[styles.inputField, { color: theme.colors.text }]}
                      keyboardType="numeric"
                      placeholder="65"
                      placeholderTextColor={theme.colors.textMuted}
                      value={targetWeight}
                      onChangeText={setTargetWeight}
                    />
                    <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>kg</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Niveau d'activité */}
                <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>
                  Niveau d'activité physique
                </Text>
                <View style={styles.activityGrid}>
                  {ACTIVITY_LEVELS.map((lvl) => {
                    const isSelected = activityLevel === lvl.id;
                    return (
                      <TouchableOpacity
                        key={lvl.id}
                        style={[
                          styles.activityCard,
                          {
                            backgroundColor: isSelected ? theme.colors.accent + '15' : theme.colors.surfaceLight,
                            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => setActivityLevel(lvl.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.activityCardHeader}>
                          <Text
                            style={[
                              styles.activityTitle,
                              { color: isSelected ? theme.colors.accent : theme.colors.text },
                            ]}
                          >
                            {lvl.label}
                          </Text>
                          {isSelected && (
                            <Feather name="check-circle" size={16} color={theme.colors.accent} />
                          )}
                        </View>
                        <Text style={[styles.activityDesc, { color: theme.colors.textSecondary }]}>
                          {lvl.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Carte 3 : Objectifs Caloriques & Recalcul */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <Feather name="zap" size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Cible Calorique
                  </Text>
                </View>

                {/* Rythme hebdo */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                      Rythme hebdomadaire
                    </Text>
                    <Text style={[styles.inputSublabel, { color: theme.colors.textSecondary }]}>
                      Max conseillé : 1.0 kg/semaine
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.inputBadge,
                      {
                        borderColor: !isWeeklyValid ? '#EF4444' : theme.colors.border,
                        backgroundColor: theme.colors.surfaceLight,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.inputField, { color: theme.colors.text }]}
                      keyboardType="numeric"
                      placeholder="0.5"
                      placeholderTextColor={theme.colors.textMuted}
                      value={weeklyGoal}
                      onChangeText={setWeeklyGoal}
                    />
                    <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>kg/sem</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Cible Calorique */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                      Objectif journalier
                    </Text>
                    <Text style={[styles.inputSublabel, { color: theme.colors.textSecondary }]}>
                      Calories quotidiennes cibles
                    </Text>
                  </View>
                  <View style={[styles.inputBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight }]}>
                    <TextInput
                      style={[styles.inputField, { color: theme.colors.text, fontWeight: '700' }]}
                      keyboardType="numeric"
                      placeholder="2000"
                      placeholderTextColor={theme.colors.textMuted}
                      value={kcalGoal}
                      onChangeText={setKcalGoal}
                    />
                    <Text style={[styles.inputUnit, { color: theme.colors.textSecondary }]}>kcal</Text>
                  </View>
                </View>

                {/* Notification de recalcul */}
                {recalcNotice && (
                  <View style={[styles.noticeBanner, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Feather name="check" size={16} color={theme.colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.noticeText, { color: theme.colors.accent }]}>
                      {recalcNotice}
                    </Text>
                  </View>
                )}

                {/* Bouton de Recalcul automatique */}
                <TouchableOpacity
                  style={[
                    styles.recalcButton,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.accent + '10',
                    },
                  ]}
                  onPress={handleRecalculateKcal}
                  activeOpacity={0.7}
                >
                  <Feather name="cpu" size={16} color={theme.colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.recalcButtonText, { color: theme.colors.accent }]}>
                    Recalculer automatiquement avec Sprinty
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sprinty Nutrition Tip Card */}
              <View style={[styles.sprintyTipCard, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
                <View style={styles.sprintyTipIcon}>
                  <Feather name="smile" size={22} color={theme.colors.accent} />
                </View>
                <View style={styles.sprintyTipContent}>
                  <Text style={[styles.sprintyTipTitle, { color: theme.colors.accent }]}>
                    Sprinty Nutrition
                  </Text>
                  <Text style={[styles.sprintyTipDesc, { color: theme.colors.text }]}>
                    Votre plan adapte vos apports selon vos entraînements pour maximiser votre récupération et votre énergie.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* ======================================================== */
            /* ONGLET 2 : RÉPARTITION DES REPAS                         */
            /* ======================================================== */
            <>
              {/* Carte Jauge / Total 100% */}
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.distGaugeHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                      Équilibre des repas
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                      Ajustez la part énergétique de chaque repas
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.totalBadge,
                      {
                        backgroundColor:
                          totalDist === 100 ? '#10B98120' : '#EF444420',
                        borderColor:
                          totalDist === 100 ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.totalBadgeText,
                        { color: totalDist === 100 ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      Total : {totalDist}%
                    </Text>
                  </View>
                </View>

                {/* Barre multi-segments */}
                <View style={styles.progressBarWrapper}>
                  <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.surfaceLight }]}>
                    {MEALS.map((m) => {
                      const val = distribution[m.key] || 0;
                      if (val <= 0) return null;
                      return (
                        <View
                          key={m.key}
                          style={[
                            styles.progressSegment,
                            {
                              width: `${Math.min(100, val)}%`,
                              backgroundColor: m.color,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Légende */}
                <View style={styles.legendContainer}>
                  {MEALS.map((m) => (
                    <View key={m.key} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                      <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>
                        {m.label.split('-')[0]} : {distribution[m.key]}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Bouton Preset Équilibré */}
                <TouchableOpacity
                  style={[styles.presetButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceLight }]}
                  onPress={handleResetDistribution}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={14} color={theme.colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.presetButtonText, { color: theme.colors.text }]}>
                    Rétablir la répartition recommandée (25% / 35% / 30% / 10%)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cartes individuelles des 4 repas */}
              {MEALS.map((meal) => {
                const pct = distribution[meal.key] || 0;
                const totalKcal = parseInt(kcalGoal, 10) || 2000;
                const mealKcal = Math.round((totalKcal * pct) / 100);

                return (
                  <View
                    key={meal.key}
                    style={[styles.mealCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <View style={styles.mealLeftCol}>
                      <View style={[styles.mealIconCircle, { backgroundColor: meal.color + '20' }]}>
                        <Feather name={meal.icon} size={18} color={meal.color} />
                      </View>
                      <View style={styles.mealTitleBox}>
                        <Text style={[styles.mealTitle, { color: theme.colors.text }]}>
                          {meal.label}
                        </Text>
                        <Text style={[styles.mealKcal, { color: theme.colors.textSecondary }]}>
                          {mealKcal} kcal prévues
                        </Text>
                      </View>
                    </View>

                    {/* Stepper controls */}
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
                        onPress={() => handleStepMeal(meal.key, -5)}
                        activeOpacity={0.6}
                      >
                        <Feather name="minus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>

                      <View style={[styles.stepInputBox, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}>
                        <TextInput
                          style={[styles.stepInputText, { color: theme.colors.text }]}
                          keyboardType="numeric"
                          value={pct.toString()}
                          onChangeText={(t) => handleSetMealText(meal.key, t)}
                        />
                        <Text style={[styles.stepPercentText, { color: theme.colors.textSecondary }]}>%</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border }]}
                        onPress={() => handleStepMeal(meal.key, 5)}
                        activeOpacity={0.6}
                      >
                        <Feather name="plus" size={16} color={theme.colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Bouton Flottant en bas avec Safe Area */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {totalDist !== 100 && (
            <View style={styles.warningBanner}>
              <Feather name="alert-circle" size={15} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.warningBannerText}>
                La somme des repas doit faire 100% (actuellement {totalDist}%)
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: isFormValid ? theme.colors.accent : theme.colors.textMuted,
                opacity: isFormValid ? 1 : 0.6,
              },
            ]}
            onPress={handleSave}
            disabled={!isFormValid || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  activeSegmentTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTabTextActive: {
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },

  // Pills Grid (Objectifs)
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  inputLabelContainer: {
    flex: 1,
    paddingRight: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  inputBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    minWidth: 110,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    paddingVertical: 4,
  },
  inputUnit: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.6,
  },

  // Activity Grid
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
  },
  activityGrid: {
    gap: 8,
  },
  activityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 3,
  },

  // Notice & Recalculate
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  recalcButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Sprinty Tip
  sprintyTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  sprintyTipIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sprintyTipContent: {
    flex: 1,
  },
  sprintyTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sprintyTipDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Repartition Tab
  distGaugeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarWrapper: {
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Meal Card
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  mealLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealTitleBox: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealKcal: {
    fontSize: 12,
    marginTop: 2,
  },

  // Stepper Controls
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 58,
    height: 34,
    paddingHorizontal: 4,
  },
  stepInputText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 26,
    paddingVertical: 0,
  },
  stepPercentText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Bottom Floating Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
