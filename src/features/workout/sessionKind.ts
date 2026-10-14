/**
 * What kind of session a workout row is. Older sessions only carry a free-text `type_seance` (the coach
 * can rename a strength session "Haut du corps"), so the kind is read from `measures.kind` first, then from
 * the title, then from the shape of the sets (a set with a `distance` is a run, one with `reps`/`weight` is
 * strength). Nothing here writes data: existing rows keep working unchanged.
 */
export type SessionKind = 'strength' | 'run' | 'stairs' | 'technical' | 'competition' | 'rest' | 'other';

const KINDS: SessionKind[] = ['strength', 'run', 'stairs', 'technical', 'competition', 'rest', 'other'];

const lower = (v: unknown) => String(v ?? '').toLowerCase();

export function sessionKindOf(workout: any): SessionKind {
  const declared = workout?.measures?.kind;
  if (typeof declared === 'string' && (KINDS as string[]).includes(declared)) return declared as SessionKind;

  const t = lower(workout?.type_seance ?? workout?.name);
  if (t.includes('repos')) return 'rest';
  if (t.startsWith('comp')) return 'competition';
  if (t.includes('technique')) return 'technical';
  if (t.includes('escalier')) return 'stairs';
  if (t.includes('muscu') || t.includes('force') || t.includes('strength')) return 'strength';
  if (/(course|sprint|piste|côte|cote)/.test(t)) return 'run';

  const blocks: any[] = Array.isArray(workout?.blocks) && workout.blocks.length
    ? workout.blocks
    : [{ exercises: Array.isArray(workout?.exercises) ? workout.exercises : [] }];
  let hasDistance = false;
  let hasStrength = false;
  let hasSteps = false;
  for (const b of blocks) {
    for (const ex of b?.exercises || []) {
      if (ex?.catalog_id) hasStrength = true;
      for (const s of ex?.sets || []) {
        if (s?.steps != null) hasSteps = true;
        if (s?.distance) hasDistance = true;
        if (s?.reps != null || s?.weight != null) hasStrength = true;
      }
    }
  }
  if (hasSteps) return 'stairs';
  if (hasStrength && !hasDistance) return 'strength';
  if (hasDistance) return 'run';
  return 'other';
}

/** Data-entry category of the athlete's result sheet. */
export function entryCategoryOf(workout: any): 'muscu' | 'course' | 'other' {
  const k = sessionKindOf(workout);
  if (k === 'strength') return 'muscu';
  if (k === 'run') return 'course';
  return 'other';
}

/** Canonical label stored in athlete_efforts.exercise_category (readers match /muscu|force|piste|côte/...). */
export function effortCategoryOf(workout: any): string {
  const title = String(workout?.type_seance ?? '').trim();
  const k = sessionKindOf(workout);
  if (k === 'strength') return /muscu|force/i.test(title) ? title : 'Musculation';
  if (k === 'run') return /piste|côte|cote|sprint|course/i.test(title) ? title : 'Piste';
  return title || 'Général';
}
