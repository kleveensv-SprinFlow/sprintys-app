/**
 * Weight line of the home « Ma progression » card: latest weighing, how old it is, change over 30 days.
 * The change uses the same rule as the Body screen on its « 1M » range (latest minus the first weighing of the
 * last 30 days), so both screens always show the same number.
 */

const DAY = 86400000;

export interface WeightPoint {
  weight?: number | null;
  created_at?: string | null;
}

export interface WeightSummary {
  value: number;
  /** « aujourd’hui », « hier », « il y a 6 jours » */
  when: string;
  daysAgo: number;
  /** More than a week old: the + button is highlighted and the line says so */
  stale: boolean;
  /** Latest minus the first weighing of the last 30 days; null with fewer than two of them, or when negligible */
  diff: number | null;
}

/** Whole calendar days between two instants (local midnight to local midnight). */
export function calendarDaysAgo(from: Date, now: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((b - a) / DAY));
}

export function relativeDay(daysAgo: number): string {
  if (daysAgo <= 0) return 'aujourd’hui';
  if (daysAgo === 1) return 'hier';
  return `il y a ${daysAgo} jours`;
}

/** Metrics are expected oldest first (as the body store returns them). Entries without weight or date are ignored. */
export function summarizeWeight(metrics: WeightPoint[], now: Date = new Date()): WeightSummary | null {
  const points = metrics
    .filter((m): m is { weight: number; created_at: string } => m.weight != null && !!m.created_at && !Number.isNaN(new Date(m.created_at).getTime()))
    .map((m) => ({ weight: Number(m.weight), t: new Date(m.created_at).getTime() }))
    .sort((a, b) => a.t - b.t);
  if (!points.length) return null;

  const latest = points[points.length - 1];
  const daysAgo = calendarDaysAgo(new Date(latest.t), now);

  let diff: number | null = null;
  const windowStart = now.getTime() - 30 * DAY;
  const inWindow = points.filter((p) => p.t >= windowStart);
  if (inWindow.length > 1) {
    const d = latest.weight - inWindow[0].weight;
    diff = Math.abs(d) >= 0.05 ? d : null;
  }

  return { value: latest.weight, when: relativeDay(daysAgo), daysAgo, stale: daysAgo > 7, diff };
}
