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
