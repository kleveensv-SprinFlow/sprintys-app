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
  status: 'pending' | 'approved';
  profile: any;
}

interface CoachState {
  teams: Team[];
  subgroups: Subgroup[];
  teamMembers: TeamMember[];
  pendingMembers: TeamMember[];
  isLoading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  fetchSubgroups: (teamId: string) => Promise<void>;
  createSubgroup: (teamId: string, name: string) => Promise<Subgroup | null>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  assignSubgroup: (userId: string, teamId: string, subgroupId: string | null) => Promise<void>;
  approveAthlete: (userId: string, teamId: string) => Promise<void>;
  rejectAthlete: (userId: string, teamId: string) => Promise<void>;
  subscribeToTeam: (teamId: string) => void;
  unsubscribe: () => void;
}

// Génère un code à 8 chiffres (ex: 48291037)
const generateInviteCode = (): string => {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

export const useCoachStore = create<CoachState>((set, get) => ({
  teams: [],
  subgroups: [],
  teamMembers: [],
  pendingMembers: [],
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
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          subgroup_id,
          status,
          profiles:user_id (id, full_name, first_name, last_name)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      
      const allMembers = data.map((item: any) => ({
        user_id: item.user_id,
        team_id: item.team_id,
        subgroup_id: item.subgroup_id,
        status: item.status || 'approved',
        profile: item.profiles
      }));

      // Séparer les membres approuvés des demandes en attente
      const approved = allMembers.filter((m: TeamMember) => m.status === 'approved');
      const pending = allMembers.filter((m: TeamMember) => m.status === 'pending');

      set({ teamMembers: approved, pendingMembers: pending, isLoading: false });
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

      set((state) => ({
        teamMembers: state.teamMembers.map((m) => 
          m.user_id === userId && m.team_id === teamId ? { ...m, subgroup_id: subgroupId } : m
        )
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  approveAthlete: async (userId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'approved' })
        .match({ user_id: userId, team_id: teamId });
        
      if (error) throw error;

      // Déplacer de pending vers teamMembers
      set((state) => {
        const approvedMember = state.pendingMembers.find(m => m.user_id === userId && m.team_id === teamId);
        if (!approvedMember) return state;
        return {
          pendingMembers: state.pendingMembers.filter(m => !(m.user_id === userId && m.team_id === teamId)),
          teamMembers: [...state.teamMembers, { ...approvedMember, status: 'approved' as const }]
        };
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  rejectAthlete: async (userId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ user_id: userId, team_id: teamId });
        
      if (error) throw error;

      set((state) => ({
        pendingMembers: state.pendingMembers.filter(m => !(m.user_id === userId && m.team_id === teamId))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  subscribeToTeam: (teamId: string) => {
    // Écouter les changements en temps réel sur la table team_members pour ce groupe
    const channel = supabase
      .channel(`team-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          // À chaque modification (nouvel athlète, approbation, départ), on recharge la liste
          get().fetchTeamMembers(teamId);
        }
      )
      .subscribe();

    // Stocker le channel pour pouvoir le désabonner plus tard
    (get() as any)._channel = channel;
  },

  unsubscribe: () => {
    const channel = (get() as any)._channel;
    if (channel) {
      supabase.removeChannel(channel);
      (get() as any)._channel = null;
    }
  },
}));
