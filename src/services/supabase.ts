import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Provide dummy values if environment variables are missing to prevent fatal crash on load
// A warning will be logged if it happens.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Check your environment variables. ' +
    'The app is running with dummy values to prevent crashing, but Supabase functionality will not work.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://dummy-url.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

