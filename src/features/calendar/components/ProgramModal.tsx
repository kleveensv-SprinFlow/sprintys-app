import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { BottomSheet } from '../../../shared/components/BottomSheet';
import { Button } from '../../../shared/components/Button';
import { PressableScale } from '../../../shared/components/PressableScale';
import { toast } from '../../../shared/feedback/appAlert';
import { workoutService } from '../../../services/workoutService';
import { ProgressionOptions, planWeeks, progressedLoad } from '../../workout/progression';

interface Props {
  visible: boolean;
  onClose: () => void;
  workout: any;
  onDone: () => void;
}

const fmt = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}`;

/** Plans the next weeks of a strength session with loads that rise every week (optionally a lighter week). */
export const ProgramModal: React.FC<Props> = ({ visible, onClose, workout, onDone }) => {
  const theme = useTheme();
  const [weeks, setWeeks] = useState(4);
  const [mode, setMode] = useState<'percent' | 'kg'>('percent');
  const [step, setStep] = useState(2.5);
  const [deload, setDeload] = useState(false);
  const [busy, setBusy] = useState(false);

  const opts: ProgressionOptions = { weeks, mode, step, deloadEvery: deload ? 4 : 0 };
  const plans = useMemo(() => planWeeks(opts), [weeks, mode, step, deload]);

  // Preview on the first exercise that has a load
  const sample = useMemo(() => {
    const exercises = (workout?.blocks || []).flatMap((b: any) => b.exercises || []).concat(workout?.exercises || []);
    for (const ex of exercises) {
      const set = (ex.sets || []).find((st: any) => parseFloat(String(st.weight ?? '')) > 0);
      if (set) return { name: ex.name as string, weight: set.weight, type: set.weight_type || set.weightType };
    }
    return null;
  }, [workout?.id]);
  const isPct = sample?.type === 'percent_1rm' || String(sample?.weight ?? '').includes('%');

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const n = await workoutService.programWithProgression(workout, opts);
      toast('success', `${n} semaine${n > 1 ? 's' : ''} planifiée${n > 1 ? 's' : ''} avec progression.`);
      onDone();
    } catch {
      toast('error', 'Impossible de planifier le programme. Rien n’a été créé.');
    } finally {
      setBusy(false);
    }
  };

  const blue = theme.colors.sprintyBlue;
  const Stepper = ({ value, onChange, min, max, stepBy, label }: { value: number; onChange: (v: number) => void; min: number; max: number; stepBy: number; label: string }) => (
    <View style={styles.stepper}>
      <PressableScale haptic="selection" onPress={() => onChange(Math.max(min, +(value - stepBy).toFixed(2)))} accessibilityRole="button" accessibilityLabel={`Moins ${label}`} style={styles.stepBtn}>
        <Feather name="minus" size={16} color={blue} />
      </PressableScale>
      <Text style={[styles.stepValue, { color: theme.colors.text }]}>{fmt(value)}</Text>
      <PressableScale haptic="selection" onPress={() => onChange(Math.min(max, +(value + stepBy).toFixed(2)))} accessibilityRole="button" accessibilityLabel={`Plus ${label}`} style={styles.stepBtn}>
        <Feather name="plus" size={16} color={blue} />
      </PressableScale>
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Programme sur plusieurs semaines" subtitle="Même séance chaque semaine, charges qui montent. La semaine d’origine ne change pas.">
      <View style={{ gap: 14 }}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Durée (semaines)</Text>
          <Stepper value={weeks} onChange={setWeeks} min={2} max={12} stepBy={1} label="semaines" />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Progression</Text>
          <View style={styles.seg}>
            {(['percent', 'kg'] as const).map((m) => (
              <PressableScale
                key={m}
                haptic="selection"
                onPress={() => {
                  setMode(m);
                  setStep(m === 'percent' ? 2.5 : 2.5);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                style={[styles.segItem, mode === m && { backgroundColor: blue }]}
              >
                <Text style={[styles.segText, { color: mode === m ? '#FFFFFF' : theme.colors.textSecondary }]}>{m === 'percent' ? '% / semaine' : 'kg / semaine'}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{mode === 'percent' ? 'Ajout par semaine (%)' : isPct ? 'Ajout par semaine (points de %)' : 'Ajout par semaine (kg)'}</Text>
          <Stepper value={step} onChange={setStep} min={mode === 'percent' ? 0.5 : 1} max={mode === 'percent' ? 10 : 20} stepBy={mode === 'percent' ? 0.5 : 1.25} label="ajout" />
        </View>

        <PressableScale haptic="selection" onPress={() => setDeload((d) => !d)} accessibilityRole="switch" accessibilityState={{ checked: deload }} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Semaine d’allègement</Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Une semaine sur 4 plus légère (−10 %), puis la progression reprend.</Text>
          </View>
          <Feather name={deload ? 'check-square' : 'square'} size={22} color={deload ? blue : theme.colors.textMuted} />
        </PressableScale>

        {sample ? (
          <View style={[styles.preview, { backgroundColor: theme.colors.glassFill }]}>
            <Text style={[styles.hint, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Aperçu : {sample.name}</Text>
            <View style={styles.chips}>
              {plans.map((p) => {
                const v = progressedLoad(sample.weight, sample.type, p, opts);
                return (
                  <View key={p.week} style={[styles.chip, p.deload && { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                    <Text style={[styles.chipWeek, { color: theme.colors.textMuted }]}>S{p.week + 1}{p.deload ? ' ↓' : ''}</Text>
                    <Text style={[styles.chipVal, { color: theme.colors.text }]}>{v == null ? '–' : `${fmt(v)}${isPct ? '%' : ' kg'}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Cette séance n’a pas de charge chiffrée : elle sera simplement répétée chaque semaine.</Text>
        )}

        <Button title={`Planifier ${weeks - 1} semaine${weeks - 1 > 1 ? 's' : ''}`} onPress={go} loading={busy} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  hint: { fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 105, 232, 0.1)', alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 999, padding: 3 },
  segItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  segText: { fontSize: 13, fontWeight: '700' },
  preview: { borderRadius: 16, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(0, 105, 232, 0.08)', alignItems: 'center' },
  chipWeek: { fontSize: 10.5, fontWeight: '700' },
  chipVal: { fontSize: 13, fontWeight: '800' },
});
