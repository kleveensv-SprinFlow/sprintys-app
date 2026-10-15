import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkInService, CheckInData } from './checkInService';
import { isDefinitiveRefusal, isNetworkError } from './resultsOutbox';

/**
 * Check-ins validés sans connexion (stade, vestiaire…) : gardés sur le téléphone et envoyés dès que le réseau
 * revient, comme les résultats de séance (resultsOutbox). Un seul par jour : refaire le check-in remplace l'attente.
 */
interface Item {
  data: CheckInData;
  queuedAt: number;
  attempts?: number;
}

const keyOf = (userId: string) => `checkin-outbox:${userId}`;
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
    return false; // stockage plein ou indisponible
  }
}

let flushing = false;

export const checkInOutbox = {
  /** Check-ins en attente d'envoi (affichés comme faits, avec la mention « pas encore envoyé »). */
  pending: async (userId: string): Promise<CheckInData[]> => (await read(userId)).map((i) => i.data),

  /** False si le téléphone n'a pas pu le garder : l'appelant ne doit pas promettre l'envoi. */
  enqueue: async (userId: string, data: CheckInData): Promise<boolean> => {
    const list = (await read(userId)).filter((i) => i.data.date !== data.date);
    list.push({ data, queuedAt: Date.now() });
    return write(userId, list);
  },

  /** Envoie ce qui attend. S'arrête à la première coupure ; un refus définitif est abandonné pour ne pas bloquer. */
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
          await checkInService.upsertCheckIn(item.data);
          sent += 1;
          done = true;
        } catch (e) {
          if (isNetworkError(e)) break;
          if (isDefinitiveRefusal(e) || (item.attempts ?? 0) + 1 >= MAX_ATTEMPTS) {
            dropped += 1;
            done = true;
          } else bump = true;
        }
        // Relire : un check-in plus récent du même jour a pu être mis en attente entre-temps
        const fresh = await read(userId);
        await write(
          userId,
          fresh
            .filter((i) => !(done && i.data.date === item.data.date && i.queuedAt === item.queuedAt))
            .map((i) => (bump && i.queuedAt === item.queuedAt ? { ...i, attempts: (i.attempts ?? 0) + 1 } : i))
        );
      }
      return { sent, dropped };
    } finally {
      flushing = false;
    }
  },
};
