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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role needed to bypass some RLS if gathering all data, but let's use Anon key with Auth Header to enforce RLS
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Use regular client with user's auth context to fetch data
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Fetch Profile
    const { data: profile } = await userClient.from('profiles').select('*').eq('id', userId).single();
    
    // Fetch Body Metrics
    const { data: bodyMetrics } = await userClient.from('body_metrics').select('*').eq('athlete_id', userId);
    
    // Fetch Workouts
    const { data: workouts } = await userClient.from('workouts').select('*').eq('athlete_id', userId);
    
    // Fetch Athlete Efforts
    const { data: efforts } = await userClient.from('athlete_efforts').select('*').eq('athlete_id', userId);
    
    // Fetch Meal Logs
    const { data: mealLogs } = await userClient.from('meal_logs').select('*').eq('user_id', userId);
    
    // Fetch Check-ins
    const { data: checkIns } = await userClient.from('check_ins').select('*').eq('athlete_id', userId);

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        ...profile
      },
      body_metrics: bodyMetrics || [],
      workouts: workouts || [],
      athlete_efforts: efforts || [],
      meal_logs: mealLogs || [],
      check_ins: checkIns || []
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sprintflow_export_${userId}.json"`
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
