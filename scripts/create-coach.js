require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or Anon Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCoach() {
  const email = "filetarius@gmail.com";
  const password = "UAVH&1";

  console.log(`Création du compte coach pour ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: "Coach",
        last_name: "UAVH",
        full_name: "Coach UAVH",
        role: "coach",
        gender: "homme",
        group_name: "UAVH",
        subgroups: []
      }
    }
  });

  if (error) {
    console.error("Erreur lors de la création :", error.message);
    return;
  }

  console.log("Compte créé avec succès !");
  if (data.user?.identities?.length === 0) {
     console.log("L'utilisateur existait déjà.");
  } else {
     console.log("Un email de confirmation a été envoyé (si la confirmation est activée sur Supabase).");
  }
}

createCoach();
