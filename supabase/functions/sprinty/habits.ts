// deno-lint-ignore-file no-explicit-any
/**
 * Habitudes de programmation d'un coach, déduites de ses séances (8 dernières semaines).
 * Pure (aucun import) : testée côté app avec Jest.
 */

export interface CoachHabits {
  semaines: number;
  seances: number;
  seances_par_semaine: number;
  jours_frequents: { jour: string; part_pct: number }[];
  types: { type: string; nombre: number }[];
  terrains: { terrain: string; nombre: number }[];
  formats_course: { format: string; nombre: number }[];
  intensite_course_moyenne_pct: number | null;
  exercices_muscu: { exercice: string; nombre: number; format_habituel: string | null }[];
}

// Jour de la semaine à Paris : les séances sont enregistrées en UTC (minuit à Paris = 22 h ou 23 h la veille en UTC)
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });

const top = <T>(m: Map<string, number>, n: number, make: (k: string, v: number) => T): T[] =>
  Array.from(m.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, v]) => make(k, v));

const inc = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);

/** Une séance par groupe (la copie maître du coach si elle existe). */
export function oneRowPerSession(rows: any[]): any[] {
  const by = new Map<string, any>();
  for (const w of rows ?? []) {
    const key = w?.group_assignment_id || w?.id;
    if (!key) continue;
    const cur = by.get(key);
    if (!cur || (w.measures?.is_master && !cur.measures?.is_master)) by.set(key, w);
  }
  return Array.from(by.values());
}

export function computeCoachHabits(rows: any[], weeks = 8): CoachHabits {
  const sessions = oneRowPerSession(rows).filter((w) => !/repos/i.test(String(w?.type_seance ?? '')));
  const days = new Map<string, number>();
  const types = new Map<string, number>();
  const surfaces = new Map<string, number>();
  const runFormats = new Map<string, number>();
  const lifts = new Map<string, number>();
  const liftFormats = new Map<string, Map<string, number>>();
  let intensitySum = 0;
  let intensityN = 0;

  for (const w of sessions) {
    const d = new Date(w.date_prevue);
    if (!Number.isNaN(d.getTime())) inc(days, WEEKDAY.format(d));
    const type = String(w.measures?.kind || w.type_seance || 'Séance').trim() || 'Séance';
    inc(types, type);
    const surface = w.measures?.surface;
    if (typeof surface === 'string' && surface) inc(surfaces, surface === 'cote' ? 'côte' : surface);

    for (const b of Array.isArray(w.blocks) ? w.blocks : []) {
      for (const ex of Array.isArray(b?.exercises) ? b.exercises : []) {
        const sets: any[] = Array.isArray(ex?.sets) ? ex.sets : [];
        const runSets = sets.filter((s) => Number(s?.distance) > 0);
        if (runSets.length) {
          // « 6 × 120 m » : séries de même distance dans un exercice
          const byDist = new Map<number, number>();
          for (const s of runSets) byDist.set(Number(s.distance), (byDist.get(Number(s.distance)) ?? 0) + 1);
          for (const [dist, n] of byDist) inc(runFormats, n > 1 ? `${n} × ${dist} m` : `${dist} m`);
          for (const s of runSets) {
            const i = Number(s?.intensity);
            if (i > 0 && i <= 100) {
              intensitySum += i;
              intensityN += 1;
            }
          }
          continue;
        }
        const strengthSets = sets.filter((s) => s?.reps != null || s?.weight != null);
        const name = String(ex?.name ?? '').trim();
        if (strengthSets.length && name) {
          inc(lifts, name);
          const reps = strengthSets.map((s) => Number(s.reps)).filter((r) => r > 0);
          if (reps.length) {
            const same = reps.every((r) => r === reps[0]);
            const fmt = same ? `${strengthSets.length} × ${reps[0]}` : `${strengthSets.length} séries`;
            const m = liftFormats.get(name) ?? new Map<string, number>();
            inc(m, fmt);
            liftFormats.set(name, m);
          }
        }
      }
    }
  }

  const total = sessions.length;
  return {
    semaines: weeks,
    seances: total,
    seances_par_semaine: Math.round((total / Math.max(1, weeks)) * 10) / 10,
    jours_frequents: top(days, 4, (jour, v) => ({ jour, part_pct: total ? Math.round((v / total) * 100) : 0 })),
    types: top(types, 6, (type, nombre) => ({ type, nombre })),
    terrains: top(surfaces, 4, (terrain, nombre) => ({ terrain, nombre })),
    formats_course: top(runFormats, 8, (format, nombre) => ({ format, nombre })),
    intensite_course_moyenne_pct: intensityN ? Math.round(intensitySum / intensityN) : null,
    exercices_muscu: top(lifts, 8, (exercice, nombre) => {
      const f = liftFormats.get(exercice);
      return { exercice, nombre, format_habituel: f ? top(f, 1, (k) => k)[0] ?? null : null };
    }),
  };
}
