import { supabase } from './supabase';

export interface TeamAlertReason {
  code: 'low_form' | 'pain' | 'no_checkin' | 'missed' | 'load';
  severity: 'high' | 'medium';
  label: string;
  detail: string;
}

export interface TeamAlert {
  athlete_id: string;
  name: string;
  severity: 'high' | 'medium';
  reasons: TeamAlertReason[];
}

export const alertsService = {
  /** Athletes of the team that deserve attention today (coach only). */
  async fetchTeamAlerts(teamId: string): Promise<TeamAlert[]> {
    const { data, error } = await (supabase.rpc as any)('get_team_alerts', { p_team: teamId });
    if (error) throw error;
    return (data as TeamAlert[]) ?? [];
  },
};
