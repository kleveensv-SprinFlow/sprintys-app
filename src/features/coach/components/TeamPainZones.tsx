import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../../core/theme';
import { glassCard } from '../../../core/glass';
import { supabase } from '../../../services/supabase';
import { intensityColor } from '../../checkin/painTaxonomy';
import { summarizePains } from '../../checkin/painHistory';

interface TeamPainZonesProps {
  members: { id: string; name: string }[];
  today: string;
  /** Recharger quand la feuille s'ouvre. */
  active: boolean;
}

const WINDOW = 7;
const MAX_ROWS = 5;

/**
 * « Zones qui reviennent » : les zones douloureuses de l'équipe sur 7 jours, triées par nombre d'athlètes,
 * pour repérer un problème collectif (charge, surface, chaussures…). Rien n'apparaît si tout va bien.
 */
export const TeamPainZones = ({ members, today, active }: TeamPainZonesProps) => {
  const [rows, setRows] = useState<{ athlete_id: string; date: string; pains: unknown }[]>([]);
  const ids = useMemo(() => members.map((m) => m.id), [members]);

  useEffect(() => {
    if (!active || ids.length === 0) return;
    let alive = true;
    const since = new Date(`${today}T12:00:00`);
    since.setDate(since.getDate() - (WINDOW - 1));
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())}`;
    supabase
      .from('check_ins')
      .select('athlete_id, date, pains')
      .in('athlete_id', ids)
      .gte('date', from)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.warn('Zones de douleur de l’équipe indisponibles', error);
          return;
        }
        setRows(data || []);
      });
    return () => {
      alive = false;
    };
  }, [active, ids, today]);

  const zones = useMemo(() => {
    const names = new Map(members.map((m) => [m.id, m.name]));
    const agg = new Map<string, { label: string; athletes: string[]; max: number; persistent: number }>();
    for (const id of ids) {
      const trends = summarizePains(rows.filter((r) => r.athlete_id === id), today, WINDOW);
      for (const t of trends) {
        const z = agg.get(t.key) ?? { label: t.label, athletes: [], max: 0, persistent: 0 };
        z.athletes.push(names.get(id) ?? 'Athlète');
        z.max = Math.max(z.max, t.maxIntensity);
        if (t.persistent) z.persistent += 1;
        agg.set(t.key, z);
      }
    }
    return [...agg.values()].sort((a, b) => b.athletes.length - a.athletes.length || b.max - a.max).slice(0, MAX_ROWS);
  }, [rows, ids, members, today]);

  if (zones.length === 0) return null;

  return (
    <View style={[glassCard, styles.card]}>
      <View style={styles.head}>
        <Feather name="crosshair" size={15} color={theme.colors.textSecondary} />
        <Text style={styles.title}>Zones qui reviennent · 7 jours</Text>
      </View>
      {zones.map((z) => (
        <View key={z.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: intensityColor(z.max).css }]} />
          <View style={styles.body}>
            <Text style={styles.label} numberOfLines={1}>
              {z.label}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {z.athletes.length} athlète{z.athletes.length > 1 ? 's' : ''} · max {z.max}/10
              {z.persistent > 0 ? ` · ${z.persistent} persistante${z.persistent > 1 ? 's' : ''}` : ''} · {z.athletes.join(', ')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: theme.colors.text, letterSpacing: -0.1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  body: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
});
