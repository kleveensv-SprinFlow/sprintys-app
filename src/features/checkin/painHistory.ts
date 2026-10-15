/**
 * Résumé des douleurs sur plusieurs check-ins, pour le coach : par zone ET par côté, combien de jours,
 * intensité max et dernière, et si la douleur « dure » (même règle que l'alerte get_team_alerts :
 * au moins 3 jours sur les 7 derniers).
 */
import type { PainInfo } from '../../services/checkInService';
import { painKey } from './painTaxonomy';
import { zoneById, zoneLabel } from './bodyZones';

export interface PainTrend {
  key: string;
  zoneId: string;
  side: PainInfo['side'];
  label: string;
  days: number;
  daysLast7: number;
  maxIntensity: number;
  lastIntensity: number;
  lastDate: string;
  lastComment?: string;
  persistent: boolean;
}

export const PERSISTENT_DAYS = 3;

const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000);

export const summarizePains = (
  checkIns: { date: string; pains?: unknown }[],
  today: string,
  windowDays = 14
): PainTrend[] => {
  const byKey = new Map<string, PainTrend & { dates: Set<string> }>();
  const sorted = [...checkIns].sort((a, b) => (a.date < b.date ? -1 : 1)); // ancien -> récent
  for (const ci of sorted) {
    const age = dayDiff(ci.date, today);
    if (age < 0 || age >= windowDays || !Array.isArray(ci.pains)) continue;
    for (const raw of ci.pains as PainInfo[]) {
      if (!raw || typeof raw !== 'object' || !raw.muscle_id) continue;
      const key = painKey(raw);
      const t = byKey.get(key) ?? {
        key,
        zoneId: raw.muscle_id,
        side: raw.side,
        label: zoneById(raw.muscle_id) ? zoneLabel(raw.muscle_id, raw.side) : raw.muscle_name || raw.muscle_id,
        days: 0,
        daysLast7: 0,
        maxIntensity: 0,
        lastIntensity: 0,
        lastDate: ci.date,
        persistent: false,
        dates: new Set<string>(),
      };
      if (!t.dates.has(ci.date)) {
        t.dates.add(ci.date);
        t.days += 1;
        if (age < 7) t.daysLast7 += 1;
      }
      t.maxIntensity = Math.max(t.maxIntensity, raw.intensity || 0);
      t.lastIntensity = raw.intensity || 0;
      t.lastDate = ci.date;
      if (raw.comment) t.lastComment = raw.comment;
      byKey.set(key, t);
    }
  }
  return [...byKey.values()]
    .map(({ dates, ...t }) => ({ ...t, persistent: t.daysLast7 >= PERSISTENT_DAYS }))
    .sort((a, b) => (a.lastDate !== b.lastDate ? (a.lastDate < b.lastDate ? 1 : -1) : b.maxIntensity - a.maxIntensity));
};

/** Douleurs à colorer sur la carte du coach : une par zone/côté, à son intensité max sur la période. */
export const trendsToPains = (trends: PainTrend[]): PainInfo[] =>
  trends.map((t) => ({
    muscle_id: t.zoneId,
    muscle_name: zoneById(t.zoneId)?.name ?? t.zoneId,
    side: t.side,
    intensity: t.maxIntensity,
    type: '',
  }));

/** « aujourd'hui », « hier », « il y a 3 j ». */
export const sinceLabel = (date: string, today: string) => {
  const d = dayDiff(date, today);
  return d <= 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} j`;
};
