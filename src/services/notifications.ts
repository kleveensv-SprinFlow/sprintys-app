import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

/**
 * Notifications of the app.
 *  - Reminders of upcoming sessions are scheduled on the phone itself (they need no server and work offline).
 *  - Push notifications from the server (new session, message…) use the device token registered here; they only
 *    arrive once the push credentials are set up on the server side.
 * Nothing is asked until the person turns notifications on.
 */
const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';
const prefKey = (uid: string) => `notif-pref:${uid}`; // 'on' | 'off'; absent = never asked
const promptKey = (uid: string) => `notif-prompt-dismissed:${uid}`;
const REMINDER_PREFIX = 'session-';
const REMINDER_DAYS = 14;
/** Reminder time for a session without a precise hour, and lead time when there is one */
const DEFAULT_HOUR = 8;
const LEAD_MINUTES = 60;

export type NotifStatus = 'on' | 'off' | 'denied' | 'unavailable';

export function configureNotifications() {
  if (!NATIVE) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('sessions', { name: 'Séances', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => undefined);
    Notifications.setNotificationChannelAsync('messages', { name: 'Messages et alertes', importance: Notifications.AndroidImportance.HIGH }).catch(() => undefined);
  }
}

async function permissionGranted(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Current state for the settings row */
export async function notificationStatus(uid: string): Promise<NotifStatus> {
  if (!NATIVE) return 'unavailable';
  const pref = await AsyncStorage.getItem(prefKey(uid)).catch(() => null);
  if (pref === 'on' && (await permissionGranted())) return 'on';
  if (pref === 'on') return 'denied'; // switched off in the phone's settings
  return 'off';
}

/** Whether the soft invitation card should still be shown */
export async function shouldInvite(uid: string): Promise<boolean> {
  if (!NATIVE) return false;
  const [pref, dismissed] = await Promise.all([
    AsyncStorage.getItem(prefKey(uid)).catch(() => null),
    AsyncStorage.getItem(promptKey(uid)).catch(() => null),
  ]);
  return pref == null && dismissed == null;
}

export async function dismissInvite(uid: string) {
  await AsyncStorage.setItem(promptKey(uid), '1').catch(() => undefined);
}

/** Asks the system permission, then turns reminders and push on. Returns the resulting state. */
export async function enableNotifications(uid: string, role: 'athlete' | 'coach'): Promise<NotifStatus> {
  if (!NATIVE) return 'unavailable';
  let granted = await permissionGranted();
  if (!granted) {
    try {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    } catch {
      granted = false;
    }
  }
  if (!granted) return 'denied';
  await AsyncStorage.setItem(prefKey(uid), 'on').catch(() => undefined);
  // Reminders first (they work offline); the push token can take its time and is not awaited
  if (role === 'athlete') await syncSessionReminders(uid);
  registerPushToken(uid).catch(() => undefined);
  return 'on';
}

export async function disableNotifications(uid: string) {
  if (!NATIVE) return;
  await AsyncStorage.setItem(prefKey(uid), 'off').catch(() => undefined);
  await cancelSessionReminders();
  await unregisterPushToken(uid);
}

/** Device token for server pushes (FCM on Android, APNs on iOS). Silently does nothing while push is not configured. */
export async function registerPushToken(uid: string) {
  if (!NATIVE) return;
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    const token = typeof t.data === 'string' ? t.data : JSON.stringify(t.data);
    if (!token) return;
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    await AsyncStorage.setItem(`push-token:${uid}`, token).catch(() => undefined);
  } catch {
    /* no push credentials in this build: local reminders still work */
  }
}

/** Forgets this phone's token on the server. Uses the stored token only (asking the system for one can hang offline). */
export async function unregisterPushToken(uid: string) {
  if (!NATIVE) return;
  try {
    const token = await AsyncStorage.getItem(`push-token:${uid}`);
    if (!token) return;
    await Promise.race([
      supabase.rpc('unregister_push_token', { p_token: token }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    await AsyncStorage.removeItem(`push-token:${uid}`).catch(() => undefined);
  } catch {
    /* nothing registered */
  }
}

export async function cancelSessionReminders() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((n) => n.identifier.startsWith(REMINDER_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {
    /* nothing scheduled */
  }
}

/** When to remind for a session: an hour before its time, else 8:00 the same morning. Null when that moment has passed. */
export function reminderDate(workout: { date_prevue: string; measures?: any }, now = new Date()): Date | null {
  const at = new Date(workout.date_prevue);
  if (Number.isNaN(at.getTime())) return null;
  let when: Date;
  if (workout.measures?.has_time) {
    when = new Date(at.getTime() - LEAD_MINUTES * 60000);
  } else {
    when = new Date(at);
    when.setHours(DEFAULT_HOUR, 0, 0, 0);
  }
  return when.getTime() > now.getTime() + 30000 ? when : null;
}

/**
 * Re-plans the reminders of the next two weeks from the athlete's pending sessions. Cheap and idempotent: called
 * at launch, when the app comes back to the front and after the calendar changed.
 */
export async function syncSessionReminders(uid: string) {
  if (!NATIVE) return;
  if ((await notificationStatus(uid)) !== 'on') {
    await cancelSessionReminders();
    return;
  }
  try {
    const now = new Date();
    const end = new Date(now.getTime() + REMINDER_DAYS * 86400000);
    const { data, error } = await supabase
      .from('workouts')
      .select('id, date_prevue, type_seance, status, measures')
      .eq('athlete_id', uid)
      .eq('status', 'pending')
      .gte('date_prevue', new Date(now.getTime() - 86400000).toISOString())
      .lte('date_prevue', end.toISOString())
      .order('date_prevue', { ascending: true })
      .limit(40);
    if (error) throw error;

    await cancelSessionReminders();
    for (const w of data || []) {
      const m: any = (w as any).measures || {};
      if (m.is_master || m.kind === 'rest' || /repos/i.test((w as any).type_seance || '')) continue;
      const when = reminderDate(w as any, now);
      if (!when) continue;
      const d = new Date((w as any).date_prevue);
      const hm = m.has_time ? ` · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${(w as any).id}`,
        content: {
          title: m.has_time ? 'Séance dans 1 h' : 'Séance aujourd’hui',
          body: `${(w as any).type_seance || 'Séance'}${hm}`,
          data: { route: `/(athlete)/day/${dayKey}`, workoutId: (w as any).id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'sessions' },
      });
    }
  } catch {
    /* reminders are a convenience: never block the app */
  }
}

/** Screen to open when a notification is tapped (local reminders and pushes sent by the server) */
export function routeOfNotification(data: any): string | null {
  const pick = (d: any): string | null => (typeof d?.route === 'string' && d.route.startsWith('/') ? d.route : null);
  const direct = pick(data);
  if (direct) return direct;
  // Some platforms hand the custom payload back as a JSON string
  for (const k of ['dataString', 'body']) {
    if (typeof data?.[k] === 'string') {
      try {
        const r = pick(JSON.parse(data[k]));
        if (r) return r;
      } catch {
        /* not JSON */
      }
    }
  }
  return null;
}
