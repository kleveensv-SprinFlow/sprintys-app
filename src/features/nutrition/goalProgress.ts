import { classifyObjective, CalorieGoal } from './calorieTarget';

export interface GoalProgress {
  kind: CalorieGoal;
  /** 0 to 1 */
  progress: number;
  start: number;
  current: number;
  target: number | null;
  /** Signed kg still to go in the direction of the goal (0 when reached). */
  remainingKg: number | null;
  reached: boolean;
  /** Weeks left at the chosen pace, when a pace is set. */
  weeksLeft: number | null;
  /** Maintain / recomposition: within one kilo of the reference weight. */
  inZone: boolean;
  /** The weight moves against the goal. */
  wrongWay: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Where the athlete stands between the starting weight and the target. Pure, so it can be tested. */
export function computeGoalProgress(input: {
  objective?: string | null;
  startWeight?: number | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  weeklyKg?: number | null;
}): GoalProgress | null {
  const current = Number(input.currentWeight);
  if (!Number.isFinite(current) || current <= 0) return null;
  const kind = classifyObjective(input.objective || '');
  const startRaw = Number(input.startWeight);
  const start = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : current;
  const targetRaw = Number(input.targetWeight);
  const target = Number.isFinite(targetRaw) && targetRaw > 0 ? targetRaw : null;
  const pace = Math.abs(Number(input.weeklyKg)) || 0;

  if (kind === 'maintain' || kind === 'recomp') {
    const ref = target ?? start;
    const inZone = Math.abs(current - ref) <= 1;
    return {
      kind,
      progress: inZone ? 1 : Math.max(0, 1 - (Math.abs(current - ref) - 1) / 3),
      start,
      current,
      target: ref,
      remainingKg: null,
      reached: inZone,
      weeksLeft: null,
      inZone,
      wrongWay: false,
    };
  }

  if (target == null || Math.abs(target - start) < 0.2) {
    return { kind, progress: 0, start, current, target: null, remainingKg: null, reached: false, weeksLeft: null, inZone: false, wrongWay: false };
  }

  const dir = target > start ? 1 : -1; // +1: gain, -1: loss
  const total = Math.abs(target - start);
  const done = (current - start) * dir;
  const progress = Math.max(0, Math.min(1, done / total));
  const remaining = Math.max(0, (target - current) * dir);
  const reached = remaining <= 0.05;
  return {
    kind,
    progress: reached ? 1 : progress,
    start,
    current,
    target,
    remainingKg: round1(remaining),
    reached,
    weeksLeft: !reached && pace > 0 ? Math.ceil(remaining / pace) : null,
    inZone: false,
    wrongWay: done < -0.3,
  };
}
