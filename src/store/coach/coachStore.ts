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
  teamCheckIns: any[];
  workoutTemplates: any[];
  isLoading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  updateTeam: (teamId: string, name: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  fetchSubgroups: (teamId: string) => Promise<void>;
  createSubgroup: (teamId: string, name: string) => Promise<Subgroup | null>;
  updateSubgroup: (subgroupId: string, name: string) => Promise<void>;
  deleteSubgroup: (subgroupId: string) => Promise<void>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  fetchTeamCheckIns: (teamId: string, dateStr: string) => Promise<void>;
  fetchWorkoutTemplates: () => Promise<void>;
  deleteWorkoutTemplate: (id: string) => Promise<void>;
  assignSubgroup: (userId: string, teamId: string, subgroupId: string | null) => Promise<void>;
  approveAthlete: (userId: string, teamId: string) => Promise<void>;
  rejectAthlete: (userId: string, teamId: string) => Promise<void>;
  removeAthlete: (userId: string, teamId: string) => Promise<void>;
  fetchAllPendingRequests: () => Promise<void>;
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
  teamCheckIns: [],
  workoutTemplates: [],
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

  updateTeam: async (teamId: string, name: string) => {
    try {
      const { error } = await supabase.from('teams').update({ name }).eq('id', teamId);
      if (error) throw error;
      set((state) => ({
        teams: state.teams.map(t => t.id === teamId ? { ...t, name } : t)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTeam: async (teamId: string) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      set((state) => ({
        teams: state.teams.filter(t => t.id !== teamId),
        subgroups: state.subgroups.filter(sg => sg.team_id !== teamId),
        teamMembers: state.teamMembers.filter(m => m.team_id !== teamId),
        pendingMembers: state.pendingMembers.filter(m => m.team_id !== teamId)
      }));
    } catch (err: any) {
      set({ error: err.message });
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

  updateSubgroup: async (subgroupId: string, name: string) => {
    try {
      const { error } = await supabase.from('subgroups').update({ name }).eq('id', subgroupId);
      if (error) throw error;
      set((state) => ({
        subgroups: state.subgroups.map(sg => sg.id === subgroupId ? { ...sg, name } : sg)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteSubgroup: async (subgroupId: string) => {
    try {
      const { error } = await supabase.from('subgroups').delete().eq('id', subgroupId);
      if (error) throw error;
      set((state) => ({
        subgroups: state.subgroups.filter(sg => sg.id !== subgroupId),
        teamMembers: state.teamMembers.map(m => m.subgroup_id === subgroupId ? { ...m, subgroup_id: null } : m)
      }));
    } catch (err: any) {
      set({ error: err.message });
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
        
        console.log("DEBUG fetchTeamMembers data:", JSON.stringify(data, null, 2));
        console.log("DEBUG fetchTeamMembers allMembers mapped:", JSON.stringify(allMembers, null, 2));

        // Séparer les membres approuvés des demandes en attente
        const approved = allMembers.filter((m: TeamMember) => m.status === 'approved');
        const pending = allMembers.filter((m: TeamMember) => m.status === 'pending');
        
        console.log("DEBUG approved length:", approved.length, "pending length:", pending.length);

        set({ teamMembers: approved, pendingMembers: pending, isLoading: false });
      } catch (err: any) {
        console.error("DEBUG fetchTeamMembers error:", err.message);
        set({ error: err.message, isLoading: false });
      }
    },

  fetchTeamCheckIns: async (teamId: string, dateStr: string) => {
    try {
      // Pour avoir les check-ins de l'équipe, on doit chercher tous les athlètes de l'équipe
      const members = get().teamMembers.map(m => m.user_id);
      if (members.length === 0) {
        set({ teamCheckIns: [] });
        return;
      }

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .in('athlete_id', members)
        .eq('date', dateStr);

      if (error) throw error;
      set({ teamCheckIns: data || [] });
    } catch (err: any) {
      console.warn("Error fetching team checkins:", err);
    }
  },

    fetchWorkoutTemplates: async () => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        set({ workoutTemplates: data || [] });
      } catch (err: any) {
        console.error('Error fetching templates:', err);
      }
    },

    deleteWorkoutTemplate: async (id: string) => {
      try {
        const { error } = await supabase.from('workout_templates').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({
          workoutTemplates: state.workoutTemplates.filter((t) => t.id !== id)
        }));
      } catch (err: any) {
        console.error('Error deleting template:', err);
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

  removeAthlete: async (userId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ user_id: userId, team_id: teamId });
        
      if (error) throw error;

      set((state) => ({
        teamMembers: state.teamMembers.filter(m => !(m.user_id === userId && m.team_id === teamId))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchAllPendingRequests: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    try {
      // Fetch all teams of coach
      const { data: coachTeams } = await supabase.from('teams').select('id').eq('coach_id', user.id);
      if (!coachTeams || coachTeams.length === 0) return;
      
      const teamIds = coachTeams.map((t: any) => t.id);
      
      // Fetch pending members for these teams
      const { data } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          subgroup_id,
          status,
          profiles:user_id (id, full_name, first_name, last_name)
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending');
        
      if (data) {
          const pending = data.map((item: any) => ({
            user_id: item.user_id,
            team_id: item.team_id,
            subgroup_id: item.subgroup_id,
            status: 'pending' as const,
            profile: item.profiles
          }));
        set({ pendingMembers: pending });
      }
    } catch (e) {
      console.error(e);
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
