import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Use fallback placeholders so the app can still boot even if env vars are missing.
// Actual data queries will fail gracefully; the UI will show loading/empty states.
// Service role is never used in frontend — admin auth (create/list/update/delete users) goes through Edge Function.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);
