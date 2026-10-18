import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { supabase } from './supabase';
import { isDefinitiveRefusal, isNetworkError } from './resultsOutbox';

/**
 * Repas saisis sans connexion : gardés sur le téléphone et envoyés dès que le réseau revient (comme checkInOutbox).
 * Chaque ligne a un `id` créé sur le téléphone : un envoi répété ne crée jamais de doublon (clé primaire).
 */
export interface QueuedMeal {
  id: string;
  user_id: string;
  consumed_at: string;
  meal_type: string;
  [k: string]: unknown;
}

interface Item {
  row: QueuedMeal;
  queuedAt: number;
  attempts?: number;
}

const keyOf = (userId: string) => `meal-outbox:${userId}`;
const MAX_ATTEMPTS = 30;

async function read(userId: string): Promise<Item[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function write(userId: string, list: Item[]): Promise<boolean> {
  try {
    if (list.length === 0) await AsyncStorage.removeItem(keyOf(userId));
    else await AsyncStorage.setItem(keyOf(userId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

let flushing = false;

export const mealOutbox = {
  newId: (): string => String(uuid.v4()),

  /** Repas en attente pour un jour (affichés comme saisis, avec la mention « pas encore envoyé »). */
  pendingFor: async (userId: string, date: string): Promise<QueuedMeal[]> =>
    (await read(userId)).map((i) => i.row).filter((r) => r.consumed_at === date),

  count: async (userId: string): Promise<number> => (await read(userId)).length,

  /** False si le téléphone n'a pas pu le garder : l'appelant ne doit pas promettre l'envoi. */
  enqueue: async (userId: string, row: QueuedMeal): Promise<boolean> => {
    const list = (await read(userId)).filter((i) => i.row.id !== row.id);
    list.push({ row, queuedAt: Date.now() });
    return write(userId, list);
  },

  /** Retire un repas en attente (suppression avant envoi). */
  remove: async (userId: string, id: string): Promise<void> => {
    await write(userId, (await read(userId)).filter((i) => i.row.id !== id));
  },

  flush: async (userId: string): Promise<{ sent: number; dropped: number }> => {
    if (flushing) return { sent: 0, dropped: 0 };
    flushing = true;
    let sent = 0;
    let dropped = 0;
    try {
      const list = await read(userId);
      for (const item of list) {
        let done = false;
        let bump = false;
        try {
          let { error } = await supabase.from('meal_logs').insert([item.row]);
          // Doublon = déjà envoyé lors d'un essai précédent dont la réponse s'est perdue
          if (error && (error as any).code === '23505') error = null;
          // Colonne `micros` absente : on envoie sans
          if (error && /micros/i.test(error.message || '') && item.row.micros) {
            const { micros: _m, ...rest } = item.row;
            ({ error } = await supabase.from('meal_logs').insert([rest]));
            if (error && (error as any).code === '23505') error = null;
          }
          if (error) throw error;
          sent += 1;
          done = true;
        } catch (e) {
          if (isNetworkError(e)) break;
          if (isDefinitiveRefusal(e) || (item.attempts ?? 0) + 1 >= MAX_ATTEMPTS) {
            dropped += 1;
            done = true;
          } else bump = true;
        }
        const fresh = await read(userId);
        await write(
          userId,
          fresh
            .filter((i) => !(done && i.row.id === item.row.id))
            .map((i) => (bump && i.row.id === item.row.id ? { ...i, attempts: (i.attempts ?? 0) + 1 } : i))
        );
      }
      return { sent, dropped };
    } finally {
      flushing = false;
    }
  },
};
