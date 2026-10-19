import { goBack } from '../../src/core/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, useWindowDimensions, Animated, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TouchableOpacity } from '../../src/shared/components/Tappable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/core/theme';
import { useBodyStore } from '../../src/store/bodyStore';
import { useAuthStore } from '../../src/store/authStore';
import { useSprintyStore } from '../../src/store/sprintyStore';
import { BodyMetric } from '../../src/services/bodyService';
import { EmptyState } from '../../src/shared/components/EmptyState';
import { WeightTrendChart, movingAverage, TrendPoint } from '../../src/features/body/components/WeightChart';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { glassCard, glassSurface } from '../../src/core/glass';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { FrostedBar } from '../../src/shared/components/FrostedBar';
import { useFrostedHeader } from '../../src/shared/hooks/useFrostedHeader';
import { SegmentedControl } from '../../src/shared/components/SegmentedControl';
import { PressableScale } from '../../src/shared/components/PressableScale';
import { supabase } from '../../src/services/supabase';
import { FeedbackHost } from '../../src/shared/feedback/FeedbackHost';
import { appAlert } from '../../src/shared/feedback/appAlert';

import { useRefresh } from '../../src/shared/hooks/useRefresh';

const BLUE_TINT = 'rgba(0, 105, 232, 0.1)';

type MetricKey = 'weight' | 'fat' | 'muscle';
type RangeKey = '1S' | '1M' | '3M' | '1A' | 'Tout';
type ScaleType = 'none' | '4_electrodes' | '8_electrodes';

const RANGES: { key: RangeKey; days: number }[] = [
  { key: '1S', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '1A', days: 365 },
  { key: 'Tout', days: Infinity },
];

function formatKg(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatSmartDecimal(text: string) {
  const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 1)}`;
}

function valueOf(m: BodyMetric, key: MetricKey): number | null {
  if (key === 'weight') return m.weight != null ? Number(m.weight) : null;
  if (key === 'fat') return m.body_fat != null ? Number(m.body_fat) : null;
  return m.muscle_mass_kg != null ? Number(m.muscle_mass_kg) : null;
}

export default function BodyCompositionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { barOpacity: headerBarOpacity, scrollProps } = useFrostedHeader();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, reloadProfile } = useAuthStore();
  const { metrics, addMetric, updateMetric, deleteMetric, loadMetrics, isLoading } = useBodyStore();
  const { showFeedback } = useSprintyStore();

  const [metricKey, setMetricKey] = useState<MetricKey>('weight');
  const [range, setRange] = useState<RangeKey>('1M');
  const [scrub, setScrub] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [water, setWater] = useState('');
  const [scaleType, setScaleType] = useState<ScaleType>('none');
  const [goalSheet, setGoalSheet] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const refreshControl = useRefresh(() => user?.id ? loadMetrics(user.id) : undefined);
  useEffect(() => {
    if (user?.id) loadMetrics(user.id);
  }, [user?.id]);

  const hasFat = metrics.some((m) => m.body_fat != null);
  const hasMuscle = metrics.some((m) => m.muscle_mass_kg != null);
  const target = Number(user?.targetWeight || 0);
  const blue = theme.colors.sprintyBlue;

  const series = useMemo(() => {
    const now = Date.now();
    const days = RANGES.find((r) => r.key === range)?.days ?? 30;
    const points: TrendPoint[] = [];
    metrics.forEach((m) => {
      const v = valueOf(m, metricKey);
      const t = new Date(m.created_at || '').getTime();
      if (v == null || Number.isNaN(v) || !t) return;
      if (days !== Infinity && now - t > days * 86400000) return;
      points.push({ t, v });
    });
    return points;
  }, [metrics, metricKey, range]);

  const raw = series.map((p) => p.v);
  // Peu de pesées : la courbe relie les vraies mesures (une moyenne glissante sur 4 points ne veut rien dire)
  const smooth = series.length >= 10 ? movingAverage(series) : raw;
  const shownIndex = scrub != null && series[scrub] ? scrub : series.length - 1;
  const shown = series[shownIndex];
  const latest = series[series.length - 1];
  const first = series[0];

  const weekAvg = useMemo(() => {
    if (!latest) return null;
    const from = latest.t - 7 * 86400000;
    const slice = series.filter((p) => p.t >= from);
    if (!slice.length) return null;
    return slice.reduce((s, p) => s + p.v, 0) / slice.length;
  }, [series, latest]);

  const min = raw.length ? Math.min(...raw) : null;
  const unit = metricKey === 'fat' ? '%' : 'kg';

  const delta = latest && first && series.length > 1 ? latest.v - first.v : null;
  const rangeLabel = range === 'Tout' ? 'sur toute la période' : `sur ${range === '1S' ? '7 j' : range === '1M' ? '30 j' : range === '3M' ? '90 j' : '1 an'}`;

  const openNew = () => {
    const last = [...metrics].reverse().find((m) => m.weight != null);
    setEditingId(null);
    setWeight(last ? String(last.weight).replace('.', ',') : '');
    setBodyFat('');
    setMuscleMass('');
    setWater('');
    setScaleType('none');
    setMore(false);
    setSheet(true);
  };

  const openEdit = (m: BodyMetric) => {
    if (!m.id) return;
    setEditingId(m.id);
    setWeight(String(m.weight).replace('.', ','));
    setBodyFat(m.body_fat != null ? String(m.body_fat).replace('.', ',') : '');
    setMuscleMass(m.muscle_mass_kg != null ? String(m.muscle_mass_kg).replace('.', ',') : '');
    setWater(m.water_percentage != null ? String(m.water_percentage).replace('.', ',') : '');
    setScaleType((m.scale_type as ScaleType) || 'none');
    setMore(m.body_fat != null || m.muscle_mass_kg != null || m.water_percentage != null);
    setSheet(true);
  };

  const nudge = (dir: number) => {
    const current = parseFloat(weight.replace(',', '.'));
    const base = Number.isNaN(current) ? 70 : current;
    const next = Math.round((base + dir * 0.1) * 10) / 10;
    setWeight(next.toFixed(1).replace('.', ','));
  };

  const parseNum = (val: string) => {
    if (!val.trim()) return null;
    const parsed = parseFloat(val.replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const w = parseNum(weight);
    if (w == null) {
      showFeedback('error', 'Le poids est obligatoire.');
      return;
    }
    if (w < 25 || w > 300) {
      showFeedback('error', 'Entre un poids entre 25 et 300 kg.');
      return;
    }
    const fat = parseNum(bodyFat);
    if (fat != null && (fat < 2 || fat > 70)) {
      showFeedback('error', 'La masse grasse doit être entre 2 et 70 %.');
      return;
    }
    const muscle = parseNum(muscleMass);
    if (muscle != null && (muscle < 10 || muscle > w)) {
      showFeedback('error', 'La masse musculaire doit être entre 10 kg et ton poids.');
      return;
    }
    const waterPct = parseNum(water);
    if (waterPct != null && (waterPct < 20 || waterPct > 80)) {
      showFeedback('error', 'L’eau doit être entre 20 et 80 %.');
      return;
    }
    const payload: Partial<BodyMetric> = {
      weight: w,
      scale_type: scaleType,
      body_fat: parseNum(bodyFat),
      muscle_mass_kg: parseNum(muscleMass),
      water_percentage: parseNum(water),
    };
    try {
      if (editingId) {
        await updateMetric(editingId, user.id, payload);
      } else {
        await addMetric({ athlete_id: user.id, weight: w, ...payload });
      }
      showFeedback('success', 'Pesée enregistrée');
      setSheet(false);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = () => {
    const m = metrics.find((x) => x.id === editingId);
    if (!m?.id || !user?.id) return;
    appAlert('Supprimer cette pesée ?', formatKg(m.weight) + ' kg', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteMetric(m.id as string, user.id);
          setSheet(false);
        },
      },
    ]);
  };

  const openGoal = () => {
    const last = [...metrics].reverse().find((m) => m.weight != null);
    const base = target > 0 ? target : last ? Math.round(Number(last.weight)) : 70;
    setGoalValue(String(base).replace('.', ','));
    setGoalSheet(true);
  };

  const nudgeGoal = (dir: number) => {
    const current = parseFloat(goalValue.replace(',', '.'));
    const base = Number.isNaN(current) ? 70 : current;
    const next = Math.round((base + dir * 0.5) * 2) / 2;
    setGoalValue(String(next).replace('.', ','));
  };

  const saveGoal = async (value: number | null) => {
    if (!user?.id) return;
    if (value != null && (value < 30 || value > 250)) {
      showFeedback('error', 'Choisis un objectif entre 30 et 250 kg.');
      return;
    }
    setSavingGoal(true);
    try {
      const { error } = await supabase.from('profiles').update({ target_weight: value }).eq('id', user.id);
      if (error) throw error;
      await reloadProfile();
      showFeedback('success', value == null ? 'Objectif retiré' : 'Objectif enregistré');
      setGoalSheet(false);
    } catch (err) {
      console.error(err);
      showFeedback('error', "Impossible d'enregistrer l'objectif.");
    } finally {
      setSavingGoal(false);
    }
  };

  const history = [...metrics].reverse().filter((m) => {
    const v = valueOf(m, metricKey);
    return v != null && !Number.isNaN(v);
  });
  const metricOptions: { key: MetricKey; label: string }[] = [
    { key: 'weight', label: 'Poids' },
    ...(hasFat ? [{ key: 'fat' as MetricKey, label: 'Gras' }] : []),
    ...(hasMuscle ? [{ key: 'muscle' as MetricKey, label: 'Muscle' }] : []),
  ];

  return (
    <GlassScreen>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          {/* Frosted only once content scrolls under it; reaches up under the status bar */}
          <FrostedBar opacity={headerBarOpacity} style={{ top: -insets.top }} />
          <TouchableOpacity onPress={() => goBack(router, '/(athlete)')} style={[styles.iconBtn, glassSurface]} accessibilityRole="button" accessibilityLabel="Retour">
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Poids</Text>
          <PressableScale onPress={openNew} haptic="selection" style={[styles.iconBtn, glassSurface]}>
            <Feather name="plus" size={20} color={blue} />
          </PressableScale>
        </View>

        <Animated.ScrollView {...scrollProps} refreshControl={refreshControl} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!isLoading && metrics.length === 0 ? (
            <EmptyState
              icon="trending-down"
              title="Aucune pesée pour l’instant"
              message="Ajoute ta première pesée : la courbe et la moyenne apparaîtront ici."
              actionLabel="Ajouter une pesée"
              onAction={openNew}
            />
          ) : (
          <>
          <Text style={[styles.hero, { color: theme.colors.text }]}>
            {shown ? formatKg(shown.v) : '--'}
            <Text style={[styles.heroUnit, { color: theme.colors.textSecondary }]}> {unit}</Text>
          </Text>
          {delta != null && Math.abs(delta) >= 0.05 ? (
            <View style={[styles.deltaChip, { backgroundColor: theme.colors.glassFill }]}>
              <Feather name={delta < 0 ? 'arrow-down-right' : 'arrow-up-right'} size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.delta, { color: theme.colors.textSecondary }]}>
                {delta < 0 ? '−' : '+'}
                {formatKg(Math.abs(delta))} {unit} {rangeLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.deltaSpacer} />
          )}

          {metricOptions.length > 1 && (
            <SegmentedControl
              style={styles.segment}
              options={metricOptions}
              value={metricKey}
              onChange={(k) => {
                setMetricKey(k);
                setScrub(null);
              }}
            />
          )}

          <SegmentedControl
            style={styles.segment}
            options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
            value={range}
            onChange={(k) => {
              setRange(k);
              setScrub(null);
            }}
          />

          <View style={glassCard}>
            <GlassSheen radius={22} />
            {series.length >= 2 ? (
              <WeightTrendChart
                raw={raw}
                smooth={smooth}
                width={width - 64}
                height={220}
                color={blue}
                target={metricKey === 'weight' && target > 0 ? target : null}
                onScrub={setScrub}
              />
            ) : (
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                {series.length === 0 ? 'Aucune mesure sur cette période.' : 'Une deuxième pesée dessinera la courbe.'}
              </Text>
            )}

            {series.length > 0 && (
              <View style={styles.stats}>
                <Stat label="Début" value={first ? formatKg(first.v) : '--'} color={theme.colors.text} muted={theme.colors.textMuted} />
                <Stat label="Moyenne 7 j" value={weekAvg != null ? formatKg(weekAvg) : '--'} color={theme.colors.text} muted={theme.colors.textMuted} />
                <Stat label="Min" value={min != null ? formatKg(min) : '--'} color={theme.colors.text} muted={theme.colors.textMuted} />
              </View>
            )}

            {metricKey === 'weight' && (
              <PressableScale onPress={openGoal} haptic="selection" style={[styles.goalRow, { borderTopColor: theme.colors.hairline }]}>
                <View style={[styles.goalIcon, { backgroundColor: BLUE_TINT }]}>
                  <Feather name="flag" size={14} color={blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, { color: theme.colors.text }]}>
                    {target > 0 ? `Objectif ${target.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg` : 'Définir un objectif'}
                  </Text>
                  {target > 0 && latest && (
                    <Text style={[styles.goalSub, { color: theme.colors.textSecondary }]}>
                      {Math.abs(latest.v - target) <= 0.1 ? 'Objectif atteint' : `encore ${formatKg(Math.abs(latest.v - target))} kg`}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </PressableScale>
            )}
          </View>

          <Text style={[styles.section, { color: theme.colors.text }]}>Historique</Text>
          {history.length === 0 && (
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>Aucune pesée pour l'instant.</Text>
          )}
          {history.length > 0 && (
            <View style={[glassCard, styles.historyCard]}>
              <GlassSheen radius={22} />
              {history.map((m, i) => {
                const d = m.created_at ? new Date(m.created_at) : null;
                const label = d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
                return (
                  <TouchableOpacity
                    key={m.id || label + m.weight}
                    activeOpacity={0.6}
                    onPress={() => openEdit(m)}
                    style={[styles.row, { borderColor: theme.colors.hairline }, i === history.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowValue, { color: theme.colors.text }]}>{formatKg(valueOf(m, metricKey) as number)} {unit}</Text>
                      <Text style={[styles.rowDate, { color: theme.colors.textMuted }]}>
                        {label}
                        {metricKey !== 'weight' && m.weight != null ? `  ·  ${formatKg(m.weight)} kg` : ''}
                        {metricKey !== 'fat' && m.body_fat != null ? `  ·  MG ${formatKg(Number(m.body_fat))} %` : ''}
                        {metricKey !== 'muscle' && m.muscle_mass_kg != null ? `  ·  Muscle ${formatKg(Number(m.muscle_mass_kg))} kg` : ''}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </>
          )}
        </Animated.ScrollView>

        <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)} statusBarTranslucent>
          <FeedbackHost />
          <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={{ flex: 1 }} onPress={() => setSheet(false)} />
            <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{editingId ? 'Modifier la pesée' : 'Nouvelle pesée'}</Text>
                <View style={styles.stepper}>
                  <PressableScale onPress={() => nudge(-1)} haptic="selection" style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}>
                    <Text style={[styles.stepLabel, { color: theme.colors.text }]}>− 0,1</Text>
                  </PressableScale>
                  <TextInput
                    value={weight}
                    onChangeText={(t) => setWeight(formatSmartDecimal(t))}
                    keyboardType="decimal-pad"
                    style={[styles.weightInput, { color: theme.colors.text }]}
                    placeholder="0,0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <PressableScale onPress={() => nudge(1)} haptic="selection" style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}>
                    <Text style={[styles.stepLabel, { color: theme.colors.text }]}>+ 0,1</Text>
                  </PressableScale>
                </View>
                <Text style={[styles.kgHint, { color: theme.colors.textMuted }]}>kg</Text>

                <TouchableOpacity onPress={() => setMore((v) => !v)} style={styles.moreBtn}>
                  <Text style={{ color: blue, fontWeight: '700' }}>{more ? 'Masquer les autres mesures' : 'Ma balance mesure aussi…'}</Text>
                </TouchableOpacity>

                {more && (
                  <View>
                    <Field label="Masse grasse (%)" value={bodyFat} onChange={setBodyFat} theme={theme} />
                    <Field label="Muscle (kg)" value={muscleMass} onChange={setMuscleMass} theme={theme} />
                    <Field label="Eau (%)" value={water} onChange={setWater} theme={theme} />
                    <SegmentedControl
                      style={styles.scaleSegment}
                      options={[
                        { key: 'none' as ScaleType, label: 'Classique' },
                        { key: '4_electrodes' as ScaleType, label: '4 électrodes' },
                        { key: '8_electrodes' as ScaleType, label: '8 électrodes' },
                      ]}
                      value={scaleType}
                      onChange={setScaleType}
                    />
                  </View>
                )}

                <PressableScale
                  style={[styles.save, { backgroundColor: blue, opacity: isLoading ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={isLoading}
                  haptic="medium"
                >
                  <Text style={styles.saveText}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</Text>
                </PressableScale>

                {editingId && (
                  <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
                    <Text style={[styles.deleteText, { color: theme.colors.error }]}>Supprimer la pesée</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={goalSheet} transparent animationType="slide" onRequestClose={() => setGoalSheet(false)} statusBarTranslucent>
          <FeedbackHost />
          <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={{ flex: 1 }} onPress={() => setGoalSheet(false)} />
            <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Objectif de poids</Text>
              <View style={styles.stepper}>
                <PressableScale onPress={() => nudgeGoal(-1)} haptic="selection" style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}>
                  <Text style={[styles.stepLabel, { color: theme.colors.text }]}>− 0,5</Text>
                </PressableScale>
                <TextInput
                  value={goalValue}
                  onChangeText={(t) => setGoalValue(formatSmartDecimal(t))}
                  keyboardType="decimal-pad"
                  style={[styles.weightInput, { color: theme.colors.text }]}
                  placeholder="0,0"
                  placeholderTextColor={theme.colors.textMuted}
                />
                <PressableScale onPress={() => nudgeGoal(1)} haptic="selection" style={[styles.stepBtn, { backgroundColor: theme.colors.glassFill }]}>
                  <Text style={[styles.stepLabel, { color: theme.colors.text }]}>+ 0,5</Text>
                </PressableScale>
              </View>
              <Text style={[styles.kgHint, { color: theme.colors.textMuted }]}>kg</Text>

              <PressableScale
                style={[styles.save, { backgroundColor: blue, opacity: savingGoal ? 0.6 : 1 }]}
                onPress={() => saveGoal(parseNum(goalValue))}
                disabled={savingGoal}
                haptic="medium"
              >
                <Text style={styles.saveText}>{savingGoal ? 'Enregistrement…' : "Enregistrer l'objectif"}</Text>
              </PressableScale>
              {target > 0 && (
                <TouchableOpacity onPress={() => saveGoal(null)} style={styles.deleteBtn} disabled={savingGoal}>
                  <Text style={[styles.deleteText, { color: theme.colors.textSecondary }]}>Retirer l'objectif</Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </GlassScreen>
  );
}

function Stat({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChange, theme }: { label: string; value: string; onChange: (t: string) => void; theme: any }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(formatSmartDecimal(t))}
        keyboardType="decimal-pad"
        style={[styles.field, { backgroundColor: theme.colors.glassFill, color: theme.colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  hero: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  heroUnit: { fontSize: 18, fontWeight: '600' },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 16,
  },
  deltaSpacer: { height: 12 },
  delta: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  segment: { marginBottom: 10 },
  scaleSegment: { marginTop: 4 },
  hint: { fontSize: 14, marginVertical: 24 },
  stats: { flexDirection: 'row', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  goalIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 15, fontWeight: '700' },
  goalSub: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  historyCard: { paddingVertical: 4 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowValue: { fontSize: 16, fontWeight: '700' },
  rowDate: { fontSize: 12, marginTop: 2 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderCurve: 'continuous' },
  stepLabel: { fontSize: 16, fontWeight: '700' },
  weightInput: { fontSize: 40, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  kgHint: { textAlign: 'center', marginTop: -4, marginBottom: 8 },
  moreBtn: { paddingVertical: 12 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  save: { marginTop: 16, borderRadius: 16, borderCurve: 'continuous', paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { fontSize: 15, fontWeight: '700' },
  field: { borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
});
