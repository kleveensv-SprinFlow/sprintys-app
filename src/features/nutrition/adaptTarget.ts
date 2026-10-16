import { classifyObjective } from './calorieTarget';

export interface WeightPoint {
  date: string; // ISO
  weight: number;
}

export type AdaptStatus = 'insufficient' | 'on_track' | 'adjust';

export interface AdaptResult {
  status: AdaptStatus;
  /** Observed trend in kg per week (negative = losing). */
  observed: number | null;
  /** Wanted trend in kg per week. */
  expected: number;
  /** Calories to add (+) or remove (−) per day, rounded to 50, at most 200. */
  deltaKcal: number;
  newTarget: number;
  /** Why nothing is proposed yet. */
  reason?: 'few_weighins' | 'short_period';
}

const DAY = 86400000;
const KCAL_PER_KG = 1100; // per kg/week, same rule as the calorie target (7 700 kcal per kg of tissue)
export const MIN_WEIGHINS = 3;
export const MIN_SPAN_DAYS = 10;
export const MAX_STEP = 200;

/** Least squares slope of the weight over time, in kg per week. */
export function weeklyTrend(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const t0 = new Date(points[0].date).getTime();
  const xs = points.map((p) => (new Date(p.date).getTime() - t0) / DAY);
  const ys = points.map((p) => p.weight);
  const n = points.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (den === 0) return null;
  const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  return (num / den) * 7;
}

/**
 * Compares the real weight trend of the last three weeks with the wanted pace and proposes a small change of the
 * daily calories. Pure: no I/O, easy to test. Never goes under the safety floor of the calorie target.
 */
export function adaptTarget(input: {
  objective?: string | null;
  currentTarget: number;
  /** Wanted pace in kg per week, positive number (the sign comes from the objective). */
  weeklyKg?: number | null;
  weights: WeightPoint[];
  now?: Date;
  floor?: number;
  isMinor?: boolean;
}): AdaptResult {
  const now = (input.now ?? new Date()).getTime();
  const kind = classifyObjective(input.objective || '');
  const pace = Math.abs(Number(input.weeklyKg) || 0);
  const expected = kind === 'cut' ? -pace : kind === 'bulk' ? pace : 0;
  const floor = input.floor ?? 1200;

  // Sécurité mineurs (Règle N1) : pas d'adaptation baissière pour les mineurs
  if (input.isMinor) {
    return {
      status: 'insufficient',
      observed: null,
      expected: 0,
      deltaKcal: 0,
      newTarget: input.currentTarget,
    };
  }

  const recent = input.weights
    .filter((w) => Number.isFinite(w.weight) && now - new Date(w.date).getTime() <= 21 * DAY)
    .sort((a, b) => a.date.localeCompare(b.date));
  const base: AdaptResult = { status: 'insufficient', observed: null, expected, deltaKcal: 0, newTarget: input.currentTarget };

  if (recent.length < MIN_WEIGHINS) return { ...base, reason: 'few_weighins' };
  const span = (new Date(recent[recent.length - 1].date).getTime() - new Date(recent[0].date).getTime()) / DAY;
  if (span < MIN_SPAN_DAYS) return { ...base, reason: 'short_period' };

  const observed = weeklyTrend(recent);
  if (observed == null) return { ...base, reason: 'few_weighins' };

  // Too slow a loss (or too fast a gain) means fewer calories; the opposite means more.
  const gap = observed - expected;
  let delta = -gap * KCAL_PER_KG;
  delta = Math.max(-MAX_STEP, Math.min(MAX_STEP, Math.round(delta / 50) * 50));
  // Maintenance and recomposition tolerate a wider drift before anything is suggested
  const tolerance = kind === 'maintain' || kind === 'recomp' ? 0.25 : 0.15;
  if (Math.abs(gap) < tolerance || Math.abs(delta) < 50) return { ...base, status: 'on_track', observed, deltaKcal: 0 };

  let newTarget = input.currentTarget + delta;
  if (newTarget < floor) {
    newTarget = floor;
    delta = floor - input.currentTarget;
    if (delta >= 0) return { ...base, status: 'on_track', observed, deltaKcal: 0 };
  }
  return { status: 'adjust', observed, expected, deltaKcal: delta, newTarget };
}
