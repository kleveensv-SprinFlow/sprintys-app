import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { useEntitlementStore } from './entitlementStore';
import { supabase } from '../services/supabase';
import { useSprintyChatStore } from './sprintyChatStore';
import { useConsentStore } from './consentStore';
import { useOnboardingStore } from './onboardingStore';
import type { ConsentType } from '../legal/consents';
import { cancelSessionReminders, unregisterPushToken } from '../services/notifications';

WebBrowser.maybeCompleteAuthSession();

export type UserRole = 'coach' | 'athlete';

export interface UserProfile {
  id: string;
  email: string;
  name: string; // Will store "Prénom Nom"
  role: UserRole;
  firstName?: string;
  lastName?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  disciplines?: string[] | null;
  height?: number | null;
  weight?: number | null;
  avatarUrl?: string | null;
  objective?: string | null;
  groupName?: string | null;
  subgroups?: string[] | null;
  emailConfirmed?: boolean;
  activityLevel?: string | null;
  startWeight?: number | null;
  targetWeight?: number | null;
  weeklyWeightGoal?: number | null;
  manualKcalGoal?: number | null;
  mealDistribution?: any | null;
  currentFlowStreak?: number | null;
  lastFlowDate?: string | null;
  nextCompetitionDate?: string; // Not in DB yet, future competitions table feature
  sleepGoal?: number | null;
  /** 'email', 'google' or 'apple' (Supabase app_metadata.provider). */
  authProvider?: string | null;
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
  dateOfBirth?: string;
  acceptedTerms?: boolean;
  acceptedHealth?: boolean;
  dob?: Date;
  /** Consents ticked at signup, recorded once the account is authenticated. */
  consents?: ConsentType[];
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
  signInWithGoogle: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setPendingEmail: (email: string | null) => void;
  updateSleepGoal: (goal: number) => Promise<void>;
  updateCoachPhilosophy: (philosophy: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  reloadProfile: () => Promise<void>;
}

const CACHE_PROFILE_KEY = '@sprintflow_user_profile';
const PENDING_SIGNUP_DATA_KEY = '@sprintflow_pending_signup_data';
const PENDING_CONSENTS_KEY = '@sprintys_pending_consents';

/**
 * Writes profile fields. The date of birth column may be missing on an older database: retry
 * without it instead of losing every other field (gender, height, weight, group…).
 */
const saveProfileFields = async (userId: string, fields: Record<string, any>) => {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error && 'date_of_birth' in fields && /date_of_birth/i.test(error.message || '')) {
    const { date_of_birth, ...rest } = fields;
    return supabase.from('profiles').update(rest).eq('id', userId);
  }
  return { error };
};

/** Records the consents ticked at signup once the user is authenticated. */
const flushPendingConsents = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CONSENTS_KEY);
    if (!raw) return;
    const types = JSON.parse(raw) as ConsentType[];
    if (await useConsentStore.getState().grant(types)) await AsyncStorage.removeItem(PENDING_CONSENTS_KEY);
  } catch (e) {
    console.error('pending consents', e);
  }
};

/** Deep link Supabase sends users back to (Google sign-in, password recovery). Must stay in the Auth allow-list. */
export const authRedirectUrl = () => makeRedirectUri({ scheme: 'sprintflowv2', path: 'auth/callback' });

export const translateAuthError = (err: any): string => {
  const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : '');
  if (!msg) return 'Une erreur est survenue. Réessaie dans un instant.';

  const lower = msg.toLowerCase();
  if (lower.includes('token has expired') || lower.includes('token is invalid') || lower.includes('invalid token') || lower.includes('otp')) {
    return 'Ce code est incorrect ou a expiré. Vérifie-le ou demande un nouveau code.';
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email_send_rate_limit')) {
    return 'Trop de tentatives. Patiente un instant avant de réessayer.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Un compte existe déjà avec cette adresse. Connecte-toi plutôt.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Ton adresse n’est pas encore confirmée. Utilise le code reçu par e-mail.';
  }
  if (lower.includes('password should') || lower.includes('weak password') || lower.includes('weak_password')) {
    return 'Ce mot de passe est trop faible. Choisis-en un plus long, avec chiffres et majuscules.';
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email') || (lower.includes('email address') && lower.includes('invalid'))) {
    return 'Cette adresse e-mail ne semble pas valide.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('fetch failed')) {
    return 'Pas de connexion. Vérifie ton accès à internet.';
  }
  // Never surface raw English server messages
  if (/\b(the|is|not|for|with|error|invalid|failed|unable|must|should|user)\b/i.test(msg)) {
    return 'Une erreur est survenue. Réessaie dans un instant.';
  }
  return msg;
};

const buildUserProfile = (authUser: any, profile: any): UserProfile => {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profile?.full_name || authUser.user_metadata?.full_name || 'Athlète',
    role: (profile?.role || authUser.user_metadata?.role || 'athlete') as UserRole,
    firstName: profile?.first_name || authUser.user_metadata?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : undefined),
    lastName: profile?.last_name || authUser.user_metadata?.last_name || (profile?.full_name && profile.full_name.includes(' ') ? profile.full_name.split(' ').slice(1).join(' ') : undefined),
    gender: profile?.gender,
    dateOfBirth: profile?.date_of_birth || authUser.user_metadata?.date_of_birth || null,
    disciplines: profile?.disciplines,
    height: profile?.height,
    weight: profile?.weight,
    avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
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
    sleepGoal: profile?.sleep_goal,
    authProvider: authUser.app_metadata?.provider || null,
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

  updateCoachPhilosophy: async (philosophy: string) => { return get().updateProfile({ objective: philosophy }); },

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
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profile && session.user) {
          const newProfile = {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Utilisateur',
            first_name: session.user.user_metadata?.first_name || null,
            last_name: session.user.user_metadata?.last_name || null,
            role: session.user.user_metadata?.role || 'athlete',
          };
          const { data: upserted } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle();
          if (upserted) profile = upserted;
        }

        const userProfile = buildUserProfile(session.user, profile);
        await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
        set({ user: userProfile, isLoading: false, isInitialized: true });
      }

      // 3. Set up real-time onAuthStateChange listener once
      if (!authListenerSubscribed) {
        authListenerSubscribed = true;
        // The handler is deferred out of the callback: supabase-js awaits listeners while holding its internal
        // auth lock (updateUser, setSession…), so a query made here would wait for that same lock forever.
        const handleAuthChange = async (event: string, currentSession: any) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (currentSession?.user) {
              let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .maybeSingle();

              if (!profile) {
                const newProfile = {
                  id: currentSession.user.id,
                  full_name: currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || 'Utilisateur',
                  first_name: currentSession.user.user_metadata?.first_name || null,
                  last_name: currentSession.user.user_metadata?.last_name || null,
                  role: currentSession.user.user_metadata?.role || 'athlete',
                };
                const { data: upserted } = await supabase
                  .from('profiles')
                  .upsert(newProfile)
                  .select()
                  .maybeSingle();
                if (upserted) profile = upserted;
              }

              const userProfile = buildUserProfile(currentSession.user, profile);
              await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
              set({ user: userProfile, isLoading: false });
            }
          } else if (event === 'SIGNED_OUT') {
            await AsyncStorage.removeItem(CACHE_PROFILE_KEY);
            set({ user: null, pendingEmail: null, isLoading: false });
          }
        };
        supabase.auth.onAuthStateChange((event, currentSession) => {
          setTimeout(() => {
            handleAuthChange(event, currentSession).catch((e) => console.warn('auth state change failed', e?.message));
          }, 0);
        });
      }
    } catch (err: any) {
      console.warn('Error during initializeAuth:', err?.message);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const redirectUrl = authRedirectUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Impossible d'initialiser la connexion Google.");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        if (errorCode) throw new Error(errorCode);

        if (params.code) {
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) throw exchangeError;
          if (sessionData?.user) {
            await get().reloadProfile();
            set({ isLoading: false });
            return { success: true };
          }
        }

        if (params.access_token && params.refresh_token) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (setSessionError) throw setSessionError;
          if (sessionData?.user) {
            await get().reloadProfile();
            set({ isLoading: false });
            return { success: true };
          }
        }
      }

      set({ isLoading: false });
      return { success: false, cancelled: true };
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      set({ error: translateAuthError(err), isLoading: false });
      return { success: false, error: err.message };
    }
  },

  /** Native Sign in with Apple (iOS), required by Apple next to Google sign-in. */
  signInWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple n'a pas renvoyé d'identifiant.");

      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) throw error;

      // Apple shares the name only on the very first sign-in: keep it
      const first = credential.fullName?.givenName || null;
      const last = credential.fullName?.familyName || null;
      if (data.user && (first || last)) {
        const full = [first, last].filter(Boolean).join(' ');
        await supabase.auth.updateUser({ data: { first_name: first, last_name: last, full_name: full } });
        await supabase.from('profiles').update({ first_name: first, last_name: last, full_name: full }).eq('id', data.user.id);
      }
      await get().reloadProfile();
      set({ isLoading: false });
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        set({ isLoading: false });
        return { success: false, cancelled: true };
      }
      console.error('Apple Sign-In error:', err);
      set({ error: translateAuthError(err), isLoading: false });
      return { success: false, error: err?.message };
    }
  },

  login: async (email, pass) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) throw error;
      
      if (!data.user) throw new Error('Utilisateur non trouvé');

      // Fetch role from profiles table
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        const newProfile = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Utilisateur',
          first_name: data.user.user_metadata?.first_name || null,
          last_name: data.user.user_metadata?.last_name || null,
          role: data.user.user_metadata?.role || 'athlete',
        };
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .maybeSingle();
        if (upserted) profile = upserted;
      }

      const userProfile = buildUserProfile(data.user, profile);
      await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));

      set({ 
        user: userProfile, 
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({ error: translateAuthError(err), isLoading: false });
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true, error: null });
    const { email, pass, firstName, lastName, role, gender, disciplines, height, weight, objective, groupName, subgroups } = signupData;
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      const profileData = {
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
        date_of_birth: signupData.dateOfBirth || null,
      };

      // Store in options.data so handle_new_user trigger populates profiles immediately
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: pass,
        options: { 
          data: profileData 
        }
      });
      if (error) throw error;

      if (data.user) {
        // Cache pending signup data so verifyOtp can ensure it's saved after authentication
        await AsyncStorage.setItem(PENDING_SIGNUP_DATA_KEY, JSON.stringify(profileData));
        if (signupData.consents?.length) {
          await AsyncStorage.setItem(PENDING_CONSENTS_KEY, JSON.stringify(signupData.consents));
        }

        // Try writing to profiles directly (works if confirmation is disabled)
        if (data.session) {
          await saveProfileFields(data.user.id, profileData);
          await flushPendingConsents();
        }

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
      set({ error: translateAuthError(err), isLoading: false });
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
        // Now that the user is officially authenticated, ensure any pending signup data is updated
        try {
          const pendingRaw = await AsyncStorage.getItem(PENDING_SIGNUP_DATA_KEY);
          if (pendingRaw) {
            const pendingData = JSON.parse(pendingRaw);
            const { error: saveError } = await saveProfileFields(data.user.id, pendingData);
            if (!saveError) await AsyncStorage.removeItem(PENDING_SIGNUP_DATA_KEY);
          }
          await flushPendingConsents();
        } catch (e) {
          console.warn('Error applying pending signup data on verifyOtp:', e);
        }

        // Fetch the real profile from DB to get the correct role and all fields
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
      set({ error: translateAuthError(err), isLoading: false });
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
      set({ error: translateAuthError(err), isLoading: false });
    }
  },

  logout: async () => {
    // This phone stops receiving this account's notifications (best effort, before the session ends)
    const leaving = get().user?.id;
    if (leaving) await unregisterPushToken(leaving).catch(() => undefined);
    // The next person on this phone must not get this account's session reminders
    await cancelSessionReminders().catch(() => undefined);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    }
    await AsyncStorage.removeItem(CACHE_PROFILE_KEY);
    // The AI chat history is personal: never leave it to the next account on this phone
    useSprintyChatStore.getState().reset();
    useConsentStore.getState().reset();
    useOnboardingStore.getState().reset();
    useEntitlementStore.getState().reset();
    set({ user: null, pendingEmail: null, isLoading: false });
  },

  clearError: () => set({ error: null }),

  updateSleepGoal: async (goal: number) => {
    const { user } = get();
    if (!user) return;
    
    // Optimistic update
    const updatedUser = { ...user, sleepGoal: goal };
    set({ user: updatedUser });
    await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(updatedUser));
    
    // Persist to DB
    try {
      await supabase
        .from('profiles')
        .update({ sleep_goal: goal })
        .eq('id', user.id);
    } catch (err) {
      console.warn('Error updating sleep goal:', err);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user } = get();
    if (!user) return false;
    
    // Optimistic update
    const updatedUser = { ...user, ...updates };
    set({ user: updatedUser });
    await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(updatedUser));
    
    // Prepare DB object
    const dbUpdates: any = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.name !== undefined) dbUpdates.full_name = updates.name;
    if (updates.height !== undefined) dbUpdates.height = updates.height;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.disciplines !== undefined) dbUpdates.disciplines = updates.disciplines;
    if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName;
    if (updates.subgroups !== undefined) dbUpdates.subgroups = updates.subgroups;
      if (updates.currentFlowStreak !== undefined) dbUpdates.current_flow_streak = updates.currentFlowStreak;
      if (updates.lastFlowDate !== undefined) dbUpdates.last_flow_date = updates.lastFlowDate;

    if (Object.keys(dbUpdates).length === 0) return true;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating profile in DB:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception updating profile:', err);
      return false;
    }
  },

  reloadProfile: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        set({ isLoading: false });
        return;
      }

      const userId = session.user.id;
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        const newProfile = {
          id: userId,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Utilisateur',
          first_name: session.user.user_metadata?.first_name || null,
          last_name: session.user.user_metadata?.last_name || null,
          role: session.user.user_metadata?.role || 'athlete',
        };
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .maybeSingle();
        if (upserted) profile = upserted;
      }

      const userProfile = buildUserProfile(session.user, profile);
      await AsyncStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(userProfile));
      set({ user: userProfile, isLoading: false, isInitialized: true, error: null });
    } catch (err) {
      console.warn('Error reloading profile in store:', err);
      set({ isLoading: false });
    }
  },
}));


