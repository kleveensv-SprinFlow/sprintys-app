/** Multi-week progression of a strength session: loads rise a little every week, with an optional lighter week. */

export interface ProgressionOptions {
  /** Number of weeks including the original one (2 to 12) */
  weeks: number;
  /** 'percent': each week adds step % of the load; 'kg': adds step kilos (or % points for "% 1RM" sets) */
  mode: 'percent' | 'kg';
  step: number;
  /** Every Nth week is lighter (0 = never) */
  deloadEvery: number;
  /** Load of a lighter week relative to the previous heavy week */
  deloadFactor?: number;
}

export interface WeekPlan {
  /** 0 = the original week */
  week: number;
  /** Number of progression steps applied (a lighter week repeats the level before it) */
  level: number;
  deload: boolean;
}

export function planWeeks(o: ProgressionOptions): WeekPlan[] {
  const out: WeekPlan[] = [];
  let level = 0;
  for (let w = 0; w < o.weeks; w++) {
    const deload = o.deloadEvery > 0 && w > 0 && (w + 1) % o.deloadEvery === 0;
    if (w > 0 && !deload) level += 1;
    out.push({ week: w, level, deload });
  }
  return out;
}

const roundTo = (v: number, unit: number) => Math.round(v / unit) * unit;

/** New load for a set. Undefined when the set has no numeric load (bodyweight, free). */
export function progressedLoad(weight: unknown, weightType: string | undefined, plan: WeekPlan, o: ProgressionOptions): number | undefined {
  const w = parseFloat(String(weight ?? '').replace('%', '').replace(',', '.'));
  if (!Number.isFinite(w) || w <= 0) return undefined;
  const isPercent1rm = weightType === 'percent_1rm' || String(weight).includes('%');
  const factor = o.deloadFactor ?? 0.9;
  let next: number;
  if (o.mode === 'percent') next = w * (1 + (o.step / 100) * plan.level);
  else next = w + o.step * plan.level;
  if (plan.deload) {
    // A lighter week: the previous level, reduced
    const prevLevel = plan.level;
    const base = o.mode === 'percent' ? w * (1 + (o.step / 100) * prevLevel) : w + o.step * prevLevel;
    next = base * factor;
  }
  // Bars take 1,25 kg plates; a "% 1RM" is kept to whole percents
  return isPercent1rm ? Math.max(1, Math.round(next)) : Math.max(2.5, roundTo(next, 1.25));
}

/** A copy of blocks / exercises with every set's load progressed. Everything else is left untouched. */
export function progressExercises<T extends { sets?: any[] }>(exercises: T[] | undefined, plan: WeekPlan, o: ProgressionOptions): T[] {
  return (exercises || []).map((ex: any) => ({
    ...ex,
    sets: (ex.sets || []).map((st: any) => {
      const type = st.weight_type || st.weightType;
      const next = progressedLoad(st.weight, type, plan, o);
      return next === undefined ? { ...st } : { ...st, weight: next };
    }),
  }));
}

export function progressBlocks(blocks: any[] | undefined, plan: WeekPlan, o: ProgressionOptions): any[] {
  return (blocks || []).map((b) => ({ ...b, exercises: progressExercises(b.exercises, plan, o) }));
}
