import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';

/** What the request is for: the server picks its framing and limits from it. */
export type AIPurpose = 'chat' | 'coach_chat' | 'meal_photo' | 'meal_text' | 'weather';

/** Error with a message that can be shown as is (quota reached, message too long…). */
export class AIError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
  }
}

const FALLBACK_ERROR = 'Sprinty n’arrive pas à répondre pour le moment.';

const toApiMessages = (messages: { role: string; content: string }[]) =>
  messages.map((m) => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }));

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchOpenAIResponse(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  model: string = 'gpt-4o-mini',
  purpose: AIPurpose = 'chat'
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('chat', {
    headers: await authHeaders(),
    body: { messages: toApiMessages(messages), systemPrompt, model, purpose },
  });

  if (error) {
    // The function answers errors as JSON { error, code }: surface its message
    const res: Response | undefined = (error as any)?.context;
    let message = FALLBACK_ERROR;
    let code: string | undefined;
    try {
      const body = res && typeof res.json === 'function' ? await res.json() : null;
      if (body?.error) message = body.error;
      code = body?.code;
    } catch {
      // not JSON
    }
    console.error('Supabase Edge Function Error:', error);
    throw new AIError(message, res?.status, code);
  }
  if (data?.error) throw new AIError(data.error);
  return data?.reply ?? '';
}

/**
 * Streams the answer token by token (Server-Sent Events relayed by the edge
 * function). Returns the full text. Falls back to a single request when the
 * stream cannot be opened.
 */
export async function streamAIResponse({
  messages,
  systemPrompt,
  purpose = 'chat',
  onDelta,
  signal,
}: {
  messages: { role: string; content: string }[];
  systemPrompt: string;
  purpose?: AIPurpose;
  onDelta: (fullText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fetchOpenAIResponse(messages, systemPrompt, 'gpt-4o-mini', purpose);

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${url}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        ...(await authHeaders()),
        apikey: anonKey,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages: toApiMessages(messages), systemPrompt, purpose, stream: true }),
      signal,
    });
  } catch (err: any) {
    if (signal?.aborted) throw err;
    return fetchOpenAIResponse(messages, systemPrompt, 'gpt-4o-mini', purpose);
  }

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

  // Server without streaming support (older function): plain JSON answer
  if (!(res.headers.get('content-type') || '').includes('text/event-stream') || !res.body) {
    const body = await res.json();
    const reply = body?.reply ?? '';
    onDelta(reply);
    return reply;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload)?.t;
        if (delta) {
          text += delta;
          onDelta(text);
        }
      } catch {
        // ignore malformed event
      }
    }
  }
  return text;
}
