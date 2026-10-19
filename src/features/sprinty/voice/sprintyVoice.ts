import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../services/supabase';
import { toast } from '../../../shared/feedback/appAlert';

/**
 * Voix de Sprinty : un message lu par la voix IA (fonction sprinty_tts), gardé en cache sur le téléphone pour ne pas
 * le refaire payer à la deuxième écoute. Un seul message à la fois ; l'avatar de Sprinty « parle » pendant la lecture.
 */

const DIR = `${FileSystem.cacheDirectory}sprinty-voice/`;

/** Empreinte courte et stable d'un texte (nom du fichier en cache). */
export function voiceKey(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = (h2 * 31 + c) | 0;
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return globalThis.btoa(bin);
}

async function audioFileFor(text: string): Promise<string> {
  const path = `${DIR}${voiceKey(text)}.mp3`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && (info as any).size > 0) return path;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!url || !token) throw new Error('session');

  const res = await fetch(`${url}/functions/v1/sprinty_tts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err = new Error(body?.error || 'voice');
    (err as any).quota = body?.code === 'quota';
    throw err;
  }
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => undefined);
  await FileSystem.writeAsStringAsync(path, toBase64(await res.arrayBuffer()), { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

interface VoiceState {
  /** Message en cours de préparation (appel réseau) */
  loadingId: string | null;
  /** Message en cours de lecture */
  playingId: string | null;
  play: (id: string, text: string) => Promise<void>;
  stop: () => void;
}

let player: AudioPlayer | null = null;
let sub: { remove: () => void } | null = null;
let seq = 0;

function release() {
  sub?.remove();
  sub = null;
  try {
    player?.pause();
    player?.remove();
  } catch {
    // déjà libéré
  }
  player = null;
}

export const useSprintyVoice = create<VoiceState>((set, get) => ({
  loadingId: null,
  playingId: null,

  play: async (id, text) => {
    const mine = ++seq;
    release();
    if (!text.trim()) return;
    set({ loadingId: id, playingId: null });
    try {
      const uri = await audioFileFor(text);
      if (mine !== seq) return; // un autre message a été demandé entre-temps
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
      player = createAudioPlayer({ uri });
      sub = player.addListener('playbackStatusUpdate', (s: any) => {
        if (s?.didJustFinish && mine === seq) get().stop();
      });
      player.play();
      set({ loadingId: null, playingId: id });
    } catch (e: any) {
      if (mine !== seq) return;
      set({ loadingId: null, playingId: null });
      toast(e?.quota ? 'info' : 'error', e?.quota ? e.message : 'La voix de Sprinty n’a pas répondu. Vérifie ta connexion et réessaie.');
    }
  },

  stop: () => {
    seq++;
    release();
    set({ loadingId: null, playingId: null });
  },
}));

/** Vrai pendant que Sprinty parle (pour animer son visage). */
export const useSprintySpeaking = () => useSprintyVoice((s) => s.playingId != null);
