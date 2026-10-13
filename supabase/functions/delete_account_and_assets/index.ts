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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Service role key is required to delete auth.users directly via admin API
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verify user with anon key and token first
    const anonSupabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Use service role client to perform deletion operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Remove every file the user stored (each photo change created a new avatar file)
    const { data: files } = await adminSupabase.storage.from('avatars').list(userId, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => !p.includes('..'));
    if (paths.length) await adminSupabase.storage.from('avatars').remove(paths);

    // 2. Delete the user (this cascades to profiles, workouts, etc. based on foreign keys)
    // We can use the existing `delete_user` RPC or the admin API.
    // Using Admin API is more direct for Edge Functions:
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true, message: 'Account and assets deleted' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('delete_account error', error);
    return new Response(JSON.stringify({ error: 'Suppression impossible pour le moment.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
