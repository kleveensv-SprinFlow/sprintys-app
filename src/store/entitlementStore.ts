import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Feature, PlanInfo } from '../features/billing/plans';

/**
 * The plan of the signed-in account, as computed by the server (get_my_plan_full). Nothing here is trusted for
 * security: the server enforces every limit. This store only lets the app show the right thing at the right time.
 */
interface EntitlementState {
  info: PlanInfo | null;
  loadedFor: string | null;
  /** Reason the paywall is open (null = closed). */
  paywall: { feature: Feature | 'profile'; detail?: string } | null;
  refresh: (userId?: string | null) => Promise<void>;
  /** Refreshes a few times after a purchase, until the store's notification reaches the server. */
  refreshAfterPurchase: () => Promise<void>;
  openPaywall: (feature: Feature | 'profile', detail?: string) => void;
  closePaywall: () => void;
  /** Counts a use locally (the server already counted it). */
  noteUse: (kind: 'photo' | 'text' | 'scan' | 'chat') => void;
  reset: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  info: null,
  loadedFor: null,
  paywall: null,

  refresh: async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_my_plan_full' as any);
      if (error || !data) return;
      set({ info: data as PlanInfo, loadedFor: userId ?? get().loadedFor });
    } catch {
      // keep the previous plan: never block the app on this
    }
  },

  refreshAfterPurchase: async () => {
    const before = get().info?.plan;
    for (let i = 0; i < 8; i++) {
      await get().refresh();
      if (get().info?.plan !== before) return;
      await new Promise((r) => setTimeout(r, 2500));
    }
  },

  openPaywall: (feature, detail) => set({ paywall: { feature, detail } }),
  closePaywall: () => set({ paywall: null }),

  noteUse: (kind) =>
    set((s) =>
      s.info
        ? {
            info: {
              ...s.info,
              usage_today: { ...s.info.usage_today, [kind]: (s.info.usage_today?.[kind] ?? 0) + 1 },
              usage_week: s.info.usage_week
                ? { photo_text: s.info.usage_week.photo_text + (kind === 'photo' || kind === 'text' ? 1 : 0), chat: s.info.usage_week.chat + (kind === 'chat' ? 1 : 0) }
                : s.info.usage_week,
            },
          }
        : s
    ),

  reset: () => set({ info: null, loadedFor: null, paywall: null }),
}));

/** True when the server applies plan limits (billing switched on). Until then nothing is limited and no paywall shows. */
export const billingOn = () => useEntitlementStore.getState().info?.billing_enabled === true;

/**
 * Uses left in the current window for a limited plan, or null when there is nothing to count (billing off, or no limit
 * for this feature: barcode scans are free for everyone). Photo and sentence share one weekly pool on the free plan.
 */
export const remainingToday = (info: PlanInfo | null, kind: 'photo' | 'text' | 'scan'): number | null => {
  if (!info || !info.billing_enabled || kind === 'scan') return null;
  if (info.photo_text_per_week != null) return Math.max(0, info.photo_text_per_week - (info.usage_week?.photo_text ?? 0));
  const limit = kind === 'photo' ? info.photo_per_day : info.text_per_day;
  return Math.max(0, limit - (info.usage_today?.[kind] ?? 0));
};

