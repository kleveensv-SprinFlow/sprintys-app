import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { useNutritionStore } from '../../../store/nutrition/nutritionStore';
import { useAuthStore } from '../../../store/authStore';
import { isMinorAthlete } from '../../../legal/age';
import { MICRO_META, formatMicro, sumMicros } from '../micros';

interface Props {
  athleteProfile?: any;
}

/**
 * « Nutriments du jour » : fibres, sucres, sel, graisses saturées, fer, calcium.
 * Repères indicatifs, pas des objectifs médicaux. Valeur absente = inconnue : on le dit au lieu d'afficher 0.
 * Masqué pour les mineurs (comme les autres chiffres) et tant que rien n'est enregistré.
 */
export const MicrosCard: React.FC<Props> = ({ athleteProfile }) => {
  const mealLogs = useNutritionStore((s) => s.mealLogs);
  const user = useAuthStore((s) => s.user);
  if (isMinorAthlete(athleteProfile || user) || mealLogs.length === 0) return null;

  const totals = sumMicros(mealLogs);
  const anyKnown = MICRO_META.some((m) => totals[m.key].known > 0);
  if (!anyKnown) return null;

  return (
    <View style={[glassCard, styles.card]}>
      <Text style={styles.title}>Nutriments du jour</Text>
      {MICRO_META.map((m) => {
        const t = totals[m.key];
        if (t.known === 0) return null;
        const pct = Math.min(1, t.total / m.ref);
        const over = m.kind === 'max' && t.total > m.ref;
        const partial = t.known < t.count;
        return (
          <View key={m.key} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{m.label}</Text>
              <Text style={[styles.value, over && styles.over]}>
                {formatMicro(m, t.total)}
                <Text style={styles.ref}>{`  ·  repère ${m.kind === 'max' ? '≤' : '≥'} ${formatMicro(m, m.ref)}`}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }, over && styles.fillOver]} />
            </View>
            {partial && <Text style={styles.note}>{`Connu pour ${t.known} aliment${t.known > 1 ? 's' : ''} sur ${t.count}`}</Text>}
          </View>
        );
      })}
      <Text style={styles.foot}>Repères indicatifs pour un adulte, pas un avis médical.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: 22 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  row: { marginTop: theme.spacing.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  value: { fontSize: 14, color: theme.colors.text, fontWeight: '700' },
  over: { color: theme.colors.warning ?? '#D9822B' },
  ref: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '400' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(120,120,128,0.18)', marginTop: 4, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.sprintyBlue },
  fillOver: { backgroundColor: theme.colors.warning ?? '#D9822B' },
  note: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  foot: { fontSize: 11, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
});
