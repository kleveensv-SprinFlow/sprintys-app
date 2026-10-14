import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { TouchableOpacity } from '../../../shared/components/Tappable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { GLASS_BACKDROP } from '../../../core/glass';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { PressableScale } from '../../../shared/components/PressableScale';
import { MealIcon } from './MealIcon';
import { MEALS as MEAL_LIST, MEAL_ACCENT, MEAL_ACCENT_TINT } from '../nutritionTheme';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';
import { MealDistribution } from '../types';
import {
  NEAT_LEVELS,
  NeatLevel,
  MIN_SESSIONS,
  MAX_SESSIONS,
  ageFromDob,
  parseActivity,
  encodeActivity,
  classifyObjective,
  computeCalorieTarget,
  clampSessions,
} from '../calorieTarget';
import { FeedbackHost } from '../../../shared/feedback/FeedbackHost';
import { appAlert } from '../../../shared/feedback/appAlert';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const OBJECTIVES: { id: string; label: string; desc: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'Perte de poids', label: 'Perte de gras', desc: 'Déficit plafonné', icon: 'trending-down' },
  { id: 'Prendre du poids', label: 'Prise de masse', desc: 'Surplus modéré', icon: 'trending-up' },
  { id: 'Se muscler', label: 'Recomposition', desc: 'Proche du maintien', icon: 'refresh-cw' },
  { id: 'Stabiliser', label: 'Maintien', desc: 'Dépense du jour', icon: 'minus' },
];

const NEAT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  bureau: 'monitor',
  marche: 'navigation',
  debout: 'user',
  physique: 'tool',
};

/** One blue, fading from the first meal to the last (no rainbow per meal). */
const SEGMENT_OPACITY = [1, 0.72, 0.48, 0.28];

const PACES = ['0.25', '0.5', '0.75', '1'];

const MEALS = MEAL_LIST.map((m) => ({ key: m.type as keyof MealDistribution, type: m.type, label: m.label, short: m.short }));

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
  const { user, reloadProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [objective, setObjective] = useState(user?.objective || 'Stabiliser');
  const [startWeight, setStartWeight] = useState(user?.startWeight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() || '');
  const [neat, setNeat] = useState<NeatLevel>('marche');
  const [sessions, setSessions] = useState(4);
  const [age, setAge] = useState(25);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyWeightGoal?.toString() || '0.5');
  const [kcalGoal, setKcalGoal] = useState(user?.manualKcalGoal?.toString() || '2000');
  const [distribution, setDistribution] = useState<MealDistribution>(
    user?.mealDistribution || DEFAULT_DISTRIBUTION
  );
  const [isSaving, setIsSaving] = useState(false);

  const hydrated = useRef(false);

  useEffect(() => {
    if (!visible) {
      hydrated.current = false;
      return;
    }
    if (!user || hydrated.current) return;
    hydrated.current = true;

    const activity = parseActivity(user.activityLevel);
    setObjective(user.objective || 'Stabiliser');
    setStartWeight(user.startWeight ? user.startWeight.toString() : '');
    setTargetWeight(user.targetWeight ? user.targetWeight.toString() : '');
    setNeat(activity.neat);
    setSessions(activity.sessions);
    setAge(activity.age ?? ageFromDob(user.dateOfBirth) ?? 25);
    setWeeklyGoal(
      user.weeklyWeightGoal !== undefined && user.weeklyWeightGoal !== null && user.weeklyWeightGoal !== 0
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
      appAlert('Poids', 'Indique ton poids actuel pour calculer.');
      return;
    }
    setKcalGoal(String(preview.target));
  };

  const nudgeAge = (delta: number) => {
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
      appAlert('Répartition', `Les quatre repas doivent faire 100 %. Là, c’est ${totalDist} %.`);
      return;
    }
    if (!isWeeklyValid) {
      appAlert('Rythme', 'Le rythme reste entre 0,25 et 1 kg par semaine.');
      return;
    }

    setIsSaving(true);
    try {
      if (!user) throw new Error('missing user');
      const start = parseFloat(startWeight.replace(',', '.'));
      const target = parseFloat(targetWeight.replace(',', '.'));
      const { error } = await supabase
        .from('profiles')
        .update({
          objective,
          activity_level: encodeActivity(neat, sessions, age),
          start_weight: Number.isFinite(start) ? start : null,
          target_weight: Number.isFinite(target) ? target : null,
          weekly_weight_goal: showPace ? parsedWeekly : 0,
          manual_kcal_goal: parseInt(kcalGoal, 10),
          meal_distribution: distribution,
        })
        .eq('id', user.id);
      if (error) throw error;
      await reloadProfile();
      onClose();
    } catch (err) {
      console.error('Error saving nutrition settings:', err);
      appAlert('Erreur', 'Impossible d’enregistrer. Réessaie dans un instant.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FeedbackHost />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: GLASS_BACKDROP }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.colors.glassFill }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Repères</Text>
          <View style={styles.headerSpacer} />
        </View>

        <SegmentedControl
          style={styles.tabs}
          options={[
            { key: 'objectif', label: 'Objectif' },
            { key: 'repas', label: 'Repas' },
          ]}
          value={activeTab === 0 ? 'objectif' : 'repas'}
          onChange={(key) => setActiveTab(key === 'objectif' ? 0 : 1)}
        />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 96, paddingTop: 8 }}
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
                          backgroundColor: on ? MEAL_ACCENT_TINT : theme.colors.surface,
                          borderColor: on ? MEAL_ACCENT : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.cellIcon, { backgroundColor: on ? MEAL_ACCENT : theme.colors.glassFill }]}>
                        <Feather name={obj.icon} size={15} color={on ? '#FFFFFF' : theme.colors.textSecondary} />
                      </View>
                      <Text style={[styles.loadTitle, { color: on ? MEAL_ACCENT : theme.colors.text }]}>{obj.label}</Text>
                      <Text style={[styles.loadDesc, { color: theme.colors.textSecondary }]}>{obj.desc}</Text>
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
                <TouchableOpacity onPress={() => nudgeAge(-1)} style={[styles.step, { backgroundColor: theme.colors.glassFill }]}>
                  <Feather name="minus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sessionValue, { color: theme.colors.text }]}>{age} ans</Text>
                <TouchableOpacity onPress={() => nudgeAge(1)} style={[styles.step, { backgroundColor: theme.colors.glassFill }]}>
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
                            { backgroundColor: on ? MEAL_ACCENT : theme.colors.surface },
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
                          backgroundColor: on ? MEAL_ACCENT_TINT : theme.colors.surface,
                          borderColor: on ? MEAL_ACCENT : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.cellIcon, { backgroundColor: on ? MEAL_ACCENT : theme.colors.glassFill }]}>
                        <Feather name={NEAT_ICONS[lvl.id] || 'activity'} size={15} color={on ? '#FFFFFF' : theme.colors.textSecondary} />
                      </View>
                      <Text style={[styles.loadTitle, { color: on ? MEAL_ACCENT : theme.colors.text }]}>{lvl.label}</Text>
                      <Text style={[styles.loadDesc, { color: theme.colors.textSecondary }]}>{lvl.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.kicker, { color: theme.colors.textMuted, marginTop: 22 }]}>SÉANCES PAR SEMAINE</Text>
              <View style={[styles.sessionBox, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity
                  onPress={() => nudgeSessions(-1)}
                  disabled={sessions <= MIN_SESSIONS}
                  style={[styles.step, { backgroundColor: theme.colors.glassFill, opacity: sessions <= MIN_SESSIONS ? 0.4 : 1 }]}
                >
                  <Feather name="minus" size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sessionValue, { color: theme.colors.text }]}>{sessions}</Text>
                <TouchableOpacity
                  onPress={() => nudgeSessions(1)}
                  disabled={sessions >= MAX_SESSIONS}
                  style={[styles.step, { backgroundColor: theme.colors.glassFill, opacity: sessions >= MAX_SESSIONS ? 0.4 : 1 }]}
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
                    <View style={[styles.balancedBadge, { backgroundColor: MEAL_ACCENT_TINT }]}>
                      <Feather name="check" size={12} color={MEAL_ACCENT} />
                      <Text style={[styles.balancedBadgeText, { color: MEAL_ACCENT }]}>Équilibré</Text>
                    </View>
                  ) : (
                    <View style={[styles.balancedBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                      <Text style={[styles.balancedBadgeText, { color: theme.colors.error }]}>
                        {totalDist > 100 ? `+${totalDist - 100} %` : `-${100 - totalDist} %`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.bar, { backgroundColor: theme.colors.glassFill }]}>
                {MEALS.map((meal, index) => {
                  const val = distribution[meal.key] || 0;
                  if (val <= 0) return null;
                  return (
                    <View
                      key={meal.key}
                      style={[styles.barSegment, { width: `${Math.min(100, val)}%`, backgroundColor: MEAL_ACCENT, opacity: SEGMENT_OPACITY[index] }]}
                    />
                  );
                })}
              </View>

              {MEALS.map((meal) => {
                const pct = distribution[meal.key] || 0;
                const mealKcal = Math.round((totalKcal * pct) / 100);
                return (
                  <View key={meal.key} style={[styles.mealRow, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.mealIcon}>
                      <MealIcon type={meal.type} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mealName, { color: theme.colors.text }]}>{meal.label}</Text>
                      <Text style={[styles.mealMeta, { color: theme.colors.textSecondary }]}>
                        {meal.short} · {mealKcal || 0} kcal
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleStepMeal(meal.key, -5)}
                      style={[styles.step, { backgroundColor: theme.colors.glassFill }]}
                    >
                      <Feather name="minus" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.mealPct, { color: theme.colors.text }]}>{pct} %</Text>
                    <TouchableOpacity
                      onPress={() => handleStepMeal(meal.key, 5)}
                      style={[styles.step, { backgroundColor: theme.colors.glassFill }]}
                    >
                      <Feather name="plus" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity onPress={() => setDistribution(DEFAULT_DISTRIBUTION)} style={styles.resetHit} hitSlop={8}>
                <Text style={[styles.estimateText, { color: MEAL_ACCENT }]}>Remettre 25 · 35 · 30 · 10</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: GLASS_BACKDROP }]}>
          <PressableScale
            style={[styles.saveButton, { backgroundColor: isFormValid ? MEAL_ACCENT : theme.colors.textMuted }]}
            onPress={handleSave}
            disabled={!isFormValid || isSaving}
            haptic="medium"
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{totalDist === 100 ? 'Enregistrer' : `Il manque ${100 - totalDist} %`}</Text>
            )}
          </PressableScale>
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
    <View style={[styles.weightCell, { backgroundColor: theme.colors.surface }]}>
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
  tabs: { marginHorizontal: 20, marginTop: 4, marginBottom: 10 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  hint: { fontSize: 13, marginTop: -6, marginBottom: 10 },
  kcalBlock: { marginTop: 22, borderRadius: 22, borderCurve: 'continuous', padding: 18 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end' },
  kcalInput: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5, minWidth: 120, padding: 0 },
  kcalUnit: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 6 },
  estimateHit: { marginTop: 4, alignSelf: 'flex-start' },
  estimateText: { fontSize: 14, fontWeight: '700' },
  resetHit: { alignSelf: 'center', marginTop: 8, paddingVertical: 6 },
  weightRow: { flexDirection: 'row', gap: 10 },
  weightCell: { flex: 1, borderRadius: 18, borderCurve: 'continuous', padding: 14 },
  weightInput: { fontSize: 28, fontWeight: '800', minWidth: 48, padding: 0 },
  paceRow: { flexDirection: 'row', gap: 8 },
  paceChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceText: { fontSize: 15, fontWeight: '700' },
  balancedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  balancedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadCell: { width: '48%', flexGrow: 1, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1.5, padding: 14 },
  cellIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  loadTitle: { fontSize: 16, fontWeight: '800' },
  loadDesc: { fontSize: 12, marginTop: 2 },
  splitHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  splitTotal: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  splitPct: { fontSize: 18, fontWeight: '700' },
  bar: { height: 12, borderRadius: 99, flexDirection: 'row', overflow: 'hidden', marginBottom: 16 },
  barSegment: { height: '100%', borderRightWidth: 2, borderRightColor: '#FFFFFF' },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 12,
    marginBottom: 8,
  },
  mealIcon: { marginRight: 12 },
  mealName: { fontSize: 16, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealPct: { minWidth: 50, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  step: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 8 },
  saveButton: { borderRadius: 16, borderCurve: 'continuous', paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  breakdown: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  sessionBox: {
    marginTop: 8,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionValue: { fontSize: 28, fontWeight: '800', minWidth: 36, textAlign: 'center' },
});
