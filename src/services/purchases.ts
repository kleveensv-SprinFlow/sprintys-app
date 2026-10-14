import { Linking, Platform } from 'react-native';
import { FALLBACK_PRICES, PRODUCT_IDS, type PaidTier, type Period } from '../features/billing/plans';

/**
 * Store purchases through RevenueCat. Everything is a safe no-op when the SDK or its key is missing (web, Expo Go,
 * builds before the stores are set up): the app then simply cannot sell anything and stays free to use.
 */

const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

export const purchasesAvailable = () => Platform.OS !== 'web' && !!KEY;

let sdk: any = null;
let configured = false;
let currentUser: string | null = null;

const load = () => {
  if (sdk || !purchasesAvailable()) return sdk;
  try {
    // Loaded lazily: the native module only exists in builds that include it
    sdk = require('react-native-purchases').default;
  } catch {
    sdk = null;
  }
  return sdk;
};

/** Connects the signed-in account to its purchases. Never throws, never blocks. */
export async function syncPurchasesUser(userId: string | null) {
  const P = load();
  if (!P) return;
  try {
    if (!configured) {
      P.configure({ apiKey: KEY!, appUserID: userId ?? undefined });
      configured = true;
      currentUser = userId;
      return;
    }
    if (userId && userId !== currentUser) {
      currentUser = userId;
      await P.logIn(userId);
    } else if (!userId && currentUser) {
      currentUser = null;
      await P.logOut();
    }
  } catch (e: any) {
    console.warn('purchases sync failed', e?.message);
  }
}

export interface Offer {
  tier: PaidTier;
  period: Period;
  productId: string;
  price: string;
  /** Monthly equivalent of a yearly price, e.g. "2,08 €". */
  perMonth?: string;
  trialDays?: number;
  pkg: any | null;
}

const tierPeriodOf = (productId: string): { tier: PaidTier; period: Period } | null => {
  const id = productId.toLowerCase();
  const tier: PaidTier | null = id.includes('athlete_pro') ? 'pro' : id.includes('athlete_plus') || id.includes('athlete_premium') ? 'plus' : null;
  if (!tier) return null;
  return { tier, period: id.includes('year') || id.includes('annual') ? 'yearly' : 'monthly' };
};

/** Offers sold by the stores, with localised prices. Falls back on the starting prices when unavailable. */
export async function loadOffers(): Promise<{ offers: Offer[]; live: boolean }> {
  const fallback: Offer[] = (['plus', 'pro'] as PaidTier[]).flatMap((tier) =>
    (['monthly', 'yearly'] as Period[]).map((period) => ({
      tier,
      period,
      productId: PRODUCT_IDS[tier][period],
      price: FALLBACK_PRICES[tier][period],
      pkg: null,
    }))
  );
  const P = load();
  if (!P) return { offers: fallback, live: false };
  try {
    const offerings = await P.getOfferings();
    const packages: any[] = offerings?.current?.availablePackages ?? [];
    const found: Offer[] = [];
    for (const pkg of packages) {
      const id = String(pkg?.product?.identifier ?? '');
      const tp = tierPeriodOf(id);
      if (!tp) continue;
      const product = pkg.product;
      const intro = product?.introPrice;
      found.push({
        ...tp,
        productId: id,
        price: String(product?.priceString ?? ''),
        perMonth: tp.period === 'yearly' && product?.price ? formatLike(product.priceString, product.price / 12) : undefined,
        trialDays: intro && Number(intro.price) === 0 ? trialDaysOf(intro) : undefined,
        pkg,
      });
    }
    if (!found.length) return { offers: fallback, live: false };
    // Keep the fallback for anything the store did not return
    const merged = fallback.map((f) => found.find((o) => o.tier === f.tier && o.period === f.period) ?? { ...f, price: '' });
    return { offers: merged, live: true };
  } catch (e: any) {
    console.warn('offerings failed', e?.message);
    return { offers: fallback, live: false };
  }
}

const trialDaysOf = (intro: any): number | undefined => {
  const n = Number(intro?.periodNumberOfUnits) || 0;
  const unit = String(intro?.periodUnit ?? '').toUpperCase();
  if (!n) return undefined;
  return unit === 'DAY' ? n : unit === 'WEEK' ? n * 7 : unit === 'MONTH' ? n * 30 : undefined;
};

/** "2,08 €" in the same currency format as the store price. */
const formatLike = (priceString: string, value: number) => {
  const m = String(priceString).match(/^(\D*)([\d\s.,]+)(\D*)$/);
  if (!m) return '';
  const num = value.toFixed(2).replace('.', String(priceString).includes(',') ? ',' : '.');
  return `${m[1]}${num}${m[3]}`;
};

export type PurchaseResult = { status: 'success' } | { status: 'cancelled' } | { status: 'error'; message: string };

export async function purchaseOffer(offer: Offer): Promise<PurchaseResult> {
  const P = load();
  if (!P || !offer.pkg) return { status: 'error', message: 'Les achats ne sont pas encore disponibles.' };
  try {
    await P.purchasePackage(offer.pkg);
    return { status: 'success' };
  } catch (e: any) {
    if (e?.userCancelled) return { status: 'cancelled' };
    console.warn('purchase failed', e?.message);
    return { status: 'error', message: 'L’achat n’a pas abouti. Tu n’as pas été débité. Réessaie dans un instant.' };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  const P = load();
  if (!P) return { status: 'error', message: 'Les achats ne sont pas encore disponibles.' };
  try {
    await P.restorePurchases();
    return { status: 'success' };
  } catch (e: any) {
    console.warn('restore failed', e?.message);
    return { status: 'error', message: 'La restauration n’a pas abouti. Réessaie dans un instant.' };
  }
}

/** The store's own page to manage or cancel a subscription. */
export const openManageSubscriptions = () =>
  Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions').catch(() => undefined);

/** Promo code: Apple's redemption sheet on iOS, Google Play's redeem page on Android. */
export async function redeemPromoCode() {
  const P = load();
  try {
    if (Platform.OS === 'ios' && P?.presentCodeRedemptionSheet) {
      await P.presentCodeRedemptionSheet();
      return;
    }
  } catch (e: any) {
    console.warn('redeem failed', e?.message);
  }
  Linking.openURL('https://play.google.com/redeem').catch(() => undefined);
}
