import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { PressableScale } from '../../../shared/components/PressableScale';
import type { CheckInData } from '../../../services/checkInService';
import { BodyMap3D } from './BodyMap3D';
import { MeshSide } from '../bodyZones';
import { intensityColor } from '../painTaxonomy';
import { PainTrend, sinceLabel, summarizePains, trendsToPains } from '../painHistory';

interface CoachPainSummaryProps {
  history: CheckInData[];
  today: string;
  athleteName: string;
  windowDays?: number;
}

const toMeshSide = (side: PainTrend['side']): MeshSide => (side === 'Gauche' ? 'G' : side === 'Droit' ? 'D' : 'X');

/**
 * Fiche athlète, côté coach : les douleurs des N derniers jours sur le corps 3D (intensité max par zone)
 * et la liste détaillée, les douleurs qui durent en premier.
 */
export const CoachPainSummary = ({ history, today, athleteName, windowDays = 14 }: CoachPainSummaryProps) => {
  const theme = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [map3d, setMap3d] = useState(true);

  const trends = useMemo(() => {
    const all = summarizePains(history, today, windowDays);
    return [...all.filter((t) => t.persistent), ...all.filter((t) => !t.persistent)];
  }, [history, today, windowDays]);
  const pains = useMemo(() => trendsToPains(trends), [trends]);
  const selectedTrend = trends.find((t) => t.key === selectedKey);

  if (trends.length === 0) {
    return (
      <View style={[glassCard, styles.card]}>
        <View style={styles.emptyRow}>
          <Feather name="check-circle" size={18} color={theme.colors.success} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Aucune douleur signalée par {athleteName} sur les {windowDays} derniers jours.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[glassCard, styles.card]}>
      {map3d && (
        <BodyMap3D
          pains={pains}
          gestures="tapOnly"
          height={340}
          selected={selectedTrend ? { zoneId: selectedTrend.zoneId, side: toMeshSide(selectedTrend.side) } : null}
          onSelectZone={(zoneId, side) => {
            const match =
              trends.find((t) => t.zoneId === zoneId && toMeshSide(t.side) === side) ??
              trends.find((t) => t.zoneId === zoneId);
            setSelectedKey(match ? match.key : null);
          }}
          onUnavailable={() => setMap3d(false)}
        />
      )}

      <View style={styles.list}>
        {trends.map((t) => {
          const active = t.key === selectedKey;
          const c = intensityColor(t.maxIntensity).css;
          return (
            <PressableScale
              key={t.key}
              haptic="selection"
              activeScale={0.98}
              onPress={() => setSelectedKey(active ? null : t.key)}
              style={[styles.row, { borderColor: active ? theme.colors.sprintyBlue : theme.colors.hairline }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${t.label}, ${t.days} jour${t.days > 1 ? 's' : ''} sur ${windowDays}, jusqu’à ${t.maxIntensity} sur 10`}
            >
              <View style={[styles.dot, { backgroundColor: c }]} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {t.label}
                  </Text>
                  {t.persistent && (
                    <View style={[styles.tag, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <Text style={[styles.tagText, { color: '#B91C1C' }]}>Persistante</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>
                  {t.days} jour{t.days > 1 ? 's' : ''} sur {windowDays} · max {t.maxIntensity}/10 · dernier : {t.lastIntensity}/10, {sinceLabel(t.lastDate, today)}
                </Text>
                {!!t.lastComment && active && (
                  <Text style={[styles.comment, { color: theme.colors.text }]}>« {t.lastComment} »</Text>
                )}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text style={[styles.note, { color: theme.colors.textMuted }]}>
        Couleur = intensité la plus forte sur la période. Ce sont des ressentis déclarés, pas un diagnostic.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 12, gap: 12 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6 },
  emptyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  list: { gap: 8 },
  row: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flexShrink: 1, fontSize: 15, fontWeight: '700' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '800' },
  rowSub: { fontSize: 13, lineHeight: 18 },
  comment: { fontSize: 13, lineHeight: 18, fontStyle: 'italic', marginTop: 2 },
  note: { fontSize: 11, lineHeight: 15, paddingHorizontal: 4 },
});
