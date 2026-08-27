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
  disciplines?: string[];
  height?: number;
  weight?: number;
  objective?: string;
}

export interface SignupData {
  email: string;
  pass: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  disciplines?: string[];
  height?: number;
  weight?: number;
  objective?: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, pass) => {
    set({ isLoading: true, error: null });
    
    // Simulate/Check Test Accounts
    if (pass === '123456') {
      if (email === 'coach@test.com') {
        set({ 
          user: { id: 'test-coach', email, name: 'Coach Test', role: 'coach' }, 
          isLoading: false 
        });
        return;
      }
      if (email === 'athlete@test.com') {
        set({ 
          user: { id: 'test-athlete', email, name: 'Athlete Test', role: 'athlete' }, 
          isLoading: false 
        });
        return;
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      
      // Fetch role from profiles table (logical step)
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
          disciplines: profile?.disciplines,
          height: profile?.height,
          weight: profile?.weight,
          objective: profile?.objective
        }, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true, error: null });
    const { email, pass, firstName, lastName, role, disciplines, height, weight, objective } = signupData;
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
          disciplines: disciplines || null,
          height: height || null,
          weight: weight || null,
          objective: objective || null,
        };

        await supabase.from('profiles').insert(profileData);

        set({ 
          user: {
            id: data.user.id,
            email,
            name: fullName,
            role,
            firstName,
            lastName,
            disciplines,
            height,
            weight,
            objective
          },
          isLoading: false 
        });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
