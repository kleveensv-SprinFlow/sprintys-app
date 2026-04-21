import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, data: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, pass) => {
    set({ isLoading: true, error: null });
    try {
      // Logic would go here (Supabase)
      // Mocking for Phase 3 Step 1
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (email === 'demo@sprintflow.ai' && pass === 'password') {
        set({ user: { id: '1', email, name: 'Athlete Demo' }, isLoading: false });
      } else {
        throw new Error('Identifiants invalides');
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  signup: async (email, pass, data) => {
    set({ isLoading: true, error: null });
    try {
      // Mocking signup
      await new Promise(resolve => setTimeout(resolve, 1500));
      set({ user: { id: '2', email, name: data.name }, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
