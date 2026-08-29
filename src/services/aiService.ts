import { supabase } from './supabase';

export async function fetchOpenAIResponse(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  
  // Format messages securely
  const formattedMessages = messages.map(m => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content
  }));

  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        messages: formattedMessages,
        systemPrompt,
        model
      }
    });

    if (error) {
      console.error('Supabase Edge Function Error:', error);
      throw new Error("Erreur de communication avec l'Edge Function Supabase");
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    return data.reply;
  } catch (error) {
    console.error('Failed to fetch from Supabase Edge Function:', error);
    throw error;
  }
}
