require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSubgroup() {
  // We need to authenticate as the coach first to test RLS.
  // Wait, I can just use the service role key if I had it.
  // But I don't.
  // I will log in as the coach we just created:
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'filetarius@gmail.com',
    password: 'UAVH&1'
  });
  if (authError) return console.error("Auth error", authError);

  console.log("Logged in as coach", authData.user.id);
  
  // Create a team first (or find one)
  let { data: teamData } = await supabase.from('teams').select('id').limit(1).single();
  let teamId;
  
  if (!teamData) {
     const { data: newTeam } = await supabase.from('teams').insert([{ coach_id: authData.user.id, name: 'UAVH Test' }]).select().single();
     if (!newTeam) return console.error("Could not create team");
     teamId = newTeam.id;
  } else {
     teamId = teamData.id;
  }
  
  console.log("Using team", teamId);
  const { data, error } = await supabase.from('subgroups').insert([{ team_id: teamId, name: 'Test Subgroup' }]).select().single();
  
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Success!", data);
  }
}
testSubgroup();
