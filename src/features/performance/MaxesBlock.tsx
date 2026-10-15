import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { GlassSheen } from '../../shared/components/GlassSheen';
import { PressableScale } from '../../shared/components/PressableScale';
import { maxesService, AthleteMax, formatLoad } from '../../services/maxesService';
import { MaxEditSheet } from './MaxEditSheet';

/** Reference maxima (1RM) per exercise: they turn the prescribed "% 1RM" into kilos. Tap one to set it by hand. */
export const MaxesBlock: React.FC<{ athleteId: string; audience?: 'athlete' | 'coach' }> = ({ athleteId, audience = 'athlete' }) => {
  const theme = useTheme();
  const [list, setList] = useState<AthleteMax[]>([]);
  const [edit, setEdit] = useState<AthleteMax | null>(null);

  const load = useCallback(async () => {
    try {
      setList((await maxesService.fetch(athleteId)).filter((m) => m.best_kg != null));
    } catch {
      setList([]);
    }
  }, [athleteId]);

  useEffect(() => {
    setList([]);
    load();
  }, [load]);

  if (list.length === 0) return null;

  return (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.head}>
        <Feather name="sliders" size={15} color={theme.colors.sprintyBlue} />
        <Text style={[styles.title, { color: theme.colors.sprintyBlue }]}>Maxima de référence (1RM)</Text>
      </View>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        {audience === 'coach'
          ? 'Servent à calculer les charges prescrites en % du max. Estimés d’après ses meilleures séries, ou fixés par toi.'
          : 'Servent à calculer les charges prescrites en % du max. Estimés d’après tes meilleures séries, ou fixés par toi.'}
      </Text>
      {list.map((m, i) => (
        <PressableScale
          key={m.key}
          haptic="selection"
          onPress={() => setEdit(m)}
          accessibilityRole="button"
          accessibilityLabel={`${m.label} : ${m.best_kg} kg. Modifier`}
          style={[styles.row, i > 0 && { borderTopColor: theme.colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>{m.label}</Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{m.manual_kg != null ? 'Fixé à la main' : 'Estimé'}</Text>
          </View>
          <Text style={[styles.value, { color: theme.colors.text }]}>{formatLoad(m.best_kg as number)}</Text>
          <Feather name="edit-2" size={14} color={theme.colors.textMuted} style={{ marginLeft: 10 }} />
        </PressableScale>
      ))}
      {edit && (
        <MaxEditSheet
          visible
          onClose={() => setEdit(null)}
          athleteId={athleteId}
          exerciseKey={edit.key}
          label={edit.label}
          manualKg={edit.manual_kg}
          estimatedKg={edit.estimated_kg}
          onSaved={load}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  hint: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  value: { fontSize: 16, fontWeight: '800' },
});
