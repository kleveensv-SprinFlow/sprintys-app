import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from '../../services/supabase';
import { AIError } from '../../services/aiService';
import type { MessagePart, UiBlock } from './types';

const FALLBACK_ERROR = 'Sprinty n’arrive pas à répondre pour le moment.';

interface StreamOptions {
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** Coach: the athlete the conversation is about. */
  focusAthleteId?: string | null;
  signal?: AbortSignal;
  /** Called with the full list of parts each time something arrives. */
  onParts: (parts: MessagePart[]) => void;
  onStatus?: (status: string | null) => void;
}

/**
 * Talks to the `sprinty` edge function. The answer arrives as Server-Sent Events:
 * {t} text, {ui} visual block, {status} progress, {error}, then [DONE].
 */
export async function streamSprinty({ messages, focusAthleteId, signal, onParts, onStatus }: StreamOptions): Promise<MessagePart[]> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new AIError(FALLBACK_ERROR);

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AIError('Reconnecte-toi pour parler à Sprinty.', 401);

  const res = await expoFetch(`${url}/functions/v1/sprinty`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages, focusAthleteId: focusAthleteId ?? undefined }),
    signal,
  });

  if (!res.ok) {
    let message = FALLBACK_ERROR;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      code = body?.code;
    } catch {
      // not JSON
    }
    throw new AIError(message, res.status, code);
  }
  if (!res.body) throw new AIError(FALLBACK_ERROR);

  const parts: MessagePart[] = [];
  const pushText = (t: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === 'text') parts[parts.length - 1] = { kind: 'text', text: last.text + t };
    else parts.push({ kind: 'text', text: t });
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let failure: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    let changed = false;
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      let ev: any;
      try {
        ev = JSON.parse(payload);
      } catch {
        continue;
      }
      if (typeof ev.t === 'string') {
        pushText(ev.t);
        onStatus?.(null);
        changed = true;
      } else if (ev.ui && typeof ev.ui === 'object') {
        parts.push({ kind: 'ui', block: ev.ui as UiBlock });
        onStatus?.(null);
        changed = true;
      } else if (typeof ev.status === 'string') {
        onStatus?.(ev.status);
      } else if (typeof ev.error === 'string') {
        failure = ev.error;
      }
    }
    if (changed) onParts(parts.map((p) => (p.kind === 'text' ? { ...p, text: p.text } : p)));
  }

  const cleaned = parts
    .map((p) => (p.kind === 'text' ? { ...p, text: p.text.trim() } : p))
    .filter((p) => p.kind === 'ui' || p.text);
  if (!cleaned.length && failure) throw new AIError(failure);
  return cleaned;
}
