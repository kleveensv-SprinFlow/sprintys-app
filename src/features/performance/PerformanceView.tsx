import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { glassCard } from '../../core/glass';
import { GlassSheen } from '../../shared/components/GlassSheen';
import { PressableScale } from '../../shared/components/PressableScale';
import { EmptyState } from '../../shared/components/EmptyState';
import { SkeletonCard } from '../../shared/components/Skeleton';
import { WeightAreaChart } from '../body/components/WeightChart';
import { performanceService, AthletePerformance, PerfSeries } from '../../services/performanceService';
import { formatValue, shortDate, loadZone } from './format';
import { MaxesBlock } from './MaxesBlock';
import { useAuthStore } from '../../store/authStore';
import { exportAthleteReport } from './reportPdf';
import { toast } from '../../shared/feedback/appAlert';

interface Props {
  athleteId: string;
  /** 'summary' is the short block of a profile; 'full' is the whole screen. */
  mode?: 'summary' | 'full';
  /** Who is looking: only changes the wording of empty states. */
  audience?: 'athlete' | 'coach';
  onSeeAll?: () => void;
  /** Opens the weekly report (Sprinty) for this athlete */
  onWeeklyReport?: () => void;
  refreshKey?: number;
  /** Name on the exported report (the coach's athlete; the athlete's own name is read from the account) */
  athleteName?: string;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const weekLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const PerformanceView: React.FC<Props> = ({ athleteId, mode = 'full', audience = 'athlete', onSeeAll, onWeeklyReport, refreshKey = 0, athleteName }) => {
  const theme = useTheme();
  const me = useAuthStore((st) => st.user);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<AthletePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Only the latest request may write the state (switching athlete or refreshing quickly)
  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(false);
    try {
      const res = await performanceService.fetch(athleteId, 8);
      if (mine === seq.current) setData(res);
    } catch {
      if (mine === seq.current) setError(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    setData(null);
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const blue = theme.colors.sprintyBlue;
  const gold = '#F59E0B';
  const toneColor = (tone: string) =>
    tone === 'good' ? theme.colors.success : tone === 'warn' ? theme.colors.warning : tone === 'bad' ? theme.colors.error : theme.colors.textSecondary;

  if (loading && !data) {
    return (
      <View>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[glassCard, styles.card]}>
        <EmptyState
          compact
          icon="wifi-off"
          title="Impossible de charger la performance"
          message="Vérifie ta connexion et réessaie."
          actionLabel="Réessayer"
          onAction={load}
        />
      </View>
    );
  }

  const d = data;
  const hasAnything = !!d && (d.records.length > 0 || d.weekly.some((w) => w.planned > 0));
  if (!d || !hasAnything) {
    return (
      <View style={[glassCard, styles.card]}>
        <GlassSheen radius={22} />
        <EmptyState
          compact
          icon="trending-up"
          title="Pas encore de données"
          message={
            audience === 'coach'
              ? 'Les records et la progression apparaîtront dès que l’athlète aura saisi ses résultats.'
              : 'Saisis tes chronos et tes charges à la fin de tes séances : tes records et ta progression apparaîtront ici.'
          }
        />
      </View>
    );
  }

  const zone = loadZone(d.load.ratio);
  const recentSet = new Set(d.recent_prs.map((r) => r.label));
  const last2 = d.weekly.slice(-2);
  const planned2 = last2.reduce((a, w) => a + w.planned, 0);
  const done2 = last2.reduce((a, w) => a + w.done, 0);

  const prBanner = d.recent_prs.length > 0 && (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.headerRow}>
        <Feather name="award" size={15} color={gold} />
        <Text style={[styles.headerLabel, { color: gold }]}>Records battus ces 14 derniers jours</Text>
      </View>
      {d.recent_prs.slice(0, mode === 'summary' ? 3 : 6).map((r) => (
        <View key={`${r.label}${r.date}`} style={styles.prRow}>
          <Text style={[styles.prLabel, { color: theme.colors.text }]} numberOfLines={1}>{r.label}</Text>
          <Text style={[styles.prValue, { color: gold }]}>{formatValue(r.value, r.unit)}</Text>
          <Text style={[styles.prDate, { color: theme.colors.textMuted }]}>{shortDate(r.date)}</Text>
        </View>
      ))}
    </View>
  );

  const loadBlock = (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.headerRow}>
        <Feather name="activity" size={15} color={blue} />
        <Text style={[styles.headerLabel, { color: blue }]}>Charge et assiduité</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{planned2 > 0 ? `${done2}/${planned2}` : '–'}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Séances validées{'\n'}(2 semaines)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{d.load.ratio != null ? d.load.ratio.toFixed(2).replace('.', ',') : '–'}</Text>
          <Text style={[styles.statLabel, { color: toneColor(zone.tone) }]}>{zone.label}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{d.form.avg7 != null ? `${d.form.avg7}` : '–'}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Forme moyenne{'\n'}(7 jours)</Text>
        </View>
      </View>
      {d.load.ratio == null && (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {audience === 'coach'
            ? 'La charge se calcule avec l’effort ressenti et la durée que l’athlète renseigne en validant ses séances.'
            : 'Renseigne l’effort ressenti et la durée en validant tes séances : ta charge d’entraînement se calculera toute seule.'}
        </Text>
      )}
      {mode === 'full' && (
        <View style={styles.weeks}>
          {d.weekly.map((w) => {
            const ratio = w.planned > 0 ? Math.min(1, w.done / w.planned) : 0;
            return (
              <View key={w.week_start} style={styles.weekCol}>
                <View style={[styles.weekTrack, { backgroundColor: theme.colors.glassFill }]}>
                  <View
                    style={[
                      styles.weekFill,
                      { height: `${Math.round(ratio * 100)}%`, backgroundColor: ratio >= 1 ? theme.colors.success : blue },
                    ]}
                  />
                </View>
                <Text style={[styles.weekNum, { color: theme.colors.text }]}>{w.planned > 0 ? `${w.done}/${w.planned}` : '–'}</Text>
                <Text style={[styles.weekDate, { color: theme.colors.textMuted }]}>{weekLabel(w.week_start)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const records = d.records.slice(0, mode === 'summary' ? 4 : d.records.length);
  const recordsBlock = records.length > 0 && (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.headerRow}>
        <Feather name="award" size={15} color={blue} />
        <Text style={[styles.headerLabel, { color: blue }]}>Records</Text>
      </View>
      {records.map((r, i) => (
        <View key={r.key} style={[styles.recordRow, i > 0 && { borderTopColor: theme.colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recordLabel, { color: theme.colors.text }]} numberOfLines={1}>{r.label}</Text>
            <Text style={[styles.recordMeta, { color: theme.colors.textMuted }]}>
              {shortDate(r.date)} · {r.count} résultat{r.count > 1 ? 's' : ''}
            </Text>
          </View>
          {(r.recent_pr || recentSet.has(r.label)) && <Feather name="award" size={15} color={gold} style={{ marginRight: 8 }} />}
          <Text style={[styles.recordValue, { color: theme.colors.text }]}>{formatValue(r.value, r.unit)}</Text>
        </View>
      ))}
    </View>
  );

  const seriesBlock = mode === 'full' && d.series.length > 0 && (
    <View>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Progression</Text>
      {d.series.map((s) => (
        <SeriesCard key={s.key} s={s} />
      ))}
    </View>
  );

  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const own = audience === 'athlete' ? me?.name || [me?.firstName, me?.lastName].filter(Boolean).join(' ') : '';
      const name = athleteName || own || 'Athlète';
      await exportAthleteReport({ athleteId, athleteName: name, audience });
    } catch {
      toast('error', 'Impossible de créer le bilan. Vérifie ta connexion et réessaie.');
    } finally {
      setExporting(false);
    }
  };

  const exportBlock = mode === 'full' && (
    <PressableScale
      haptic="light"
      onPress={doExport}
      disabled={exporting}
      accessibilityRole="button"
      accessibilityLabel="Exporter le bilan en PDF"
      style={[glassCard, styles.seeAll, exporting && { opacity: 0.6 }]}
    >
      <Text style={[styles.seeAllText, { color: blue }]}>{exporting ? 'Création du bilan…' : 'Exporter le bilan (PDF)'}</Text>
      <Feather name="share" size={16} color={blue} />
    </PressableScale>
  );

  return (
    <View>
      {prBanner}
      {mode === 'summary' ? (
        <>
          {loadBlock}
          {recordsBlock}
          {onSeeAll && (
            <PressableScale onPress={onSeeAll} accessibilityRole="button" style={[glassCard, styles.seeAll]}>
              <Text style={[styles.seeAllText, { color: blue }]}>Voir toute la performance</Text>
              <Feather name="chevron-right" size={16} color={blue} />
            </PressableScale>
          )}
          {onWeeklyReport && (
            <PressableScale onPress={onWeeklyReport} accessibilityRole="button" style={[glassCard, styles.seeAll]}>
              <Text style={[styles.seeAllText, { color: blue }]}>Bilan de la semaine avec Sprinty</Text>
              <Feather name="file-text" size={16} color={blue} />
            </PressableScale>
          )}
        </>
      ) : (
        <>
          {recordsBlock}
          <MaxesBlock athleteId={athleteId} audience={audience} />
          {seriesBlock}
          {loadBlock}
          {exportBlock}
        </>
      )}
    </View>
  );
};

const SeriesCard: React.FC<{ s: PerfSeries }> = ({ s }) => {
  const theme = useTheme();
  const values = s.points.map((p) => p.value);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const improved = s.better === 'lower' ? delta < 0 : delta > 0;
  const flat = Math.abs(delta) < 0.005;
  const color = flat ? theme.colors.textSecondary : improved ? theme.colors.success : theme.colors.warning;
  const deltaText = flat ? 'Stable' : `${delta < 0 ? '−' : '+'}${s.unit === 's' ? Math.abs(delta).toFixed(2).replace('.', ',') + ' s' : Math.abs(delta).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' kg'}`;
  return (
    <View style={[glassCard, styles.card]}>
      <GlassSheen radius={22} />
      <View style={styles.seriesTop}>
        <Text style={[styles.recordLabel, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>{s.label}</Text>
        <Text style={[styles.recordValue, { color: theme.colors.text }]}>{formatValue(last, s.unit)}</Text>
      </View>
      <View style={styles.seriesMeta}>
        <Text style={[styles.recordMeta, { color: theme.colors.textMuted }]}>
          {shortDate(s.points[0].date)} → {shortDate(s.points[s.points.length - 1].date)}
        </Text>
        <View style={[styles.deltaChip, { backgroundColor: theme.colors.glassFill }]}>
          <Feather name={flat ? 'minus' : improved ? 'trending-up' : 'trending-down'} size={12} color={color} />
          <Text style={[styles.deltaText, { color }]}>{deltaText}</Text>
        </View>
      </View>
      <WeightAreaChart values={s.better === 'lower' ? values.map((v) => -v) : values} color={color} height={84} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  headerLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginHorizontal: 20, marginTop: 6, marginBottom: 10 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  prLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  prValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  prDate: { fontSize: 12, fontWeight: '600', width: 40, textAlign: 'right' },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  recordLabel: { fontSize: 15, fontWeight: '700' },
  recordMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  recordValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 3, lineHeight: 15 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  weeks: { flexDirection: 'row', gap: 6, marginTop: 16 },
  weekCol: { flex: 1, alignItems: 'center' },
  weekTrack: { width: '70%', height: 64, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  weekFill: { width: '100%', borderRadius: 8 },
  weekNum: { fontSize: 11, fontWeight: '700', marginTop: 5, fontVariant: ['tabular-nums'] },
  weekDate: { fontSize: 9.5, fontWeight: '500', marginTop: 1 },
  seriesTop: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  seriesMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 8 },
  deltaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  deltaText: { fontSize: 12, fontWeight: '700' },
  seeAll: { marginHorizontal: 16, marginBottom: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAllText: { fontSize: 15, fontWeight: '700' },
});
