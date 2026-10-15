import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** Sous la limite de 2048 octets du coffre du téléphone. La session est du texte simple. */
const CHUNK = 1800;

const countKey = (key: string) => `${key}.n`;
const partKey = (key: string, index: number) => `${key}.${index}`;

async function secureStoreReady(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Garde la session de connexion dans le coffre du téléphone.
 * Si le coffre n'existe pas (site web, ou ancienne version), on retombe sur le stockage habituel.
 * Au premier lancement après la mise à jour, l'ancienne session est recopiée puis effacée.
 */
export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await secureStoreReady())) return AsyncStorage.getItem(key);

    const countRaw = await SecureStore.getItemAsync(countKey(key));
    if (countRaw == null) {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await secureAuthStorage.setItem(key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    }

    const count = Number(countRaw);
    if (!Number.isInteger(count) || count < 1) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(partKey(key, i));
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!(await secureStoreReady())) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    const oldCount = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(partKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
    for (let i = count; i < oldCount; i++) {
      await SecureStore.deleteItemAsync(partKey(key, i));
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!(await secureStoreReady())) {
      await AsyncStorage.removeItem(key);
      return;
    }

    const oldCount = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
    for (let i = 0; i < oldCount; i++) {
      await SecureStore.deleteItemAsync(partKey(key, i));
    }
    await SecureStore.deleteItemAsync(countKey(key));
    await AsyncStorage.removeItem(key);
  },
};
