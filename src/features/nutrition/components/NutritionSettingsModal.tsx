import React, { useState, useEffect, useMemo } from 'react';
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
import { supabase } from '../../../services/supabase';
import { MealDistribution } from '../types';
import {
  NEAT_LEVELS,
  NeatLevel,
  MIN_SESSIONS,
  MAX_SESSIONS,
  ageFromDob,
  dobFromAge,
  parseActivity,
  encodeActivity,
  classifyObjective,
  computeCalorieTarget,
  clampSessions,
} from '../calorieTarget';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const OBJECTIVES = [
  { id: 'Perte de poids', label: 'Perte de gras', desc: 'Déficit plafonné' },
  { id: 'Prendre du poids', label: 'Prise de masse', desc: 'Surplus modéré' },
  { id: 'Se muscler', label: 'Recomposition', desc: 'Proche du maintien' },
  { id: 'Stabiliser', label: 'Maintien', desc: 'Dépense du jour' },
];

const PACES = ['0.25', '0.5', '0.75', '1'];

const MEALS: Array<{
  key: keyof MealDistribution;
  label: string;
  short: string;
  color: string;
}> = [
  { key: 'petit_dejeuner', label: 'Petit-déj', short: 'Matin', color: '#FFB703' },
  { key: 'dejeuner', label: 'Déjeuner', short: 'Midi', color: '#00C9A7' },
  { key: 'diner', label: 'Dîner', short: 'Soir', color: '#0069E8' },
  { key: 'collation', label: 'Collation', short: 'Extra', color: '#FF5252' },
];

const DEFAULT_DISTRIBUTION: MealDistribution = {
  petit_dejeuner: 25,
  dejeuner: 35,
  diner: 30,
  collation: 10,
};

const matchesObjective = (current: string, id: string) => {
  const value = (current || '').toLowerCase();
  if (current === id) return true;
  if (id === 'Perte de poids') return value.includes('perte') || value.includes('allég') || value.includes('alleg');
  if (id === 'Prendre du poids') return value.includes('prend');
  if (id === 'Se muscler') return value.includes('muscle') || value.includes('recomp');
  if (id === 'Stabiliser') return value.includes('stabil') || value.includes('tenir') || value.includes('maint');
  return false;
};

export const NutritionSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, reloadProfile, updateProfile: updateAuthProfile } = useAuthStore();
  const updateProfile = useNutritionStore((state) => state.updateNutritionProfile);

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [objective, setObjective] = useState(user?.objective || 'Stabiliser');
  const [startWeight, setStartWeight] = useState(user?.startWeight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() || '');
  const [neat, setNeat] = useState<NeatLevel>('marche');
  const [sessions, setSessions] = useState(4);
  const [age, setAge] = useState(25);
  const [ageTouched, setAgeTouched] = useState(false);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyWeightGoal?.toString() || '0.5');
  const [kcalGoal, setKcalGoal] = useState(user?.manualKcalGoal?.toString() || '2000');
  const [distribution, setDistribution] = useState<MealDistribution>(
    user?.mealDistribution || DEFAULT_DISTRIBUTION
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    const activity = parseActivity(user.activityLevel);
    setObjective(user.objective || 'Stabiliser');
    setStartWeight(user.startWeight ? user.startWeight.toString() : '');
    setTargetWeight(user.targetWeight ? user.targetWeight.toString() : '');
    setNeat(activity.neat);
    setSessions(activity.sessions);
    setAge(ageFromDob(user.dateOfBirth) ?? 25);
    setAgeTouched(false);
    setWeeklyGoal(
      user.weeklyWeightGoal !== undefined && user.weeklyWeightGoal !== null
        ? String(Math.abs(user.weeklyWeightGoal))
        : '0.5'
    );
    setKcalGoal(user.manualKcalGoal ? user.manualKcalGoal.toString() : '2000');
    if (user.mealDistribution) setDistribution(user.mealDistribution);

    let cancelled = false;
    supabase
      .from('body_metrics')
      .select('body_fat')
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const fat = data?.body_fat;
        setBodyFatPct(typeof fat === 'number' && fat > 0 ? fat : null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, user]);

  const totalDist =
    (distribution.petit_dejeuner || 0) +
    (distribution.dejeuner || 0) +
    (distribution.diner || 0) +
    (distribution.collation || 0);

  const goalKind = classifyObjective(objective);
  const showPace = goalKind === 'cut' || goalKind === 'bulk';
  const parsedWeekly = showPace ? parseFloat(weeklyGoal) : 0;
  const isWeeklyValid = !showPace || (!isNaN(parsedWeekly) && parsedWeekly > 0 && parsedWeekly <= 1);
  const isKcalValid = !isNaN(parseInt(kcalGoal, 10)) && parseInt(kcalGoal, 10) >= 800;
  const isFormValid = totalDist === 100 && isWeeklyValid && isKcalValid;
  const totalKcal = parseInt(kcalGoal, 10) || 0;

  const weightKg = parseFloat(startWeight.replace(',', '.')) || user?.weight || 0;

  const preview = useMemo(() => {
    if (!weightKg || weightKg < 30 || weightKg > 250) return null;
    return computeCalorieTarget({
      weightKg,
      heightCm: user?.height || null,
      age,
      sex: user?.gender,
      bodyFatPct,
      neat,
      sessionsPerWeek: sessions,
      goal: goalKind,
      weeklyKg: parsedWeekly,
    });
  }, [weightKg, user?.height, user?.gender, age, bodyFatPct, neat, sessions, goalKind, parsedWeekly]);

  const handleRecalculateKcal = () => {
    if (!preview) {
      Alert.alert('Poids', 'Indique ton poids actuel pour calculer.');
      return;
    }
    setKcalGoal(String(preview.target));
  };

  const nudgeAge = (delta: number) => {
    setAgeTouched(true);
    setAge((current) => Math.max(14, Math.min(80, current + delta)));
  };

  const nudgeSessions = (delta: number) => {
    setSessions((current) => clampSessions(current + delta));
  };

  const handleStepMeal = (mealKey: keyof MealDistribution, delta: number) => {
    setDistribution((prev) => ({
      ...prev,
      [mealKey]: Math.max(0, Math.min(100, (prev[mealKey] || 0) + delta)),
    }));
  };

  const handleSave = async () => {
    if (totalDist !== 100) {
      Alert.alert('Répartition', `Les quatre repas doivent faire 100 %. Là, c’est ${totalDist} %.`);
      return;
    }
    if (!isWeeklyValid) {
      Alert.alert('Rythme', 'Le rythme reste entre 0,25 et 1 kg par semaine.');
      return;
    }

    setIsSaving(true);
    try {
      const profilePatch: { objective: string; dateOfBirth?: string } = { objective };
      if (!user?.dateOfBirth || ageTouched) {
        profilePatch.dateOfBirth = dobFromAge(age, user?.dateOfBirth);
      }
      const authOk = await updateAuthProfile(profilePatch);
      const nutritionOk = await updateProfile({
        activity_level: encodeActivity(neat, sessions),
        start_weight: parseFloat(startWeight.replace(',', '.')) || undefined,
        target_weight: parseFloat(targetWeight.replace(',', '.')) || undefined,
        weekly_weight_goal: showPace ? parsedWeekly : 0,
        manual_kcal_goal: parseInt(kcalGoal, 10),
        meal_distribution: distribution,
      });
      if (authOk === false || nutritionOk === false) {
        throw new Error('save failed');
      }
      await reloadProfile();
      onClose();
    } catch (err) {
      console.error('Error saving nutrition settings:', err);
      Alert.alert('Erreur', 'Impossible d’enregistrer.');
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.colors.surfaceLight }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Repères</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabRow}>
          {(['Objectif', 'Repas'] as const).map((label, index) => {
            const on = activeTab === index;
            return (
              <TouchableOpacity key={label} onPress={() => setActiveTab(index as 0 | 1)} style={styles.tabHit}>
                <Text style={[styles.tabLabel, { color: on ? theme.colors.text : theme.colors.textMuted }]}>
                  {label}
                </Text>
                <View style={[styles.tabLine, { backgroundColor: on ? theme.colors.text : 'transparent' }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 0 ? (
            <>
              <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>DIRECTION</Text>
              <View style={styles.loadGrid}>
                {OBJECTIVES.map((obj) => {
                  const on = matchesObjective(objective, obj.id);
                  return (
                    <TouchableOpacity
                      key={obj.id}
                      onPress={() => {
                        setObjective(obj.id);
                        if (obj.id === 'Stabiliser' || obj.id === 'Se muscler') setWeeklyGoal('0');
                        else if (weeklyGoal === '0') setWeeklyGoal('0.5');
                      }}
                      style={[
                        styles.loadCell,
                        {
                          backgroundColor: on ? theme.colors.accent : theme.colors.surface,
                          borderColor: on ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.loadTitle, { color: on ? '#FFF' : theme.colors.text }]}>{obj.label}</Text>
                      <Text style={[styles.loadDesc, { color: on ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }]}>{obj.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.kcalBlock, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>CALORIES DU JOUR</Text>
                <View style={styles.kcalRow}>
                  <TextInput
                    style={[styles.kcalInput, { color: theme.colors.text }]}
                    keyboardType="numeric"
                    value={kcalGoal}
                    onChangeText={setKcalGoal}
                    maxLength={5}
                  />
                  <Text style={[styles.kcalUnit, { color: theme.colors.textSecondary }]}>kcal</Text>
                </View>
                <TouchableOpacity onPress={handleRecalculateKcal} style={styles.estimateHit}>
                  <Text style={[styles.estimateText, { color: theme.colors.sprintyBlue }]}>
                    {preview ? `Calculer mes calories · ${preview.target.toLocaleString('fr-FR')}` : 'Calculer mes calories'}
                  </Text>
                </TouchableOpacity>
                {preview ? (
                  <Text style={[styles.breakdown, { color: theme.colors.textSecondary }]}>
                    {preview.note}
                    {` Entretien ${preview.tdee.toLocaleString('fr-FR')} kcal`}
                    {preview.exercisePerDay > 0 ? `, dont ${preview.exercisePerDay} kcal d'entraînement.` : '.'}
                    {preview.bmrMethod === 'katch' ? ' Masse maigre prise en compte.' : ''}
                  </Text>
                ) : (
                  <Text style={[styles.breakdown, { color: theme.colors.textSecondary }]}>
                    Indique un poids entre 30 et 250 kg.
                  </Text>
                )}
              </View>

              <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>POIDS</Text>
              <View style={styles.weightRow}>
                <WeightField label="Actuel" value={startWeight} onChange={setStartWeight} theme={theme} />
                <WeightField label="Cible" value={targetWeight} onChange={setTargetWeight} theme={theme} />
              </View>

              <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>ÂGE</Text>
              <View style={[styles.sessionBox, { backgroundColor: theme.colors.surface, marginTop: 0 }]}>
                <TouchableOpacity onPress={() => nudgeAge(-1)} style={[styles.step, { backgroundColor: theme.colors.surfaceLight }]}>
                  <Feather name="minus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sessionValue, { color: theme.colors.text }]}>{age} ans</Text>
                <TouchableOpacity onPress={() => nudgeAge(1)} style={[styles.step, { backgroundColor: theme.colors.surfaceLight }]}>
                  <Feather name="plus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {showPace && (
                <>
                  <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>RYTHME</Text>
                  <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>kg par semaine, pas plus de 1</Text>
                  <View style={styles.paceRow}>
                    {PACES.map((pace) => {
                      const on = Math.abs(parseFloat(weeklyGoal) - parseFloat(pace)) < 0.01;
                      return (
                        <TouchableOpacity
                          key={pace}
                          onPress={() => setWeeklyGoal(pace)}
                          style={[
                            styles.paceChip,
                            {
                              backgroundColor: on ? theme.colors.accent : theme.colors.surface,
                              borderColor: on ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.paceText, { color: on ? '#FFF' : theme.colors.text }]}>{pace.replace('.', ',')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>HORS ENTRAÎNEMENT</Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Ton quotidien, sans compter les séances</Text>
              <View style={styles.loadGrid}>
                {NEAT_LEVELS.map((lvl) => {
                  const on = neat === lvl.id;
                  return (
                    <TouchableOpacity
                      key={lvl.id}
                      onPress={() => setNeat(lvl.id)}
                      style={[
                        styles.loadCell,
                        {
                          backgroundColor: on ? theme.colors.accent : theme.colors.surface,
                          borderColor: on ? theme.colors.accent : theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.loadTitle, { color: on ? '#FFF' : theme.colors.text }]}>{lvl.label}</Text>
                      <Text style={[styles.loadDesc, { color: on ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }]}>{lvl.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>SÉANCES PAR SEMAINE</Text>
              <View style={[styles.sessionBox, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity
                  onPress={() => nudgeSessions(-1)}
                  disabled={sessions <= MIN_SESSIONS}
                  style={[styles.step, { backgroundColor: theme.colors.surfaceLight, opacity: sessions <= MIN_SESSIONS ? 0.4 : 1 }]}
                >
                  <Feather name="minus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sessionValue, { color: theme.colors.text }]}>{sessions}</Text>
                <TouchableOpacity
                  onPress={() => nudgeSessions(1)}
                  disabled={sessions >= MAX_SESSIONS}
                  style={[styles.step, { backgroundColor: theme.colors.surfaceLight, opacity: sessions >= MAX_SESSIONS ? 0.4 : 1 }]}
                >
                  <Feather name="plus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.splitHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.splitTotal, { color: totalDist === 100 ? theme.colors.text : theme.colors.error }]}>
                    {totalDist}
                    <Text style={styles.splitPct}> %</Text>
                  </Text>
                  {totalDist === 100 ? (
                    <View style={styles.balancedBadge}>
                      <Text style={styles.balancedBadgeText}>Équilibré ✓</Text>
                    </View>
                  ) : (
                    <View style={[styles.balancedBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.balancedBadgeText, { color: '#EF4444' }]}>
                        {totalDist > 100 ? `+${totalDist - 100} %` : `-${100 - totalDist} %`}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => setDistribution(DEFAULT_DISTRIBUTION)}>
                  <Text style={[styles.estimateText, { color: theme.colors.sprintyBlue }]}>Remettre 25 · 35 · 30 · 10</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.bar, { backgroundColor: theme.colors.surfaceLight }]}>
                {MEALS.map((meal) => {
                  const val = distribution[meal.key] || 0;
                  if (val <= 0) return null;
                  return <View key={meal.key} style={{ width: `${Math.min(100, val)}%`, backgroundColor: meal.color }} />;
                })}
              </View>

              {MEALS.map((meal) => {
                const pct = distribution[meal.key] || 0;
                const mealKcal = Math.round((totalKcal * pct) / 100);
                return (
                  <View key={meal.key} style={[styles.mealRow, { backgroundColor: theme.colors.surface }]}>
                    <View style={[styles.mealTick, { backgroundColor: meal.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mealName, { color: theme.colors.text }]}>{meal.label}</Text>
                      <Text style={[styles.mealMeta, { color: theme.colors.textSecondary }]}>
                        {meal.short} · {mealKcal || 0} kcal
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleStepMeal(meal.key, -5)}
                      style={[styles.step, { backgroundColor: theme.colors.surfaceLight }]}
                    >
                      <Feather name="minus" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.mealPct, { color: theme.colors.text }]}>{pct} %</Text>
                    <TouchableOpacity
                      onPress={() => handleStepMeal(meal.key, 5)}
                      style={[styles.step, { backgroundColor: theme.colors.surfaceLight }]}
                    >
                      <Feather name="plus" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: isFormValid ? theme.colors.accent : theme.colors.textMuted }]}
            onPress={handleSave}
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{totalDist === 100 ? 'Enregistrer' : `Il manque ${100 - totalDist} %`}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function WeightField({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.weightCell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.loadDesc, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.kcalRow}>
        <TextInput
          style={[styles.weightInput, { color: theme.colors.text }]}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Text style={[styles.kcalUnit, { color: theme.colors.textSecondary }]}>kg</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 36 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 22, marginBottom: 8 },
  tabHit: { paddingTop: 8 },
  tabLabel: { fontSize: 16, fontWeight: '700' },
  tabLine: { height: 2, marginTop: 8, borderRadius: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  hint: { fontSize: 13, marginTop: -6, marginBottom: 10 },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  goalText: { fontSize: 15, fontWeight: '700' },
  kcalBlock: { marginTop: 22, borderRadius: 20, padding: 18 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  kcalInput: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5, minWidth: 120, padding: 0 },
  kcalUnit: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 6 },
  estimateHit: { marginTop: 4, alignSelf: 'flex-start' },
  estimateText: { fontSize: 14, fontWeight: '700' },
  weightRow: { flexDirection: 'row', gap: 10 },
  weightCell: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  weightInput: { fontSize: 28, fontWeight: '800', minWidth: 48, padding: 0 },
  paceRow: { flexDirection: 'row', gap: 8 },
  paceChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceText: { fontSize: 15, fontWeight: '700' },
  balancedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E8F7F3',
    marginLeft: 10,
  },
  balancedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C9A7',
  },
  loadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadCell: { width: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  loadTitle: { fontSize: 16, fontWeight: '800' },
  loadDesc: { fontSize: 12, marginTop: 2 },
  splitHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  splitTotal: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  splitPct: { fontSize: 18, fontWeight: '700' },
  bar: { height: 10, borderRadius: 99, flexDirection: 'row', overflow: 'hidden', marginBottom: 16 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 0,
    marginBottom: 8,
    overflow: 'hidden',
  },
  mealTick: { width: 4, alignSelf: 'stretch', marginRight: 14 },
  mealName: { fontSize: 16, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealPct: { minWidth: 50, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  step: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 8 },
  saveButton: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  breakdown: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  sessionBox: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionValue: { fontSize: 28, fontWeight: '800', minWidth: 36, textAlign: 'center' },
});
