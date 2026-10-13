import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });

/**
 * RGPD portability: every row of the signed-in account, read with the user's own token so the
 * usual access rules apply. Works for athletes and coaches.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);

    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await db.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
    if (userError || !user) return json({ error: 'Non autorisé' }, 401);
    const id = user.id;

    // A missing table or column never blocks the export: that section is just empty
    const rows = async (table: string, column: string) => {
      const { data, error } = await db.from(table).select('*').eq(column, id);
      if (error) console.error(`export ${table}`, error.message);
      return data ?? [];
    };

    const [profile] = await rows('profiles', 'id');
    const exportData = {
      export_date: new Date().toISOString(),
      account: { id, email: user.email, created_at: user.created_at, provider: user.app_metadata?.provider ?? null },
      profile: profile ?? null,
      consents: await rows('user_consents', 'user_id'),
      body_metrics: await rows('body_metrics', 'athlete_id'),
      check_ins: await rows('check_ins', 'athlete_id'),
      meal_logs: await rows('meal_logs', 'user_id'),
      saved_meals: await rows('saved_meals', 'user_id'),
      workouts_as_athlete: await rows('workouts', 'athlete_id'),
      workouts_as_coach: await rows('workouts', 'coach_id'),
      athlete_efforts: await rows('athlete_efforts', 'athlete_id'),
      team_memberships: await rows('team_members', 'user_id'),
      teams_coached: await rows('teams', 'coach_id'),
      messages_sent: await rows('messages', 'sender_id'),
      blocked_users: await rows('user_blocks', 'blocker_id'),
      reports_sent: await rows('user_reports', 'reporter_id'),
    };

    return json(exportData, 200, { 'Content-Disposition': 'attachment; filename="sprintys_export.json"' });
  } catch (error) {
    console.error('export_data error', error);
    return json({ error: 'Export impossible pour le moment.' }, 500);
  }
});
