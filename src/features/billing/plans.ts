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

export type PaidTier = 'plus' | 'pro';
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
  pro: { monthly: 'athlete_pro_monthly', yearly: 'athlete_pro_yearly' },
};

/** Starting prices, shown only when the store cannot give the localised ones. */
export const FALLBACK_PRICES: Record<PaidTier, Record<Period, string>> = {
  plus: { monthly: '2,99 €', yearly: '24,99 €' },
  pro: { monthly: '5,99 €', yearly: '49,99 €' },
};

export const TIER_NAMES: Record<PaidTier, string> = { plus: 'Plus', pro: 'Pro' };

export const tierOf = (plan?: PlanName | null): PaidTier | null =>
  plan === 'athlete_pro' || plan === 'coach_pro' ? 'pro' : plan === 'athlete_plus' || plan === 'athlete_premium' || plan === 'coach_plus' || plan === 'sponsored' ? 'plus' : null;

export const planLabel = (info?: PlanInfo | null): string => {
  if (!info) return 'Gratuit';
  if (info.source === 'sponsored') return 'Plus offert par ton coach';
  const t = tierOf(info.plan);
  if (t === 'pro') return 'Pro';
  if (t === 'plus') return 'Plus';
  return info.plan === 'legacy' ? 'Toutes les fonctions' : 'Gratuit';
};
