import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/core/theme';
import { useBodyStore } from '../../src/store/bodyStore';
import { useAuthStore } from '../../src/store/authStore';
import { useSprintyStore } from '../../src/store/sprintyStore';
import { BodyMetric } from '../../src/services/bodyService';
import { WeightTrendChart, movingAverage, TrendPoint } from '../../src/features/body/components/WeightChart';

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
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
  const smooth = series.length >= 4 ? movingAverage(series) : raw;
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

  const confirmDelete = (m: BodyMetric) => {
    if (!m.id || !user?.id) return;
    Alert.alert('Supprimer cette pesée ?', formatKg(m.weight) + ' kg', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteMetric(m.id as string, user.id),
      },
    ]);
  };

  const history = [...metrics].reverse();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Poids</Text>
        <TouchableOpacity onPress={openNew} style={[styles.iconBtn, { backgroundColor: blue }]}>
          <Feather name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.hero, { color: theme.colors.text }]}>
          {shown ? formatKg(shown.v) : '--'}
          <Text style={[styles.heroUnit, { color: theme.colors.textSecondary }]}> {unit}</Text>
        </Text>
        {delta != null && Math.abs(delta) >= 0.05 && (
          <View style={styles.deltaRow}>
            <Feather name={delta < 0 ? 'trending-down' : 'trending-up'} size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.delta, { color: theme.colors.textSecondary }]}>
              {formatKg(Math.abs(delta))} {unit} {rangeLabel}
            </Text>
          </View>
        )}

        <View style={styles.filters}>
          {(['weight', 'fat', 'muscle'] as MetricKey[])
            .filter((k) => k === 'weight' || (k === 'fat' ? hasFat : hasMuscle))
            .map((k) => {
              const on = metricKey === k;
              const label = k === 'weight' ? 'Poids' : k === 'fat' ? 'Gras' : 'Muscle';
              return (
                <TouchableOpacity key={k} onPress={() => { setMetricKey(k); setScrub(null); }} style={[styles.pill, on && { backgroundColor: theme.colors.text }]}>
                  <Text style={{ color: on ? '#FFF' : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
        </View>

        <View style={styles.filters}>
          {RANGES.map((r) => {
            const on = range === r.key;
            return (
              <TouchableOpacity key={r.key} onPress={() => { setRange(r.key); setScrub(null); }} style={[styles.pill, on && { backgroundColor: theme.colors.surfaceLight }]}>
                <Text style={{ color: on ? theme.colors.text : theme.colors.textMuted, fontWeight: '700', fontSize: 13 }}>{r.key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {series.length >= 2 ? (
          <WeightTrendChart
            raw={raw}
            smooth={smooth}
            width={width - 32}
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

        {metricKey === 'weight' && target > 0 && latest && (
          <Text style={[styles.goal, { color: theme.colors.textSecondary }]}>
            {Math.abs(latest.v - target) <= 0.1 ? 'Objectif atteint' : `encore ${formatKg(Math.abs(latest.v - target))} kg`}
          </Text>
        )}

        <Text style={[styles.section, { color: theme.colors.text }]}>Historique</Text>
        {history.length === 0 && (
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>Aucune pesée pour l'instant.</Text>
        )}
        {history.map((m) => {
          const d = m.created_at ? new Date(m.created_at) : null;
          const label = d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
          return (
            <View key={m.id || label + m.weight} style={[styles.row, { borderColor: theme.colors.border }]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(m)}>
                <Text style={[styles.rowValue, { color: theme.colors.text }]}>{formatKg(m.weight)} kg</Text>
                <Text style={[styles.rowDate, { color: theme.colors.textMuted }]}>
                  {label}
                  {m.body_fat != null ? `  ·  MG ${formatKg(Number(m.body_fat))} %` : ''}
                  {m.muscle_mass_kg != null ? `  ·  Muscle ${formatKg(Number(m.muscle_mass_kg))} kg` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(m)} hitSlop={10}>
                <Feather name="trash-2" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {sheet && (
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSheet(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{editingId ? 'Modifier la pesée' : 'Nouvelle pesée'}</Text>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => nudge(-1)} style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceLight }]}>
                <Text style={[styles.stepLabel, { color: theme.colors.text }]}>− 0,1</Text>
              </TouchableOpacity>
              <TextInput
                value={weight}
                onChangeText={(t) => setWeight(formatSmartDecimal(t))}
                keyboardType="decimal-pad"
                style={[styles.weightInput, { color: theme.colors.text }]}
                placeholder="0,0"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity onPress={() => nudge(1)} style={[styles.stepBtn, { backgroundColor: theme.colors.surfaceLight }]}>
                <Text style={[styles.stepLabel, { color: theme.colors.text }]}>+ 0,1</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.kgHint, { color: theme.colors.textMuted }]}>kg</Text>

            <TouchableOpacity onPress={() => setMore((v) => !v)} style={styles.moreBtn}>
              <Text style={{ color: blue, fontWeight: '700' }}>Ma balance mesure aussi…</Text>
            </TouchableOpacity>

            {more && (
              <View>
                <Field label="Masse grasse (%)" value={bodyFat} onChange={setBodyFat} theme={theme} />
                <Field label="Muscle (kg)" value={muscleMass} onChange={setMuscleMass} theme={theme} />
                <Field label="Eau (%)" value={water} onChange={setWater} theme={theme} />
                <View style={styles.scaleRow}>
                  {(['none', '4_electrodes', '8_electrodes'] as ScaleType[]).map((type) => {
                    const on = scaleType === type;
                    const label = type === 'none' ? 'Classique' : type === '4_electrodes' ? '4 électrodes' : '8 électrodes';
                    return (
                      <TouchableOpacity key={type} onPress={() => setScaleType(type)} style={[styles.pill, on && { backgroundColor: theme.colors.text }]}>
                        <Text style={{ color: on ? '#FFF' : theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.save, { backgroundColor: blue, opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveText}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{value}</Text>
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
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: theme.colors.text,
          fontSize: 16,
        }}
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
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 12 },
  delta: { fontSize: 14, fontWeight: '600' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  hint: { fontSize: 14, marginVertical: 24 },
  stats: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  goal: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowValue: { fontSize: 16, fontWeight: '700' },
  rowDate: { fontSize: 12, marginTop: 2 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end', zIndex: 20 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  stepLabel: { fontSize: 16, fontWeight: '700' },
  weightInput: { fontSize: 40, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  kgHint: { textAlign: 'center', marginTop: -4, marginBottom: 8 },
  moreBtn: { paddingVertical: 12 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  save: { marginTop: 12, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
