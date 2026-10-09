import { supabase } from './supabase';

export interface BodyMetric {
  id?: string;
  athlete_id: string;
  weight: number;
  body_fat?: number | null;
  muscle_mass_kg?: number | null;
  muscle_mass_percent?: number | null;
  fat_mass_kg?: number | null;
  water_percentage?: number | null;
  visceral_fat?: number | null;
  scale_type?: 'none' | '4_electrodes' | '8_electrodes' | 'dexa' | null;
  created_at?: string;
}

export const bodyService = {
  fetchMetrics: async (athleteId: string) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  addMetric: async (metric: BodyMetric) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .insert([metric])
      .select();

    if (error) throw error;
    return data;
  },

  updateMetric: async (id: string, patch: Partial<BodyMetric>) => {
    const { error } = await supabase
      .from('body_metrics')
      .update(patch)
      .eq('id', id);

    if (error) throw error;
  },

  deleteMetric: async (id: string) => {
    const { error } = await supabase
      .from('body_metrics')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
