import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmmqkaljsjualnjlzyfw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbXFrYWxqc2p1YWxuamx6eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTQ3NDEsImV4cCI6MjA5MjI3MDc0MX0.Qy-dSh_1pdFsVGzhOymWM13hZuluAkq4p0pwq7xTTWg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
