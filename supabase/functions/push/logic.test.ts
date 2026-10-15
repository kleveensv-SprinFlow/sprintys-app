import { assertEquals, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { apnsPayload, apnsToken, b64url, collapse, fcmAssertion, fcmMessage } from './logic.ts';

const row = (id: number, user: string, kind: string, data: any = {}) => ({ id, user_id: user, kind, title: 't' + id, body: 'b' + id, data, created_at: '' });

Deno.test('collapse groups sessions, messages by conversation and alerts per user', () => {
  const out = collapse([
    row(1, 'a', 'session', { route: '/x' }), row(2, 'a', 'session'), row(3, 'a', 'session'),
    row(4, 'a', 'message', { conversation: 'c1', route: '/chat/direct/1' }), row(5, 'a', 'message', { conversation: 'c1', route: '/chat/direct/1' }),
    row(6, 'a', 'message', { conversation: 'c2', route: '/chat/team/9' }),
    row(7, 'b', 'alert', { route: '/(coach)/athlete/1' }), row(8, 'b', 'alert'),
    row(9, 'c', 'session', { route: '/(athlete)/day/2026-10-20' }),
  ]);
  const a = out.filter((n) => n.userId === 'a');
  assertEquals(a.length, 3);
  assertEquals(a.find((n) => n.kind === 'session')!.body, '3 séances ajoutées ou déplacées');
  assertEquals(a.filter((n) => n.kind === 'message').map((n) => n.rowIds.length).sort(), [1, 2]);
  assertEquals(out.find((n) => n.userId === 'b')!.body, '2 athlètes à surveiller');
  const c = out.find((n) => n.userId === 'c')!;
  assertEquals(c.route, '/(athlete)/day/2026-10-20');
  assertEquals(c.rowIds, [9]);
});

Deno.test('APNs provider token is a valid ES256 JWT', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  let bin = ''; for (const b of pkcs8) bin += String.fromCharCode(b);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin)}\n-----END PRIVATE KEY-----`;
  const jwt = await apnsToken('TEAM123456', 'KEY1234567', pem, 1_700_000_000);
  const [h, p, s] = jwt.split('.');
  assertEquals(JSON.parse(atob(h.replace(/-/g, '+').replace(/_/g, '/'))), { alg: 'ES256', kid: 'KEY1234567' });
  assertEquals(JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))), { iss: 'TEAM123456', iat: 1_700_000_000 });
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
  assertEquals(sig.length, 64);
  assert(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, sig, new TextEncoder().encode(`${h}.${p}`)));
});

Deno.test('FCM assertion is a valid RS256 JWT (also with \\n-escaped keys)', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  let bin = ''; for (const b of pkcs8) bin += String.fromCharCode(b);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin)}\n-----END PRIVATE KEY-----`.replace(/\n/g, '\\n');
  const jwt = await fcmAssertion('svc@proj.iam.gserviceaccount.com', pem, 1_700_000_000);
  const [h, p, s] = jwt.split('.');
  const pad = (x: string) => x.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (x.length % 4)) % 4);
  assertEquals(JSON.parse(atob(pad(p))).exp, 1_700_003_600);
  const sig = Uint8Array.from(atob(pad(s)), (c) => c.charCodeAt(0));
  assert(await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, kp.publicKey, sig, new TextEncoder().encode(`${h}.${p}`)));
});

Deno.test('payloads carry the route', () => {
  const n = { userId: 'a', kind: 'session', title: 'T', body: 'B', route: '/(athlete)/day/2026-10-20', rowIds: [1] };
  assertEquals(fcmMessage('tok', n).message.data, { route: '/(athlete)/day/2026-10-20' });
  assertEquals(fcmMessage('tok', n).message.android.notification.channel_id, 'sessions');
  assertEquals((apnsPayload(n) as any).route, '/(athlete)/day/2026-10-20');
  assertEquals(b64url('hi?>'), 'aGk_Pg');
});
