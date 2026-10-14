// deno-lint-ignore-file no-explicit-any
/**
 * Proposed sessions: the model's output is never trusted as-is. Everything is clamped to sane ranges here, and the
 * app converts the result into the same payloads as the session builders.
 */

export type SessionKind = 'run' | 'strength' | 'stairs' | 'technical' | 'rest' | 'competition' | 'mobility';

export interface RunBlock { name: string; reps: number; distance_m: number; intensity_pct: number; rest_s: number; rest_after_s: number }
export interface StrengthItem { name: string; sets: number; reps: number; weight_kg: number | null; percent_1rm: number | null; rest_s: number }
export interface MobilityStep { name: string; detail: string }
export interface StairsItem { name: string; sets: number; reps: number; steps: number; rest_s: number }

export interface Session {
  date: string;
  kind: SessionKind;
  title: string;
  surface: 'piste' | 'cote' | null;
  notes: string;
  location: string;
  run_blocks: RunBlock[];
  strength: StrengthItem[];
  stairs: StairsItem[];
  steps: MobilityStep[];
}

export interface Caps {
  maxRunIntensity: number;
  maxPercent1rm: number;
  allowCompetition: boolean;
  /** Athletes with a coach: only gentle recovery sessions (mobility, stretching, breathing). */
  recoveryOnly?: boolean;
}

const KINDS: SessionKind[] = ['run', 'strength', 'stairs', 'technical', 'rest', 'competition', 'mobility'];

const num = (v: any, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
};
const int = (v: any, min: number, max: number, fallback: number) => Math.round(num(v, min, max, fallback));
const text = (v: any, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const isIsoDate = (s: any): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Returns a clean session or null when it is unusable. */
export function normalizeSession(raw: any, caps: Caps, minDate: string, maxDate: string): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind: SessionKind = KINDS.includes(raw.kind) ? raw.kind : 'technical';
  if (!isIsoDate(raw.date) || raw.date < minDate || raw.date > maxDate) return null;
  if (kind === 'competition' && !caps.allowCompetition) return null;
  if (caps.recoveryOnly && kind !== 'mobility') return null;

  const session: Session = {
    date: raw.date,
    kind,
    title: text(raw.title, 80) || defaultTitle(kind),
    surface: kind === 'run' ? (raw.surface === 'cote' ? 'cote' : 'piste') : null,
    notes: text(raw.notes, 1200),
    location: kind === 'competition' ? text(raw.location, 120) : '',
    run_blocks: [],
    strength: [],
    stairs: [],
    steps: [],
  };

  if (kind === 'run') {
    session.run_blocks = (Array.isArray(raw.run_blocks) ? raw.run_blocks : []).slice(0, 8).map((b: any, i: number) => ({
      name: text(b?.name, 60) || `Bloc ${i + 1}`,
      reps: int(b?.reps, 1, 30, 1),
      distance_m: int(b?.distance_m, 10, 10000, 100),
      intensity_pct: int(b?.intensity_pct, 50, caps.maxRunIntensity, Math.min(80, caps.maxRunIntensity)),
      rest_s: int(b?.rest_s, 0, 1200, 120),
      rest_after_s: int(b?.rest_after_s, 0, 1800, 300),
    }));
    if (!session.run_blocks.length) return null;
  }
  if (kind === 'strength') {
    session.strength = (Array.isArray(raw.strength) ? raw.strength : []).slice(0, 10).map((e: any) => {
      const pct = e?.percent_1rm != null ? int(e.percent_1rm, 30, caps.maxPercent1rm, Math.min(70, caps.maxPercent1rm)) : null;
      return {
        name: text(e?.name, 60) || 'Exercice',
        sets: int(e?.sets, 1, 10, 3),
        reps: int(e?.reps, 1, 30, 8),
        weight_kg: pct == null && e?.weight_kg != null ? num(e.weight_kg, 0, 400, 0) : null,
        percent_1rm: pct,
        rest_s: int(e?.rest_s, 0, 600, 120),
      };
    });
    if (!session.strength.length) return null;
  }
  if (kind === 'stairs') {
    session.stairs = (Array.isArray(raw.stairs) ? raw.stairs : []).slice(0, 8).map((e: any) => ({
      name: text(e?.name, 60) || 'Montées',
      sets: int(e?.sets, 1, 10, 3),
      reps: int(e?.reps, 1, 30, 4),
      steps: int(e?.steps, 5, 300, 30),
      rest_s: int(e?.rest_s, 0, 600, 90),
    }));
    if (!session.stairs.length) return null;
  }
  if (kind === 'mobility') {
    session.steps = (Array.isArray(raw.steps) ? raw.steps : []).slice(0, 12).map((e: any) => ({
      name: text(e?.name, 60) || 'Exercice',
      detail: text(e?.detail, 60),
    }));
    if (!session.steps.length) return null;
  }
  return session;
}

function defaultTitle(kind: SessionKind) {
  return {
    run: 'Course',
    strength: 'Musculation',
    stairs: 'Escaliers',
    technical: 'Technique',
    rest: 'Repos',
    competition: 'Compétition',
    mobility: 'Mobilité',
  }[kind];
}

/** One line per session, for the model's own summary. */
export function describeSession(s: Session): string {
  if (s.kind === 'run') {
    return `${s.date} ${s.title} : ${s.run_blocks.map((b) => `${b.reps}×${b.distance_m} m à ${b.intensity_pct} %`).join(' + ')}`;
  }
  if (s.kind === 'strength') {
    return `${s.date} ${s.title} : ${s.strength.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(', ')}`;
  }
  if (s.kind === 'stairs') {
    return `${s.date} ${s.title} : ${s.stairs.map((e) => `${e.sets}×${e.reps} ${e.name}`).join(', ')}`;
  }
  if (s.kind === 'mobility') {
    return `${s.date} ${s.title} : ${s.steps.map((e) => e.name).join(', ')}`;
  }
  return `${s.date} ${s.title}`;
}
