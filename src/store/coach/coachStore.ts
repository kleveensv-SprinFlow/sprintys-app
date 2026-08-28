import { create } from 'zustand';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../authStore';

export interface Team {
  id: string;
  name: string;
  coach_id: string;
  invite_code: string;
}

export interface Subgroup {
  id: string;
  team_id: string;
  name: string;
}

export interface TeamMember {
  user_id: string;
  team_id: string;
  subgroup_id: string | null;
  profile: any; // We'll join with profiles
}

interface CoachState {
  teams: Team[];
  subgroups: Subgroup[];
  teamMembers: TeamMember[];
  isLoading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  fetchSubgroups: (teamId: string) => Promise<void>;
  createSubgroup: (teamId: string, name: string) => Promise<Subgroup | null>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  assignSubgroup: (userId: string, teamId: string, subgroupId: string | null) => Promise<void>;
}

// Helper pour générer un code court (ex: A7X-9BQ)
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useCoachStore = create<CoachState>((set, get) => ({
  teams: [],
  subgroups: [],
  teamMembers: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) return set({ isLoading: false });

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('coach_id', user.id);

      if (error) throw error;
      set({ teams: data as Team[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createTeam: async (name: string) => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoading: false });
      return null;
    }

    try {
      const inviteCode = generateInviteCode();
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name, coach_id: user.id, invite_code: inviteCode }])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ teams: [...state.teams, data as Team], isLoading: false }));
      return data as Team;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  fetchSubgroups: async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('subgroups')
        .select('*')
        .eq('team_id', teamId);
      if (error) throw error;
      set({ subgroups: data as Subgroup[] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createSubgroup: async (teamId: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('subgroups')
        .insert([{ team_id: teamId, name }])
        .select()
        .single();
      if (error) throw error;
      
      set((state) => ({ subgroups: [...state.subgroups, data as Subgroup] }));
      return data as Subgroup;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  fetchTeamMembers: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Jointure avec la table profiles pour récupérer les infos de l'athlète
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          subgroup_id,
          profiles:user_id (id, full_name, first_name, last_name)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      
      // Mappage pour aplatir le profile
      const members = data.map((item: any) => ({
        user_id: item.user_id,
        team_id: item.team_id,
        subgroup_id: item.subgroup_id,
        profile: item.profiles
      }));

      set({ teamMembers: members, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  assignSubgroup: async (userId: string, teamId: string, subgroupId: string | null) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ subgroup_id: subgroupId })
        .match({ user_id: userId, team_id: teamId });
        
      if (error) throw error;

      // Update local state
      set((state) => ({
        teamMembers: state.teamMembers.map((m) => 
          m.user_id === userId && m.team_id === teamId ? { ...m, subgroup_id: subgroupId } : m
        )
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
