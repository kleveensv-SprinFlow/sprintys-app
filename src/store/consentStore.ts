import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { ConsentType, consentTextFor, CONSENT_VERSION } from '../legal/consents';

interface ConsentState {
  /** null until loaded for the signed-in account. */
  active: Set<ConsentType> | null;
  /** Whether the athlete belongs to a team (pending or approved), which makes coach sharing required. */
  inTeam: boolean;
  /** True when a Terms consent was given at some point, even for an older version of the texts. */
  termsEver: boolean;
  loadedFor: string | null;
  /** Role of the signed-in account: the AI consent wording differs for coaches and athletes. */
  role: string | null;
  load: (userId: string, role?: string | null) => Promise<void>;
  grant: (types: ConsentType[]) => Promise<boolean>;
  revoke: (type: ConsentType) => Promise<boolean>;
  has: (type: ConsentType) => boolean;
  reset: () => void;
  /** Sheet asking for the AI consent (rendered once in the root layout). */
  aiPromptOpen: boolean;
  /** Resolves true when AI features may be used (asks the first time). */
  ensureAIConsent: () => Promise<boolean>;
  resolveAIPrompt: (accepted: boolean) => Promise<void>;
}

let aiResolver: ((ok: boolean) => void) | null = null;

export const useConsentStore = create<ConsentState>((set, get) => ({
  active: null,
  inTeam: false,
  termsEver: false,
  loadedFor: null,
  role: null,

  load: async (userId, role) => {
    if (role !== undefined) set({ role });
    const [{ data, error }, team] = await Promise.all([
      supabase.from('user_consents').select('consent_type, version').eq('user_id', userId).is('revoked_at', null),
      supabase.from('team_members').select('team_id').eq('user_id', userId).limit(1),
    ]);
    if (error) {
      // Never lock someone out because of a network error: keep the previous state
      console.error('consents load failed', error.message);
      if (get().loadedFor !== userId) set({ active: new Set(['terms', 'health_profile', 'coach_sharing']), loadedFor: userId });
      return;
    }
    // The Terms count only for the current version of the texts: when they change, they are asked again
    const rows = (data || []) as { consent_type: ConsentType; version: string | null }[];
    const active = new Set<ConsentType>(rows.filter((r) => r.consent_type !== 'terms').map((r) => r.consent_type));
    const termsRows = rows.filter((r) => r.consent_type === 'terms');
    if (termsRows.some((r) => (r.version ?? '') >= CONSENT_VERSION)) active.add('terms');
    set({
      active,
      termsEver: termsRows.length > 0,
      inTeam: (team.data?.length || 0) > 0,
      loadedFor: userId,
    });
  },

  grant: async (types) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid || !types.length) return false;
    const rows = types.map((t) => ({ user_id: uid, consent_type: t, consent_text: consentTextFor(t, get().role), version: CONSENT_VERSION }));
    const { error } = await supabase.from('user_consents').insert(rows);
    if (error) {
      console.error('consent grant failed', error.message);
      return false;
    }
    const next = new Set(get().active || []);
    types.forEach((t) => next.add(t));
    set({ active: next, termsEver: get().termsEver || types.includes('terms') });
    return true;
  },

  revoke: async (type) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { error } = await supabase
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', uid)
      .eq('consent_type', type)
      .is('revoked_at', null);
    if (error) {
      console.error('consent revoke failed', error.message);
      return false;
    }
    const next = new Set(get().active || []);
    next.delete(type);
    set({ active: next });
    return true;
  },

  has: (type) => !!get().active?.has(type),

  reset: () => set({ active: null, inTeam: false, termsEver: false, loadedFor: null, role: null, aiPromptOpen: false }),

  aiPromptOpen: false,

  ensureAIConsent: async () => {
    if (get().active?.has('ai_processing')) return true;
    // Only one sheet at a time
    aiResolver?.(false);
    set({ aiPromptOpen: true });
    return new Promise<boolean>((resolve) => {
      aiResolver = resolve;
    });
  },

  resolveAIPrompt: async (accepted) => {
    const ok = accepted ? await get().grant(['ai_processing']) : false;
    set({ aiPromptOpen: false });
    aiResolver?.(ok);
    aiResolver = null;
  },
}));
