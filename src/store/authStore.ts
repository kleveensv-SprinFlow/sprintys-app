import { create } from 'zustand';
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
  error: string | null;
  
  // Actions
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ success: boolean; requiresVerification: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setPendingEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  pendingEmail: null,
  isLoading: false,
  error: null,

  setPendingEmail: (email) => set({ pendingEmail: email }),

  login: async (email, pass) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      
      // Fetch role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      set({ 
        user: { 
          id: data.user.id, 
          email: data.user.email!, 
          name: profile?.full_name || 'User',
          role: profile?.role || 'athlete',
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          gender: profile?.gender,
          disciplines: profile?.disciplines,
          height: profile?.height,
          weight: profile?.weight,
          objective: profile?.objective,
          groupName: profile?.group_name,
          subgroups: profile?.subgroups,
          emailConfirmed: data.user.email_confirmed_at ? true : false
        }, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true, error: null });
    const { email, pass, firstName, lastName, role, gender, disciplines, height, weight, objective, groupName, subgroups } = signupData;
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: { data: { full_name: fullName, role } }
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

        // Check if email confirmation is required (if session is null or email_confirmed_at is null)
        const isConfirmed = !!data.user.email_confirmed_at || !!data.session;

        set({ 
          pendingEmail: isConfirmed ? null : email,
          user: isConfirmed ? {
            id: data.user.id,
            email,
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
            emailConfirmed: true
          } : null,
          isLoading: false 
        });

        return { success: true, requiresVerification: !isConfirmed };
      }
      return { success: false, requiresVerification: false };
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return { success: false, requiresVerification: false };
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, error: null });

    try {
      // Attempt signup OTP verification first
      let { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        // Fallback to email type OTP
        const res = await supabase.auth.verifyOtp({
          email,
          token,
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
          .single();

        set({
          user: {
            id: data.user.id,
            email: data.user.email!,
            name: profile?.full_name || 'User',
            role: profile?.role || 'athlete',
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            gender: profile?.gender,
            disciplines: profile?.disciplines,
            height: profile?.height,
            weight: profile?.weight,
            objective: profile?.objective,
            groupName: profile?.group_name,
            subgroups: profile?.subgroups,
            emailConfirmed: true
          },
          pendingEmail: null,
          isLoading: false
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
        email,
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, pendingEmail: null });
  },

  clearError: () => set({ error: null }),
}));
