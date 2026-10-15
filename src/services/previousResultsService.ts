import { supabase } from './supabase';

export interface PrevMuscuSet {
  kg: number;
  reps: number | null;
  ok: boolean;
  /** Position of the set in its exercise, and the exercise instance it came from */
  idx?: number;
  ex?: string;
}

export interface PrevResults {
  /** By exercise key (see exerciseKey): the sets of the last session that contained it */
  muscu: Record<string, { date: string; sets: PrevMuscuSet[]; best_kg: number | null }>;
  /** By "distance|piste" or "distance|cote": last time and best time in ms */
  course: Record<string, { date: string; last_ms: number; best_ms: number }>;
}

export const EMPTY_PREV: PrevResults = { muscu: {}, course: {} };

export const courseKey = (distance: number | string | null | undefined, sessionTitle: string | null | undefined): string | null => {
  const d = parseFloat(String(distance ?? '').replace(',', '.'));
  if (!Number.isFinite(d) || d <= 0) return null;
  return `${d}|${/c[oô]te/i.test(sessionTitle || '') ? 'cote' : 'piste'}`;
};

export const previousResultsService = {
  fetch: async (athleteId: string, workoutId: string): Promise<PrevResults> => {
    const { data, error } = await supabase.rpc('get_previous_results', { p_athlete: athleteId, p_workout: workoutId });
    if (error) throw error;
    return { muscu: (data as any)?.muscu ?? {}, course: (data as any)?.course ?? {} };
  },
};
