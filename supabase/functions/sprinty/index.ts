// deno-lint-ignore-file no-explicit-any
/**
 * Sprinty 2: an assistant with tools.
 *
 * - Data only comes from the database, read with the caller's own rights (RLS): a coach only sees validated athletes.
 * - Charts are computed here from real values; the model only chooses what to show.
 * - Nothing is written: proposals are cards the user confirms in the app.
 * - Events streamed to the app (SSE): {t} text, {ui} visual block, {status} progress, {error}, then [DONE].
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildSystem } from './prompts.ts';
import { HEAVY_TOOLS, runTool, statusFor, toolsFor } from './tools.ts';
import type { Ctx } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_FAST = Deno.env.get('SPRINTY_MODEL_FAST') || 'gpt-4.1-mini';
const MODEL_SMART = Deno.env.get('SPRINTY_MODEL_SMART') || 'gpt-4.1';
const MAX_ROUNDS = 6;
const MAX_MESSAGES = 24;
const MAX_USER_CHARS = 4000;
const MAX_ASSISTANT_CHARS = 6000;
const LEGACY_DAILY = 150;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const maskEmails = (text: string) => text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL MASQUE]');
const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) + '…' : text);

function ageFrom(dob: unknown, today: string): number | null {
  if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age >= 0 && age < 120 ? age : null;
}

const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Non autorisé' }, 401);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'Sprinty est indisponible pour le moment.' }, 503);

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const history = incoming
      .map((m: any, i: number) => {
        const role = m?.role === 'assistant' ? 'assistant' : 'user';
        const content = typeof m?.content === 'string' ? m.content : '';
        if (role === 'user' && i === incoming.length - 1 && content.length > MAX_USER_CHARS) {
          throw new Response(JSON.stringify({ error: `Message trop long (${MAX_USER_CHARS} caractères maximum).` }), { status: 413 });
        }
        return { role, content: maskEmails(clip(content, role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS)) };
      })
      .filter((m: any) => m.content.trim());
    if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'Message vide.' }, 400);

    // Who is asking: always read from the database, never from the app
    const today = parisToday();
    const [{ data: profile }, planRes] = await Promise.all([
      supabase.from('profiles').select('role, first_name, objective, gender, sprinty_intro_status').eq('id', user.id).maybeSingle(),
      supabase.rpc('get_my_plan_full'),
    ]);
    const role = profile?.role === 'coach' ? 'coach' : 'athlete';
    const plan = planRes.error ? null : planRes.data;
    const hasCoach = role === 'athlete' ? plan?.has_coach === true : false;

    // One message = one unit of quota, whatever the number of tool rounds
    const quota = await supabase.rpc('consume_ai_quota_plan', { p_kind: 'chat' });
    if (quota.error) {
      const legacy = await supabase.rpc('consume_ai_quota', { p_limit: LEGACY_DAILY });
      if (!legacy.error && legacy.data === false) return json({ error: 'Sprinty se repose, reviens demain.', code: 'quota' }, 429);
    } else if (quota.data?.allowed === false) {
      const weekly = quota.data?.window === 'week';
      return json({ error: weekly ? `Tu as utilisé tes ${quota.data?.limit} messages Sprinty de la semaine.` : 'Tu as utilisé tous tes messages Sprinty du jour.', code: 'quota', window: quota.data?.window, plan: quota.data?.plan, limit: quota.data?.limit }, 429);
    }

    const focusId = typeof body?.focusAthleteId === 'string' ? body.focusAthleteId : null;

    const encoder = new TextEncoder();
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    const emit = (event: Record<string, unknown>) => {
      try {
        controllerRef?.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      } catch {
        // client went away
      }
    };

    const ctx: Ctx = {
      supabase,
      userId: user.id,
      role,
      firstName: (profile?.first_name ?? '').trim(),
      gender: profile?.gender === 'male' || profile?.gender === 'homme' ? 'm' : profile?.gender === 'female' || profile?.gender === 'femme' ? 'f' : null,
      hasCoach,
      age: ageFrom(user.user_metadata?.date_of_birth, today),
      today,
      philosophy: role === 'coach' && profile?.objective ? clip(String(profile.objective), 1500) : null,
      limits: {
        planWeeksMax: Math.max(1, Math.min(16, Number(plan?.ai_plan_weeks_max ?? 4))),
        plansActive: Number(plan?.ai_plans_active ?? 1),
        planLifetimeMax: plan?.ai_plan_lifetime_max == null ? null : Number(plan.ai_plan_lifetime_max),
        competitionSearch: plan ? plan.competition_search === true : true,
        weeklyReport: plan ? plan.weekly_report === true : true,
      },
      focusAthlete: null,
      emit,
      debug: body?.debug === true && /@sprintys\.test$/.test(user.email ?? ''),
    };

    if (role === 'coach') {
      // Ce que le coach a validé : sa façon d'entraîner (jamais de donnée d'athlète)
      const { data: mem } = await supabase
        .from('coach_ai_memory')
        .select('category, content')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: true })
        .limit(40);
      ctx.memory = (mem ?? []).map((m: any) => ({ category: String(m.category), content: clip(String(m.content), 300) }));
      ctx.introStatus = profile?.sprinty_intro_status === 'done' || profile?.sprinty_intro_status === 'skipped' ? profile.sprinty_intro_status : null;
    }

    if (role === 'coach' && focusId) {
      const { data: fp } = await supabase.from('profiles').select('id, first_name, full_name').eq('id', focusId).maybeSingle();
      if (fp) ctx.focusAthlete = { id: fp.id, name: fp.full_name || fp.first_name || 'Athlète' };
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controllerRef = controller;
        try {
          await runAgent(ctx, apiKey, history);
        } catch (e) {
          console.error('sprinty agent failed', e);
          emit({ error: 'Sprinty n’arrive pas à répondre pour le moment.' });
        } finally {
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    console.error('sprinty error', error);
    return json({ error: 'Sprinty n’arrive pas à répondre pour le moment.' }, 500);
  }
});

interface ToolCall { id: string; name: string; args: string }

/** Tool loop: every round is streamed, text deltas go straight to the app. */
async function runAgent(ctx: Ctx, apiKey: string, history: any[]) {
  const messages: any[] = [{ role: 'system', content: buildSystem(ctx) }, ...history];
  const tools = toolsFor(ctx);
  let model = MODEL_FAST;
  let upgraded = false;
  let tokens = 0;
  let suggested = false;
  let finalText = '';
  let endedNaturally = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1;
    const { text, calls, usage } = await callModel(apiKey, model, messages, tools, last, ctx, upgraded ? 16000 : 1800);
    tokens += usage;
    if (calls.some((c) => c.name === 'suggest_followups')) suggested = true;

    if (!calls.length) {
      finalText = text;
      endedNaturally = true;
      break;
    }

    // Plans and sessions deserve the more capable model: redo this round with it
    if (!upgraded && model !== MODEL_SMART && calls.some((c) => HEAVY_TOOLS.has(c.name))) {
      upgraded = true;
      model = MODEL_SMART;
      round--;
      continue;
    }

    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.args || '{}' } })),
    });

    let terminal = false;
    let closing = false;
    for (const call of calls) {
      const status = statusFor(call.name);
      if (status) ctx.emit({ status });
      let args: any = null;
      try {
        args = call.args ? JSON.parse(call.args) : {};
      } catch {
        console.warn('unreadable tool arguments', call.name, call.args.length);
      }
      const result = args
        ? await runTool(ctx, call.name, args)
        : { content: { error: 'Proposition incomplète (trop longue). Recommence avec des notes plus courtes.' } };
      if (result.terminal) {
        terminal = true;
        if (result.closing !== false) closing = true;
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result.content).slice(0, 24000) });
    }
    if (terminal) {
      if (closing) {
        // One short closing sentence, no further tools
        const end = await callModel(apiKey, model, messages, tools, true, ctx, 160);
        tokens += end.usage;
      }
      break;
    }
  }

  // Le modèle oublie parfois les relances : on les demande alors par un appel court et forcé
  if (endedNaturally && !suggested && finalText.trim().length > 20) {
    const extra = await forceFollowups(apiKey, finalText, ctx);
    tokens += extra;
  }

  if (tokens > 0) {
    const { error } = await ctx.supabase.rpc('add_ai_tokens', { p_tokens: tokens });
    if (error) console.error('add_ai_tokens failed', error.message);
  }
}

/** Relances de secours : 2 ou 3 questions courtes, rédigées à la place de l'utilisateur. Renvoie les tokens utilisés. */
async function forceFollowups(apiKey: string, answer: string, ctx: Ctx): Promise<number> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_FAST,
        temperature: 0.4,
        max_tokens: 120,
        messages: [
          { role: 'system', content: "Tu écris 2 ou 3 relances que l'utilisateur pourrait taper après la réponse de l'assistant sportif ci-dessous : très courtes (8 mots maximum), en tutoyant, utiles et différentes. Aucune donnée médicale, aucun emoji." },
          { role: 'user', content: clip(answer, 1500) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_followups',
            parameters: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 } }, required: ['items'] },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_followups' } },
      }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const items = (JSON.parse(args ?? '{}')?.items ?? [])
      .map((x: unknown) => clip(String(x ?? '').trim(), 80))
      .filter(Boolean)
      .slice(0, 3);
    if (items.length >= 2) ctx.emit({ ui: { type: 'suggestions', items } });
    return Number(data?.usage?.total_tokens) || 0;
  } catch (e) {
    console.warn('followups fallback failed', e);
    return 0;
  }
}

async function callModel(
  apiKey: string,
  model: string,
  messages: any[],
  tools: any[],
  noTools: boolean,
  ctx: Ctx,
  maxTokens = 1800
): Promise<{ text: string; calls: ToolCall[]; usage: number }> {
  const request = (m: string) =>
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m,
        messages,
        tools,
        tool_choice: noTools ? 'none' : 'auto',
        parallel_tool_calls: true,
        temperature: 0.5,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

  let res = await request(model);
  if (!res.ok && model !== MODEL_FAST) {
    console.error('model failed, falling back', model, res.status, await res.text().catch(() => ''));
    res = await request(MODEL_FAST);
  }
  if (!res.ok || !res.body) {
    console.error('OpenAI error', res.status, await res.text().catch(() => ''));
    throw new Error('openai');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let usage = 0;
  const calls: ToolCall[] = [];
  // Small chunks are grouped to keep the number of events low
  let pending = '';
  const flush = () => {
    if (pending) ctx.emit({ t: pending });
    pending = '';
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      let parsed: any;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }
      if (parsed?.usage?.total_tokens) usage += parsed.usage.total_tokens;
      const delta = parsed?.choices?.[0]?.delta;
      if (!delta) continue;
      if (typeof delta.content === 'string' && delta.content) {
        text += delta.content;
        pending += delta.content;
        if (!calls.length && pending.length > 24) flush();
      }
      for (const tc of delta.tool_calls ?? []) {
        const i = tc.index ?? 0;
        calls[i] ??= { id: '', name: '', args: '' };
        if (tc.id) calls[i].id = tc.id;
        if (tc.function?.name) calls[i].name += tc.function.name;
        if (tc.function?.arguments) calls[i].args += tc.function.arguments;
      }
    }
  }
  if (!calls.length) flush();
  return { text, calls: calls.filter((c) => c && c.name), usage };
}
