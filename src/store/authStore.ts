import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type UserRole = 'coach' | 'athlete';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, pass) => {
    set({ isLoading: true, error: null });
    
    // Simulate/Check Test Accounts as requested in Mission Task 5
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
          role: profile?.role || 'athlete'
        }, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  signup: async (email, pass, name, role) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: { data: { full_name: name, role } }
      });
      if (error) throw error;

      if (data.user) {
        // Create profile in DB
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: name,
          role: role
        });

        set({ 
          user: { id: data.user.id, email, name, role }, 
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
