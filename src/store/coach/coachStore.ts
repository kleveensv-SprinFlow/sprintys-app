import { sessionForAthlete } from '../../services/sessionForAthlete';
import { Database } from '../../types/supabase';
import { create } from 'zustand';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  profile: Database['public']['Tables']['profiles']['Row'];
}

interface CoachState {
  teams: Team[];
  subgroups: Subgroup[];
  teamMembers: TeamMember[];
  pendingMembers: TeamMember[];
  teamCheckIns: Database['public']['Tables']['check_ins']['Row'][];
  workoutTemplates: Database['public']['Tables']['workout_templates']['Row'][];
  isLoading: boolean;
  hasFetchedTeams: boolean;
  error: string | null;
  /** The group the coach is working on (a coach may run several); members and subgroups in the store belong to `loadedTeamId` */
  selectedTeamId: string | null;
  loadedTeamId: string | null;
  loadedSubgroupsTeamId: string | null;

  fetchTeams: () => Promise<void>;
  selectTeam: (teamId: string) => void;
  ensureTeamLoaded: (teamId: string) => Promise<void>;
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

// Latest-request-wins counters (switching group quickly must not show the previous group's people)
let membersSeq = 0;
let subgroupsSeq = 0;

// Génère un code à 8 chiffres (ex: 48291037)
const generateInviteCode = (): string => {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

/**
 * Synchronise les séances programmées futures d'une équipe pour un athlète
 * Utilisé lors de l'approbation d'un nouvel athlète ou du changement de son sous-groupe.
 */
export const syncAthleteWorkouts = async (
  athleteId: string,
  teamId: string,
  subgroupId: string | null = null
): Promise<void> => {
  try {
    // 1. Tenter d'abord la RPC PostgreSQL si déployée
    const { error: rpcError } = await (supabase.rpc as any)('sync_athlete_group_workouts', {
      p_athlete_id: athleteId,
      p_team_id: teamId,
      p_subgroup_id: subgroupId,
    });

    if (!rpcError) {
      return;
    }

    // 2. Fallback client sécurisé avec les permissions RLS du coach
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Si un sous-groupe est spécifié, retirer les futures séances d'autres sous-groupes encore non réalisées
    if (subgroupId) {
      await supabase
        .from('workouts')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .gte('date_prevue', twoHoursAgo)
        .not('subgroup_id', 'is', null)
        .neq('subgroup_id', subgroupId);
    }

    // Récupérer les séances futures de l'équipe
    const { data: teamWorkouts, error: twErr } = await supabase
      .from('workouts')
      .select('coach_id, team_id, subgroup_id, group_assignment_id, date_prevue, type_seance, blocks, exercises, intensity, description, measures, created_at')
      .eq('team_id', teamId)
      .gte('date_prevue', twoHoursAgo)
      .order('created_at', { ascending: false });

    if (twErr || !teamWorkouts || teamWorkouts.length === 0) {
      return;
    }

    // Dédoublonner les modèles d'entraînement de l'équipe
    // On préfère la copie maître du coach (elle contient toute la séance) à la ligne d'un autre athlète
    const templatesMap = new Map<string, any>();
    teamWorkouts.forEach((w: any) => {
      const key = w.group_assignment_id || `${w.date_prevue}_${w.type_seance}`;
      const current = templatesMap.get(key);
      if (!current || (w.measures?.is_master && !current.measures?.is_master)) {
        templatesMap.set(key, w);
      }
    });

    // Récupérer les séances existantes de l'athlète pour éviter tout doublon
    const { data: athleteWorkouts } = await supabase
      .from('workouts')
      .select('group_assignment_id, date_prevue, type_seance')
      .eq('athlete_id', athleteId)
      .eq('team_id', teamId);

    const athleteKeys = new Set<string>();
    (athleteWorkouts || []).forEach((w: any) => {
      if (w.group_assignment_id) athleteKeys.add(w.group_assignment_id);
      athleteKeys.add(`${w.date_prevue}_${w.type_seance}`);
    });

    const toInsert: any[] = [];
    for (const t of templatesMap.values()) {
      // Si l'athlète est dans un sous-groupe précis et que la séance est pour un autre sous-groupe
      if (subgroupId && t.subgroup_id && t.subgroup_id !== subgroupId) {
        continue;
      }
      const key = t.group_assignment_id || `${t.date_prevue}_${t.type_seance}`;
      if (athleteKeys.has(key)) {
        continue;
      }

      const mine = sessionForAthlete(t, athleteId, subgroupId);
      if (!mine) continue; // nothing in this session is meant for this athlete

      toInsert.push({
        athlete_id: athleteId,
        coach_id: t.coach_id,
        team_id: t.team_id,
        subgroup_id: subgroupId ?? t.subgroup_id,
        group_assignment_id: t.group_assignment_id,
        date_prevue: t.date_prevue,
        type_seance: t.type_seance,
        status: 'pending',
        blocks: mine.blocks,
        exercises: mine.exercises,
        intensity: t.intensity,
        description: mine.description,
        measures: mine.measures,
      });
    }

    if (toInsert.length > 0) {
      await supabase.from('workouts').insert(toInsert);
    }
  } catch (err) {
    console.warn('Failed to sync athlete group workouts:', err);
  }
};

export const useCoachStore = create<CoachState>((set, get) => ({
  teams: [],
  subgroups: [],
  teamMembers: [],
  pendingMembers: [],
  teamCheckIns: [],
  workoutTemplates: [],
  isLoading: false,
  hasFetchedTeams: false,
  error: null,
  selectedTeamId: null,
  loadedTeamId: null,
  loadedSubgroupsTeamId: null,

  selectTeam: (teamId: string) => {
    set({ selectedTeamId: teamId });
    const uid = useAuthStore.getState().user?.id;
    if (uid) AsyncStorage.setItem(`coach-team:${uid}`, teamId).catch(() => undefined);
    get().ensureTeamLoaded(teamId);
  },

  ensureTeamLoaded: async (teamId: string) => {
    // Members and subgroups are tracked apart: another screen may have loaded only one of them
    await Promise.all([
      get().loadedTeamId === teamId ? Promise.resolve() : get().fetchTeamMembers(teamId),
      get().loadedSubgroupsTeamId === teamId ? Promise.resolve() : get().fetchSubgroups(teamId),
    ]);
  },

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    // Session still restoring: not "fetched" yet, the caller retries once the user is known
    if (!user) return set({ isLoading: false });

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('coach_id', user.id);

      if (error) throw error;
      const teams = data as Team[];
      let selected = get().selectedTeamId;
      if (!selected || !teams.some((t) => t.id === selected)) {
        const saved = await AsyncStorage.getItem(`coach-team:${user.id}`).catch(() => null);
        selected = teams.find((t) => t.id === saved)?.id ?? teams[0]?.id ?? null;
      }
      set({ teams, selectedTeamId: selected, isLoading: false, hasFetchedTeams: true });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, hasFetchedTeams: true });
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
      
      set((state) => ({
        teams: [...state.teams, data as Team],
        selectedTeamId: state.selectedTeamId ?? (data as Team).id,
        isLoading: false,
      }));
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
        selectedTeamId: state.selectedTeamId === teamId ? (state.teams.find((t) => t.id !== teamId)?.id ?? null) : state.selectedTeamId,
        loadedTeamId: state.loadedTeamId === teamId ? null : state.loadedTeamId,
        loadedSubgroupsTeamId: state.loadedSubgroupsTeamId === teamId ? null : state.loadedSubgroupsTeamId,
        subgroups: state.subgroups.filter(sg => sg.team_id !== teamId),
        teamMembers: state.teamMembers.filter(m => m.team_id !== teamId),
        pendingMembers: state.pendingMembers.filter(m => m.team_id !== teamId)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchSubgroups: async (teamId: string) => {
    const mine = ++subgroupsSeq;
    try {
      const { data, error } = await supabase
        .from('subgroups')
        .select('*')
        .eq('team_id', teamId);
      if (error) throw error;
      if (mine === subgroupsSeq) set({ subgroups: data as Subgroup[], loadedSubgroupsTeamId: teamId });
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
    const mine = ++membersSeq;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          subgroup_id,
          status,
          profiles:user_id (id, full_name, first_name, last_name, avatar_url)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      const allMembers = (data || []).map((item: any) => ({
        user_id: item.user_id,
        team_id: item.team_id,
        subgroup_id: item.subgroup_id,
        status: item.status || 'approved',
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      }));
        

      // Séparer les membres approuvés des demandes en attente
      const approved = allMembers.filter((m: TeamMember) => m.status === 'approved');
      const pending = allMembers.filter((m: TeamMember) => m.status === 'pending');
      // A newer request (another group picked meanwhile) wins: this answer is dropped
      if (mine !== membersSeq) return;
      set((state) => ({
        loadedTeamId: teamId,
        teamMembers: approved,
        pendingMembers: [
          ...state.pendingMembers.filter((m) => m.team_id !== teamId),
          ...pending
        ],
        isLoading: false
      }));
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

      // Synchroniser les séances selon le nouveau sous-groupe
      await syncAthleteWorkouts(userId, teamId, subgroupId);
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

      // Synchroniser automatiquement toutes les séances futures déjà programmées pour l'équipe
      await syncAthleteWorkouts(userId, teamId, null);
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
          profiles:user_id (id, full_name, first_name, last_name, avatar_url)
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending');
        
      if (data) {
          const pending = data.map((item: any) => ({
            user_id: item.user_id,
            team_id: item.team_id,
            subgroup_id: item.subgroup_id,
            status: 'pending' as const,
            profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
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


/** The group being worked on: the picked one, else the first. */
export const useCurrentTeam = (): Team | undefined =>
  useCoachStore((s) => s.teams.find((t) => t.id === s.selectedTeamId) ?? s.teams[0]);
