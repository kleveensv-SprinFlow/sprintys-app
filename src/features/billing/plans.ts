/** Plan names as stored on the server (plan_limits.plan). */
export type PlanName =
  | 'legacy'
  | 'free_athlete'
  | 'free_coach'
  | 'sponsored'
  | 'athlete_premium'
  | 'athlete_plus'
  | 'athlete_pro'
  | 'coach_plus'
  | 'coach_pro';

/** One paid formula for athletes. (Older Pro products, if any, are served as Plus.) */
export type PaidTier = 'plus';
export type Period = 'monthly' | 'yearly';
export type Feature = 'photo' | 'text' | 'scan' | 'chat' | 'plan_long' | 'pdf' | 'weekly_report' | 'adaptive_target' | 'competitions';

/** Everything the app needs to know about the current plan, as returned by get_my_plan_full(). */
export interface PlanInfo {
  plan: PlanName;
  source: 'legacy' | 'own' | 'sponsored' | 'free';
  sponsor_name?: string | null;
  billing_enabled: boolean;
  has_coach?: boolean;
  sprinty_per_day: number;
  photo_per_day: number;
  text_per_day: number;
  scan_per_day: number;
  /** Free plan: shared weekly pool for photo + sentence meal analyses (null = no weekly pool). */
  photo_text_per_week?: number | null;
  sprinty_per_week?: number | null;
  /** Free plan: Sprinty plans one account may ever create (null = no limit). */
  ai_plan_lifetime_max?: number | null;
  plans_created?: number;
  usage_week?: { photo_text: number; chat: number };
  smart_vision: boolean;
  adaptive_target: boolean;
  weekly_report: boolean;
  pdf_export: boolean;
  competition_search: boolean;
  ai_plan_weeks_max: number;
  ai_plans_active: number;
  usage_today: { photo: number; text: number; scan: number; chat: number };
  usage_month: { photo: number; text: number; scan: number; chat: number };
  subscription?: { plan: PlanName; status: string; current_period_end: string; will_renew: boolean; store: string | null; source: string } | null;
}

/** What the paywall sells. Product ids are the ones to create in App Store Connect and Google Play. */
export const PRODUCT_IDS: Record<PaidTier, Record<Period, string>> = {
  plus: { monthly: 'athlete_plus_monthly', yearly: 'athlete_plus_yearly' },
};

/** Starting prices, shown only when the store cannot give the localised ones. */
export const FALLBACK_PRICES: Record<PaidTier, Record<Period, string>> = {
  plus: { monthly: '3,99 €', yearly: '39,99 €' },
};

export const TIER_NAMES: Record<PaidTier, string> = { plus: 'Plus' };

export const tierOf = (plan?: PlanName | null): PaidTier | null =>
  plan && plan !== 'legacy' && plan !== 'free_athlete' && plan !== 'free_coach' ? 'plus' : null;

export const planLabel = (info?: PlanInfo | null): string => {
  if (!info) return 'Gratuit';
  if (info.source === 'sponsored') return 'Plus offert par ton coach';
  const t = tierOf(info.plan);
  if (t === 'plus') return 'Plus';
  return info.plan === 'legacy' ? 'Toutes les fonctions' : 'Gratuit';
};
