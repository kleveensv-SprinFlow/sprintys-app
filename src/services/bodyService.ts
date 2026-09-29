import { supabase } from './supabase';

export interface BodyMetric {
  id?: string;
  athlete_id: string;
  weight: number;
  body_fat?: number;
  muscle_mass_kg?: number;
  muscle_mass_percent?: number;
  fat_mass_kg?: number;
  water_percentage?: number;
  visceral_fat?: number;
  scale_type?: 'none' | '4_electrodes' | '8_electrodes' | 'dexa';
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
};
