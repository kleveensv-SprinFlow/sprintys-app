// deno-lint-ignore-file no-explicit-any
/**
 * Sends the queued notifications (table push_outbox) to the phones (table push_tokens).
 * Woken every minute by pg_cron (see migration 20261023100000). No JWT: it only ever delivers what the database
 * itself queued, so calling it by hand cannot make it send anything else.
 *
 * Secrets (Supabase): FCM_SERVICE_ACCOUNT (the JSON key of a Firebase service account),
 * APNS_KEY (contents of the .p8 key), APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_ENV ('production' | 'sandbox').
 * Either side can be missing: that platform is then skipped.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { apnsPayload, apnsToken, apnsTokenDead, collapse, fcmAssertion, fcmMessage, fcmTokenDead, Notif, OutboxRow } from './logic.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fcmCache: { token: string; exp: number } | null = null;
let apnsCache: { token: string; exp: number } | null = null;

async function fcmAccess(sa: { client_email: string; private_key: string }): Promise<string> {
  if (fcmCache && fcmCache.exp > Date.now() + 60_000) return fcmCache.token;
  const assertion = await fcmAssertion(sa.client_email, sa.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`fcm_auth_${res.status}`);
  fcmCache = { token: body.access_token, exp: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return fcmCache.token;
}

async function apnsAuth(teamId: string, keyId: string, key: string): Promise<string> {
  if (apnsCache && apnsCache.exp > Date.now()) return apnsCache.token;
  const token = await apnsToken(teamId, keyId, key);
  apnsCache = { token, exp: Date.now() + 40 * 60_000 };
  return token;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'config' }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  let sa: any = null;
  try {
    const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
    sa = raw ? JSON.parse(raw) : null;
  } catch {
    sa = null;
  }
  const apns = {
    key: Deno.env.get('APNS_KEY'),
    keyId: Deno.env.get('APNS_KEY_ID'),
    teamId: Deno.env.get('APNS_TEAM_ID'),
    bundleId: Deno.env.get('APNS_BUNDLE_ID') ?? 'com.sprintflow.inc',
    host: Deno.env.get('APNS_ENV') === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com',
  };
  const fcmReady = !!(sa?.client_email && sa?.private_key && sa?.project_id);
  const apnsReady = !!(apns.key && apns.keyId && apns.teamId);
  if (!fcmReady && !apnsReady) return json({ skipped: 'not_configured' });

  // A run that crashed leaves rows claimed: give them back after 5 minutes
  await db.from('push_outbox').update({ claimed_at: null }).is('sent_at', null).lt('claimed_at', new Date(Date.now() - 5 * 60_000).toISOString());

  // Claim what is ready (older than 20 s, so a burst of rows is grouped); one UPDATE, so two runs never take the same row
  const { data: claimed, error } = await db
    .from('push_outbox')
    .update({ claimed_at: new Date().toISOString() })
    .is('sent_at', null)
    .is('claimed_at', null)
    .lt('created_at', new Date(Date.now() - 20_000).toISOString())
    .select('id, user_id, kind, title, body, data, created_at');
  if (error) return json({ error: 'claim' }, 500);
  const rows = (claimed ?? []) as OutboxRow[];
  if (rows.length === 0) return json({ sent: 0 });

  const notifs: Notif[] = collapse(rows);
  const userIds = [...new Set(notifs.map((n) => n.userId))];
  const { data: tokenRows } = await db.from('push_tokens').select('user_id, token, platform').in('user_id', userIds);
  const tokensByUser = new Map<string, { token: string; platform: string }[]>();
  for (const t of tokenRows ?? []) tokensByUser.set(t.user_id, [...(tokensByUser.get(t.user_id) ?? []), t]);

  const dead: string[] = [];
  let delivered = 0;
  let failed = 0;
  const errorsByRow = new Map<number, string>();

  for (const n of notifs) {
    let okAny = false;
    let lastError = '';
    for (const t of tokensByUser.get(n.userId) ?? []) {
      try {
        if (t.platform === 'android' && fcmReady) {
          const access = await fcmAccess(sa);
          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fcmMessage(t.token, n)),
          });
          if (res.ok) okAny = true;
          else {
            const body = await res.json().catch(() => ({}));
            if (fcmTokenDead(res.status, body)) dead.push(t.token);
            lastError = `fcm_${res.status}`;
          }
        } else if (t.platform === 'ios' && apnsReady) {
          const jwt = await apnsAuth(apns.teamId!, apns.keyId!, apns.key!);
          const res = await fetch(`https://${apns.host}/3/device/${t.token}`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${jwt}`,
              'apns-topic': apns.bundleId,
              'apns-push-type': 'alert',
              'apns-priority': '10',
            },
            body: JSON.stringify(apnsPayload(n)),
          });
          if (res.ok) okAny = true;
          else {
            const body = await res.json().catch(() => ({}));
            if (apnsTokenDead(res.status, body?.reason)) dead.push(t.token);
            lastError = `apns_${res.status}_${body?.reason ?? ''}`;
            if (res.status === 403) apnsCache = null; // expired or refused provider token: sign a new one next time
          }
        }
      } catch (e: any) {
        lastError = String(e?.message ?? e).slice(0, 120);
      }
    }
    if (okAny) delivered += 1;
    else failed += 1;
    for (const id of n.rowIds) if (!okAny && lastError) errorsByRow.set(id, lastError);
  }

  if (dead.length) await db.from('push_tokens').delete().in('token', dead);

  // Rows are closed whatever happened: a notification that cannot be delivered is not retried forever
  const now = new Date().toISOString();
  const withError = [...errorsByRow.keys()];
  const ok = rows.map((r) => r.id).filter((id) => !errorsByRow.has(id));
  if (ok.length) await db.from('push_outbox').update({ sent_at: now }).in('id', ok);
  for (const id of withError) await db.from('push_outbox').update({ sent_at: now, error: errorsByRow.get(id) }).eq('id', id);

  return json({ delivered, failed, removed_tokens: dead.length });
});
