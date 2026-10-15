import { supabase } from './supabase';

export interface AthleteMax {
  key: string;
  label: string;
  /** Set by hand (athlete or coach): wins over the estimate */
  manual_kg: number | null;
  /** Estimated from the athlete's best sets */
  estimated_kg: number | null;
  best_kg: number | null;
}

/** Same key as the one the database uses for an exercise (catalog id, else its name), lower-cased. */
export const exerciseKey = (ex: { catalog_id?: string | null; name?: string | null }): string =>
  String(ex.catalog_id || ex.name || '').trim().toLowerCase();

/** A % of the max as a load to put on the bar: nearest 2,5 kg. */
export const loadFromPercent = (oneRm: number, percent: number): number => Math.round((oneRm * percent) / 100 / 2.5) * 2.5;

export const formatLoad = (kg: number): string => `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace('.', ',')} kg`;

export const maxesService = {
  fetch: async (athleteId: string): Promise<AthleteMax[]> => {
    const { data, error } = await supabase.rpc('get_athlete_maxes', { p_athlete: athleteId });
    if (error) throw error;
    return ((data as any[]) || []).map((m) => ({
      key: m.key,
      label: m.label,
      manual_kg: m.manual_kg != null ? Number(m.manual_kg) : null,
      estimated_kg: m.estimated_kg != null ? Number(m.estimated_kg) : null,
      best_kg: m.best_kg != null ? Number(m.best_kg) : null,
    }));
  },

  /** kg = null removes the manual value (the estimate takes over again) */
  set: async (athleteId: string, key: string, label: string, kg: number | null) => {
    const { error } = await supabase.rpc('set_athlete_max', { p_athlete: athleteId, p_key: key, p_label: label, p_kg: kg });
    if (error) throw error;
  },
};
