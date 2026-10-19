// deno-lint-ignore-file no-explicit-any
/**
 * Voix de Sprinty : transforme un texte déjà préparé pour l'oral (l'app retire le markdown, les tableaux…) en audio MP3.
 * Le texte n'est ni stocké ni journalisé ; seul le nombre de caractères compte pour le quota du jour.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MAX_CHARS = 2000;
const MODEL = Deno.env.get('SPRINTY_TTS_MODEL') || 'gpt-4o-mini-tts';
const VOICE = Deno.env.get('SPRINTY_TTS_VOICE') || 'verse';
const INSTRUCTIONS =
  "Tu es Sprinty, un jeune léopard des neiges, coach d'athlétisme. Parle en français de France, avec une voix chaleureuse, énergique et bienveillante, un sourire dans la voix, un débit naturel et posé. Lis les chiffres clairement.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
    if (userError || !user) return json({ error: 'Non autorisé' }, 401);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'La voix de Sprinty est indisponible pour le moment.' }, 503);

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS) : '';
    if (!text) return json({ error: 'Rien à lire.' }, 400);

    const quota = await supabase.rpc('consume_tts_chars', { p_chars: text.length });
    if (quota.error) {
      console.error('tts quota error', quota.error.message);
      return json({ error: 'La voix de Sprinty est indisponible pour le moment.' }, 503);
    }
    if (quota.data?.allowed === false) {
      return json({ error: 'Tu as écouté Sprinty tout ton saoul aujourd’hui : la voix revient demain.', code: 'quota' }, 429);
    }

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' }),
    });
    if (!res.ok || !res.body) {
      console.error('tts openai error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return json({ error: 'La voix de Sprinty n’a pas répondu. Réessaie.' }, 502);
    }
    return new Response(res.body, { headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('sprinty_tts error', error);
    return json({ error: 'La voix de Sprinty n’a pas répondu. Réessaie.' }, 500);
  }
});
