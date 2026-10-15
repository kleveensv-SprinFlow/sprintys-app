import { supabase } from './supabase';

export interface PerfRecord {
  kind: 'course' | 'muscu';
  key: string;
  label: string;
  value: number;
  unit: 's' | 'kg';
  distance_m?: number;
  surface?: 'piste' | 'cote';
  date: string;
  /** Number of results behind this record */
  count: number;
  /** Beaten in the last 14 days (and not the very first result) */
  recent_pr: boolean;
}

export interface PerfSeries {
  key: string;
  label: string;
  unit: 's' | 'kg';
  better: 'lower' | 'higher';
  points: { date: string; value: number }[];
}

export interface PerfWeek {
  week_start: string;
  planned: number;
  done: number;
  /** Session load: effort (1-10) x minutes */
  load: number;
  run_m: number;
}

export interface AthletePerformance {
  records: PerfRecord[];
  series: PerfSeries[];
  weekly: PerfWeek[];
  recent_prs: { date: string; label: string; value: number; unit: 's' | 'kg' }[];
  load: { acute: number; chronic: number; ratio: number | null };
  form: { last_date?: string; last_score?: number; avg7?: number; fatigue7?: number; checkins7?: number };
}

export const performanceService = {
  /** Records, progression, attendance and load of an athlete (the athlete themself or their coach). */
  async fetch(athleteId: string, weeks = 8): Promise<AthletePerformance | null> {
    const { data, error } = await (supabase.rpc as any)('get_athlete_performance', { p_athlete: athleteId, p_weeks: weeks });
    if (error) {
      console.error('get_athlete_performance failed:', error.message);
      throw error;
    }
    return (data as AthletePerformance) ?? null;
  },
};
