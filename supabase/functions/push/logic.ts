// deno-lint-ignore-file no-explicit-any
/** Pure helpers of the push sender: grouping of queued rows, JWT signing for FCM and APNs. */

export interface OutboxRow {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, any>;
  created_at: string;
}

export interface Notif {
  userId: string;
  kind: string;
  title: string;
  body: string;
  route?: string;
  rowIds: number[];
}

/** Several rows of the same kind for one person become one notification (a copied week is not 6 buzzes). */
export function collapse(rows: OutboxRow[]): Notif[] {
  const out: Notif[] = [];
  const byUser = new Map<string, OutboxRow[]>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  for (const [userId, list] of byUser) {
    const sorted = [...list].sort((a, b) => a.id - b.id);
    const sessions = sorted.filter((r) => r.kind === 'session');
    const messages = sorted.filter((r) => r.kind === 'message');
    const alerts = sorted.filter((r) => r.kind === 'alert');
    const others = sorted.filter((r) => !['session', 'message', 'alert'].includes(r.kind));

    if (sessions.length === 1) out.push(single(sessions[0]));
    else if (sessions.length > 1) {
      out.push({
        userId, kind: 'session', title: 'Planning mis à jour',
        body: `${sessions.length} séances ajoutées ou déplacées`,
        route: '/(athlete)/calendar', rowIds: sessions.map((r) => r.id),
      });
    }

    const byConv = new Map<string, OutboxRow[]>();
    for (const m of messages) {
      const key = String(m.data?.conversation ?? m.data?.route ?? m.id);
      byConv.set(key, [...(byConv.get(key) ?? []), m]);
    }
    for (const group of byConv.values()) {
      const last = group[group.length - 1];
      if (group.length === 1) out.push(single(last));
      else out.push({ userId, kind: 'message', title: last.title, body: `${group.length} nouveaux messages`, route: last.data?.route, rowIds: group.map((r) => r.id) });
    }

    if (alerts.length === 1) out.push(single(alerts[0]));
    else if (alerts.length > 1) {
      out.push({ userId, kind: 'alert', title: 'À surveiller', body: `${alerts.length} athlètes à surveiller`, route: '/(coach)', rowIds: alerts.map((r) => r.id) });
    }

    for (const o of others) out.push(single(o));
  }
  return out;
}

function single(r: OutboxRow): Notif {
  return { userId: r.user_id, kind: r.kind, title: r.title, body: r.body, route: typeof r.data?.route === 'string' ? r.data.route : undefined, rowIds: [r.id] };
}

// ------------------------------------------------------------------------------------------------ signing helpers

export const b64url = (input: ArrayBuffer | Uint8Array | string): string => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN [A-Z ]+-----/g, '').replace(/-----END [A-Z ]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The private key may be stored with literal "\n" sequences (environment variables): restore real line breaks. */
export const normalizePem = (pem: string) => pem.replace(/\\n/g, '\n').trim();

async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, pem: string, algorithm: 'RS256' | 'ES256'): Promise<string> {
  const keyAlg = algorithm === 'RS256'
    ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
    : { name: 'ECDSA', namedCurve: 'P-256' };
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(normalizePem(pem)), keyAlg, false, ['sign']);
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sigAlg = algorithm === 'RS256' ? { name: 'RSASSA-PKCS1-v1_5' } : { name: 'ECDSA', hash: 'SHA-256' };
  const sig = await crypto.subtle.sign(sigAlg, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

/** Assertion exchanged for a Google access token (Firebase Cloud Messaging v1) */
export const fcmAssertion = (clientEmail: string, privateKey: string, nowSec = Math.floor(Date.now() / 1000)) =>
  signJwt({ alg: 'RS256', typ: 'JWT' }, {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  }, privateKey, 'RS256');

/** Provider token for Apple Push: valid 20 to 60 minutes */
export const apnsToken = (teamId: string, keyId: string, privateKey: string, nowSec = Math.floor(Date.now() / 1000)) =>
  signJwt({ alg: 'ES256', kid: keyId }, { iss: teamId, iat: nowSec }, privateKey, 'ES256');

// ------------------------------------------------------------------------------------------------ payloads

export const fcmMessage = (token: string, n: Notif) => ({
  message: {
    token,
    notification: { title: n.title, body: n.body },
    data: n.route ? { route: n.route } : {},
    android: {
      priority: 'HIGH',
      notification: { channel_id: n.kind === 'session' ? 'sessions' : 'messages' },
    },
  },
});

export const apnsPayload = (n: Notif) => ({
  aps: { alert: { title: n.title, body: n.body }, sound: 'default' },
  ...(n.route ? { route: n.route } : {}),
});

/** Permanent failures: the token is dead and must be forgotten */
export const fcmTokenDead = (status: number, body: any) =>
  status === 404 || body?.error?.status === 'NOT_FOUND' || body?.error?.details?.some?.((d: any) => d?.errorCode === 'UNREGISTERED');
export const apnsTokenDead = (status: number, reason?: string) =>
  status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic';
