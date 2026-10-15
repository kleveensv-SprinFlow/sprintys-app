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
}

const keyOf = (userId: string) => `results-outbox:${userId}`;

interface OutboxState {
  /** Sessions whose results are waiting to be sent (for the badge in the session sheet) */
  pendingIds: string[];
  /** Bumped when something was sent, so screens can reload */
  sentCount: number;
  set: (ids: string[]) => void;
}

export const useOutboxStore = create<OutboxState>((set) => ({
  pendingIds: [],
  sentCount: 0,
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

async function read(userId: string): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function write(userId: string, list: OutboxItem[]) {
  try {
    if (list.length === 0) await AsyncStorage.removeItem(keyOf(userId));
    else await AsyncStorage.setItem(keyOf(userId), JSON.stringify(list));
  } catch {
    /* storage full or unavailable: nothing more can be done */
  }
  useOutboxStore.getState().set(list.map((i) => i.workoutId));
}

let flushing = false;

export const resultsOutbox = {
  /** Loads the waiting list into the store (app start / login) */
  hydrate: async (userId: string) => {
    useOutboxStore.getState().set((await read(userId)).map((i) => i.workoutId));
  },

  enqueue: async (userId: string, item: Omit<OutboxItem, 'queuedAt'>) => {
    const list = (await read(userId)).filter((i) => i.workoutId !== item.workoutId);
    list.push({ ...item, queuedAt: Date.now() });
    await write(userId, list);
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
  flush: async (userId: string): Promise<{ sent: number; dropped: number; remaining: number }> => {
    if (flushing) return { sent: 0, dropped: 0, remaining: useOutboxStore.getState().pendingIds.length };
    flushing = true;
    let sent = 0;
    let dropped = 0;
    try {
      let list = await read(userId);
      for (const item of [...list]) {
        try {
          await workoutService.submitWorkoutResults(item.workoutId, item.efforts, item.measures);
          sent += 1;
          AsyncStorage.removeItem(`session-draft:${userId}:${item.workoutId}`).catch(() => undefined);
        } catch (e: any) {
          if (isNetworkError(e)) break;
          dropped += 1;
        }
        // Re-read: the athlete may have queued something else meanwhile
        const fresh = await read(userId);
        list = fresh.filter((i) => i.workoutId !== item.workoutId || i.queuedAt !== item.queuedAt);
        await write(userId, list);
      }
      if (sent > 0) useOutboxStore.setState((s) => ({ sentCount: s.sentCount + sent }));
      return { sent, dropped, remaining: (await read(userId)).length };
    } finally {
      flushing = false;
    }
  },
};
