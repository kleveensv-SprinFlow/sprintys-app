import { supabase } from './supabaseClient';
import { Profile, BodyMetric } from '../features/body/types';

export const bodyService = {
  /**
   * Mettre à jour le profil complet (incluant la nutrition)
   */
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer le profil
   */
  fetchProfile: async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Allow empty profile

    const userMetadata = session?.user?.user_metadata || {};
    return {
      ...data,
      first_name: data?.first_name || userMetadata.first_name || '',
      last_name: data?.last_name || userMetadata.last_name || '',
    };
  },

  /**
   * Ajouter une mesure corporelle
   */
  addBodyMetric: async (metric: BodyMetric) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .insert([metric])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Récupérer l'historique des mesures
   */
  getBodyMetrics: async (userId: string) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
