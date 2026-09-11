import { supabase } from './supabase';
import {
  TrainingPeriod,
  CreateTrainingPeriodPayload,
  UpdateTrainingPeriodPayload,
  PeriodTemplate,
  DEFAULT_PERIOD_SUGGESTIONS,
} from '../types/period';

export const periodService = {
  /**
   * Fetch all periods relevant for a given month range
   */
  fetchPeriodsForMonth: async (
    userId: string,
    year: number,
    month: number, // 0-indexed
    role: 'coach' | 'athlete'
  ): Promise<TrainingPeriod[]> => {
    try {
      // Month boundary dates (YYYY-MM-DD)
      const startDate = new Date(year, month - 1, 20); // include padding days
      const endDate = new Date(year, month + 1, 15);

      const startIso = startDate.toISOString().split('T')[0];
      const endIso = endDate.toISOString().split('T')[0];

      let query = supabase
        .from('training_periods')
        .select('*')
        // Overlap condition: start_date <= endIso AND end_date >= startIso
        .lte('start_date', endIso)
        .gte('end_date', startIso)
        .order('created_at', { ascending: false });

      if (role === 'coach') {
        query = query.eq('coach_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching periods:', error);
        return [];
      }
      return data as TrainingPeriod[];
    } catch (err) {
      console.error('Unexpected error fetching periods:', err);
      return [];
    }
  },

  /**
   * Create a new period
   */
  createPeriod: async (
    coachId: string,
    payload: CreateTrainingPeriodPayload
  ): Promise<TrainingPeriod | null> => {
    try {
      const { data, error } = await supabase
        .from('training_periods')
        .insert({
          coach_id: coachId,
          name: payload.name.trim(),
          color: payload.color,
          start_date: payload.start_date,
          end_date: payload.end_date,
          team_id: payload.team_id || null,
          subgroup_id: payload.subgroup_id || null,
          athlete_id: payload.athlete_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating period:', error);
        throw error;
      }
      return data as TrainingPeriod;
    } catch (err) {
      console.error('Unexpected error creating period:', err);
      throw err;
    }
  },

  /**
   * Update an existing period
   */
  updatePeriod: async (
    periodId: string,
    payload: UpdateTrainingPeriodPayload
  ): Promise<TrainingPeriod | null> => {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.name !== undefined) updateData.name = payload.name.trim();
      if (payload.color !== undefined) updateData.color = payload.color;
      if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
      if (payload.end_date !== undefined) updateData.end_date = payload.end_date;
      if (payload.team_id !== undefined) updateData.team_id = payload.team_id;
      if (payload.subgroup_id !== undefined) updateData.subgroup_id = payload.subgroup_id;
      if (payload.athlete_id !== undefined) updateData.athlete_id = payload.athlete_id;

      const { data, error } = await supabase
        .from('training_periods')
        .update(updateData)
        .eq('id', periodId)
        .select()
        .single();

      if (error) {
        console.error('Error updating period:', error);
        throw error;
      }
      return data as TrainingPeriod;
    } catch (err) {
      console.error('Unexpected error updating period:', err);
      throw err;
    }
  },

  /**
   * Delete a period
   */
  deletePeriod: async (periodId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_periods')
        .delete()
        .eq('id', periodId);

      if (error) {
        console.error('Error deleting period:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Unexpected error deleting period:', err);
      throw err;
    }
  },

  /**
   * Fetch distinct period templates previously used by the coach
   */
  fetchRecentTemplates: async (coachId: string): Promise<PeriodTemplate[]> => {
    try {
      const { data, error } = await supabase
        .from('training_periods')
        .select('name, color')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(25);

      if (error || !data) {
        return DEFAULT_PERIOD_SUGGESTIONS;
      }

      // De-duplicate by lowercase name
      const map = new Map<string, PeriodTemplate>();
      data.forEach((item) => {
        const key = item.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { name: item.name, color: item.color });
        }
      });

      // Add default suggestions if not already present
      DEFAULT_PERIOD_SUGGESTIONS.forEach((def) => {
        const key = def.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, def);
        }
      });

      return Array.from(map.values());
    } catch (err) {
      return DEFAULT_PERIOD_SUGGESTIONS;
    }
  },
};
