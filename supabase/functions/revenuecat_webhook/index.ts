// deno-lint-ignore-file no-explicit-any
/**
 * RevenueCat webhook: keeps the `subscriptions` table in sync with the stores.
 * - No JWT (RevenueCat calls it): the shared secret in the Authorization header is the only credential.
 * - Writes with the service role; users can only read their own rows (RLS).
 * - Events can arrive out of order: a row is only updated by an event newer than the last one applied.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Product ids: athlete_plus_monthly, coach_pro_yearly, or Google's "subscription:baseplan" form. */
export function planOf(productId: unknown): 'athlete_plus' | 'athlete_pro' | 'coach_plus' | 'coach_pro' | null {
  const p = String(productId ?? '').toLowerCase();
  if (p.includes('athlete_pro')) return 'athlete_pro';
  if (p.includes('athlete_plus') || p.includes('athlete_premium')) return 'athlete_plus';
  if (p.includes('coach_pro')) return 'coach_pro';
  if (p.includes('coach_plus')) return 'coach_plus';
  return null;
}

const storeOf = (s: unknown) => {
  const v = String(s ?? '').toUpperCase();
  if (v === 'APP_STORE' || v === 'MAC_APP_STORE') return 'app_store';
  if (v === 'PLAY_STORE') return 'play_store';
  if (v === 'PROMOTIONAL') return 'promotional';
  return v ? v.toLowerCase() : null;
};

export function userIdOf(event: any): string | null {
  const candidates = [event?.app_user_id, event?.original_app_user_id, ...(Array.isArray(event?.aliases) ? event.aliases : [])];
  return candidates.find((c) => typeof c === 'string' && UUID.test(c)) ?? null;
}

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const secret = Deno.env.get('RC_WEBHOOK_SECRET');
  if (!secret) {
    console.error('RC_WEBHOOK_SECRET is not set');
    return json({ error: 'not configured' }, 503);
  }
  const header = (req.headers.get('Authorization') ?? '').trim();
  const given = header.replace(/^Bearer\s+/i, '');
  if (!given || !safeEqual(given, secret)) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (!event || typeof event.type !== 'string') return json({ error: 'bad payload' }, 400);
  if (event.type === 'TEST') return json({ ok: true, test: true });

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const eventMs = Number(event.event_timestamp_ms) || Date.now();

  try {
    // Subscription moved to another account: move the rows with it
    if (event.type === 'TRANSFER') {
      const from: string[] = (Array.isArray(event.transferred_from) ? event.transferred_from : []).filter((x: any) => UUID.test(x));
      const to: string | undefined = (Array.isArray(event.transferred_to) ? event.transferred_to : []).find((x: any) => UUID.test(x));
      if (to && from.length) {
        const { data: rows } = await db.from('subscriptions').select('*').in('user_id', from);
        for (const r of rows ?? []) {
          await db.from('subscriptions').delete().eq('user_id', r.user_id).eq('product_id', r.product_id);
          await db.from('subscriptions').upsert({ ...r, user_id: to, updated_at: new Date().toISOString() }, { onConflict: 'user_id,product_id' });
        }
      }
      return json({ ok: true });
    }

    const userId = userIdOf(event);
    const plan = planOf(event.product_id);
    if (!userId || !plan) return json({ ok: true, ignored: true });

    const { data: existing } = await db
      .from('subscriptions')
      .select('last_event_ms, current_period_end, status, store, source')
      .eq('user_id', userId)
      .eq('product_id', event.product_id)
      .maybeSingle();
    if (existing && Number(existing.last_event_ms) > eventMs) return json({ ok: true, stale: true });

    const expiresAt = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)).toISOString() : existing?.current_period_end ?? null;
    const isPromo = String(event.store ?? '').toUpperCase() === 'PROMOTIONAL';
    let status: 'active' | 'trialing' | 'grace' | 'expired' = existing?.status ?? 'active';
    let willRenew = true;
    let periodEnd = expiresAt;

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
      case 'NON_RENEWING_PURCHASE':
        status = String(event.period_type ?? '').toUpperCase() === 'TRIAL' ? 'trialing' : 'active';
        willRenew = event.type !== 'NON_RENEWING_PURCHASE';
        break;
      case 'CANCELLATION':
        // Access lasts until the end of the paid period, unless the purchase was refunded
        willRenew = false;
        if (String(event.cancel_reason ?? '').toUpperCase() === 'CUSTOMER_SUPPORT') {
          status = 'expired';
          periodEnd = new Date().toISOString();
        }
        break;
      case 'BILLING_ISSUE':
        status = 'grace';
        break;
      case 'EXPIRATION':
        status = 'expired';
        willRenew = false;
        break;
      case 'SUBSCRIPTION_PAUSED':
        willRenew = false;
        break;
      default:
        return json({ ok: true, ignored: event.type });
    }

    const { error } = await db.from('subscriptions').upsert(
      {
        user_id: userId,
        product_id: event.product_id,
        plan,
        store: storeOf(event.store) ?? existing?.store ?? null,
        status,
        current_period_end: periodEnd,
        will_renew: willRenew,
        source: event.store ? (isPromo ? 'promo' : 'purchase') : existing?.source ?? 'purchase',
        last_event_ms: eventMs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,product_id' }
    );
    if (error) {
      console.error('subscriptions upsert failed', error.message);
      return json({ error: 'db' }, 500); // RevenueCat retries
    }
    return json({ ok: true });
  } catch (e) {
    console.error('revenuecat_webhook error', e);
    return json({ error: 'server' }, 500);
  }
});
