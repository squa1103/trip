import { createClient } from '@supabase/supabase-js';

function trimEnv(value: string | undefined): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .trim();
}

const realSupabaseUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

const devProxyOff =
  import.meta.env.VITE_SUPABASE_DEV_PROXY === 'false' || import.meta.env.VITE_SUPABASE_DEV_PROXY === '0';

/** 與 vite.config.ts 的 proxy 條件一致：僅 vite dev + 遠端 https 專案網址 */
function useDevSupabaseProxy(): boolean {
  return (
    import.meta.env.MODE === 'development' &&
    !devProxyOff &&
    realSupabaseUrl.startsWith('https://') &&
    !/localhost|127\.0\.0\.1/i.test(realSupabaseUrl)
  );
}

const supabaseUrl =
  typeof window !== 'undefined' && useDevSupabaseProxy()
    ? `${window.location.origin}/__supabase`
    : realSupabaseUrl || 'https://placeholder.supabase.co';

// Use fallback placeholders so the app can still boot even if env vars are missing.
// Actual data queries will fail gracefully; the UI will show loading/empty states.
// Service role is never used in frontend — admin auth (create/list/update/delete users) goes through Edge Function.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);
