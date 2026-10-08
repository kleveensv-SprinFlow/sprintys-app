import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorise: Header manquant' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, systemPrompt, model = 'gpt-4o-mini' } = await req.json();
    
    const allowedModels = ['gpt-4o-mini', 'gpt-3.5-turbo'];
    const safeModel = allowedModels.includes(model) ? model : 'gpt-4o-mini';

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in Edge Function secrets');
    }

    const sanitizeText = (text: string): string => {
      let safeText = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL MASQUE]');
      return safeText;
    };

    const sanitizeContent = (content: any): any => {
      if (typeof content === 'string') return sanitizeText(content);
      if (Array.isArray(content)) {
        return content.map((part) => {
          if (part && typeof part.text === 'string') {
            return { ...part, text: sanitizeText(part.text) };
          }
          return part;
        });
      }
      return content;
    };

    const sanitizedMessages = (Array.isArray(messages) ? messages : []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: sanitizeContent(msg.content)
    }));

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedMessages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: safeModel,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error from OpenAI');
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
