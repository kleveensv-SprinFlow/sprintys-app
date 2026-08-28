import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export type UserRole = 'coach' | 'athlete';

export interface UserProfile {
  id: string;
  email: string;
  name: string; // Will store "Prénom Nom"
  role: UserRole;
  firstName?: string;
  lastName?: string;
  gender?: 'homme' | 'femme';
  disciplines?: string[];
  height?: number;
  weight?: number;
  objective?: string;
  groupName?: string;
  subgroups?: string[];
  emailConfirmed?: boolean;
  activityLevel?: string;
  startWeight?: number;
  targetWeight?: number;
  weeklyWeightGoal?: number;
  manualKcalGoal?: number;
  mealDistribution?: { petit_dejeuner: number, dejeuner: number, diner: number, collation: number };
  currentFlowStreak?: number;
  lastFlowDate?: string;
}

export interface SignupData {
  email: string;
  pass: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  gender: 'homme' | 'femme';
  disciplines?: string[];
  height?: number;
  weight?: number;
  objective?: string;
  groupName?: string;
  subgroups?: string[];
}

interface AuthState {
  user: UserProfile | null;
  pendingEmail: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initializeAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ success: boolean; requiresVerification: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setPendingEmail: (email: string | null) => void;
}

const CACHE_PROFILE_KEY = '@sprintflow_user_profile';

const buildUserProfile = (authUser: any, profile: any): UserProfile => {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profile?.full_name || authUser.user_metadata?.full_name || 'Athlète',
    role: (profile?.role || authUser.user_metadata?.role || 'athlete') as UserRole,
    firstName: profile?.first_name || authUser.user_metadata?.first_name,
    lastName: profile?.last_name || authUser.user_metadata?.last_name,
    gender: profile?.gender,
    disciplines: profile?.disciplines,
    height: profile?.height,
    weight: profile?.weight,
    objective: profile?.objective,
    groupName: profile?.group_name,
    subgroups: profile?.subgroups,
    emailConfirmed: !!authUser.email_confirmed_at,
    activityLevel: profile?.activity_level,
    startWeight: profile?.start_weight,
    targetWeight: profile?.target_weight,
    weeklyWeightGoal: profile?.weekly_weight_goal,
    manualKcalGoal: profile?.manual_kcal_goal,
    mealDistribution: profile?.meal_distribution,
    currentFlowStreak: profile?.current_flow_streak,
    lastFlowDate: profile?.last_flow_date,
  };
};

let authListenerSubscribed = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  pendingEmail: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setPendingEmail: (email) => set({ pendingEmail: email }),

  initializeAuth: async () => {
    try {
      // 1. Fast local restore from AsyncStorage
      const cached = await AsyncStorage.getItem(CACHE_PROFILE_KEY);
      if (cached) {
        try {
          const parsedUser = JSON.parse(cached);
          set({ user: parsedUser, isLoading: false });
        } catch {
          // ignore cache parse error
        }
      }

      // 2. Fetch active Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        if (!cached) {
          set({ user: null, isLoading: false, isInitialized: true });
        } else {
          // If session is truly gone, clear cached user
          await AsyncStorage.removeItem(CACHE_PROFILE_KEY);
          set({ user: null, isLoading: false, isInitialized: true });
        }
      } else {
        // Session exists, fetch fresh profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        const userProfile = buildUserProfile(session.user, profile);
        await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
        set({ user: userProfile, isLoading: false, isInitialized: true });
      }

      // 3. Set up real-time onAuthStateChange listener once
      if (!authListenerSubscribed) {
        authListenerSubscribed = true;
        supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (currentSession?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .maybeSingle();

              const userProfile = buildUserProfile(currentSession.user, profile);
              await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
              set({ user: userProfile, isLoading: false });
            }
          } else if (event === 'SIGNED_OUT') {
            await AsyncStorage.removeItem(CACHE_PROFILE_KEY);
            set({ user: null, pendingEmail: null, isLoading: false });
          }
        });
      }
    } catch (err: any) {
      console.warn('Error during initializeAuth:', err?.message);
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (email, pass) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) throw error;
      
      if (!data.user) throw new Error('Utilisateur non trouvé');

      // Fetch role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const userProfile = buildUserProfile(data.user, profile);
      await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));

      set({ 
        user: userProfile, 
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message || 'Erreur de connexion', isLoading: false });
      throw err;
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true, error: null });
    const { email, pass, firstName, lastName, role, gender, disciplines, height, weight, objective, groupName, subgroups } = signupData;
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: pass,
        options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, role } }
      });
      if (error) throw error;

      if (data.user) {
        // Create profile in DB
        const profileData = {
          id: data.user.id,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          role: role,
          gender: gender,
          disciplines: role === 'athlete' ? (disciplines || null) : null,
          height: role === 'athlete' ? (height || null) : null,
          weight: role === 'athlete' ? (weight || null) : null,
          objective: role === 'athlete' ? (objective || null) : null,
          group_name: role === 'coach' ? (groupName || null) : null,
          subgroups: role === 'coach' ? (subgroups || null) : null,
        };

        await supabase.from('profiles').upsert(profileData);

        // Check if email confirmation is required
        const isConfirmed = !!data.user.email_confirmed_at || !!data.session;

        const userProfile: UserProfile = {
          id: data.user.id,
          email: email.trim(),
          name: fullName,
          role,
          firstName,
          lastName,
          gender,
          disciplines,
          height,
          weight,
          objective,
          groupName,
          subgroups,
          emailConfirmed: isConfirmed
        };

        if (isConfirmed) {
          await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
        }

        set({ 
          pendingEmail: isConfirmed ? null : email.trim(),
          user: isConfirmed ? userProfile : null,
          isLoading: false,
          error: null
        });

        return { success: true, requiresVerification: !isConfirmed };
      }
      return { success: false, requiresVerification: false };
    } catch (err: any) {
      set({ error: err.message || "Erreur lors de l'inscription", isLoading: false });
      return { success: false, requiresVerification: false };
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, error: null });

    try {
      // Attempt signup OTP verification first
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup'
      });

      if (error) {
        // Fallback to email type OTP
        const res = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email'
        });
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      if (data.user) {
        // Fetch the real profile from DB to get the correct role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const userProfile = buildUserProfile(data.user, profile);
        await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));

        set({
          user: userProfile,
          pendingEmail: null,
          isLoading: false,
          error: null
        });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Code de vérification invalide', isLoading: false });
      return false;
    }
  },

  resendOtp: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    }
    await AsyncStorage.removeItem(CACHE_PROFILE_KEY);
    set({ user: null, pendingEmail: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));

