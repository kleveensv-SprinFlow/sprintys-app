import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { workoutService } from './workoutService';

/**
 * Session results typed without a connection (track, gym basement…) are kept on the phone and sent as soon as
 * the network is back. One entry per session: validating again replaces the waiting one.
 */
export interface OutboxItem {
  workoutId: string;
  efforts: any[];
  measures: any;
  queuedAt: number;
  /** Failed attempts that were neither a lost connection nor a definitive refusal */
  attempts?: number;
}

const keyOf = (userId: string) => `results-outbox:${userId}`;

interface OutboxState {
  /** Sessions whose results are waiting to be sent (for the badge in the session sheet) */
  pendingIds: string[];
  /** Bumped when something was sent, so screens can reload */
  sentCount: number;
  /** Sessions whose waiting results were really delivered (most recent last) */
  sentIds: string[];
  set: (ids: string[]) => void;
}

export const useOutboxStore = create<OutboxState>((set) => ({
  pendingIds: [],
  sentCount: 0,
  sentIds: [],
  set: (ids) => set({ pendingIds: ids }),
}));

/** A failure of the connection itself (the server never answered), as opposed to a refusal by the server */
export function isNetworkError(e: any): boolean {
  if (!e) return false;
  if (e.code && typeof e.code === 'string' && e.code !== 'ETIMEDOUT') return false;
  if (typeof e.status === 'number' && e.status >= 400) return false;
  const msg = String(e.message ?? e);
  return /network request failed|failed to fetch|network error|timeout|timed out|offline|load failed|internet/i.test(msg);
}

/**
 * The server will never accept this entry: the session no longer exists, or belongs to somebody else. Anything
 * else (expired token still refreshing, overloaded server, gateway page…) is worth another try later.
 */
export function isDefinitiveRefusal(e: any): boolean {
  const msg = String(e?.message ?? e ?? '');
  return /workout not found|permission denied/i.test(msg) || e?.code === '23503' || e?.code === '22P02';
}

const MAX_ATTEMPTS = 30;

async function read(userId: string): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function write(userId: string, list: OutboxItem[]): Promise<boolean> {
  let ok = true;
  try {
    if (list.length === 0) await AsyncStorage.removeItem(keyOf(userId));
    else await AsyncStorage.setItem(keyOf(userId), JSON.stringify(list));
  } catch {
    ok = false; // storage full or unavailable
  }
  useOutboxStore.getState().set(list.map((i) => i.workoutId));
  return ok;
}

let flushing = false;

export const resultsOutbox = {
  /** Loads the waiting list into the store (app start / login) */
  hydrate: async (userId: string) => {
    useOutboxStore.getState().set((await read(userId)).map((i) => i.workoutId));
  },

  /** False when the phone could not keep the entry (storage full): the caller must not promise it will be sent */
  enqueue: async (userId: string, item: Omit<OutboxItem, 'queuedAt'>): Promise<boolean> => {
    const list = (await read(userId)).filter((i) => i.workoutId !== item.workoutId);
    list.push({ ...item, queuedAt: Date.now() });
    return write(userId, list);
  },

  /** Forgets what waits for a session (it was just sent directly) */
  drop: async (userId: string, workoutId: string) => {
    const list = await read(userId);
    if (list.some((i) => i.workoutId === workoutId)) await write(userId, list.filter((i) => i.workoutId !== workoutId));
  },

  has: (workoutId: string) => useOutboxStore.getState().pendingIds.includes(workoutId),

  /**
   * Tries to send what is waiting. Stops at the first network failure (still offline); an entry the server
   * refuses for good (session deleted by the coach, no longer allowed) is dropped so it cannot block the rest.
   */
  flush: async (userId: string): Promise<{ sent: number; dropped: number; remaining: number; sentIds: string[]; droppedIds: string[] }> => {
    if (flushing) return { sent: 0, dropped: 0, remaining: useOutboxStore.getState().pendingIds.length, sentIds: [], droppedIds: [] };
    flushing = true;
    const sentIds: string[] = [];
    const droppedIds: string[] = [];
    try {
      const list = await read(userId);
      for (const item of list) {
        let done = false;
        let bump = false;
        try {
          await workoutService.submitWorkoutResults(item.workoutId, item.efforts, item.measures);
          sentIds.push(item.workoutId);
          done = true;
          AsyncStorage.removeItem(`session-draft:${userId}:${item.workoutId}`).catch(() => undefined);
        } catch (e: any) {
          if (isNetworkError(e)) break; // still offline: keep everything, try again later
          if (isDefinitiveRefusal(e) || (item.attempts ?? 0) + 1 >= MAX_ATTEMPTS) {
            droppedIds.push(item.workoutId);
            done = true;
          } else bump = true;
        }
        // Re-read: the athlete may have queued something newer for this session (or others) meanwhile
        const fresh = await read(userId);
        const next = fresh
          .filter((i) => !(done && i.workoutId === item.workoutId && i.queuedAt === item.queuedAt))
          .map((i) => (bump && i.workoutId === item.workoutId && i.queuedAt === item.queuedAt ? { ...i, attempts: (i.attempts ?? 0) + 1 } : i));
        await write(userId, next);
      }
      if (sentIds.length > 0) useOutboxStore.setState((st) => ({ sentCount: st.sentCount + sentIds.length, sentIds: [...st.sentIds, ...sentIds].slice(-50) }));
      return { sent: sentIds.length, dropped: droppedIds.length, remaining: (await read(userId)).length, sentIds, droppedIds };
    } finally {
      flushing = false;
    }
  },
};
