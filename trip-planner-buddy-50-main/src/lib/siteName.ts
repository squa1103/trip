import { supabase } from '@/lib/supabase';

export const SITE_NAME_STORAGE_KEY = 'siteName';

/** 後台側欄等未載入遠端名稱時的後台顯示字串 */
export const DEFAULT_ADMIN_DISPLAY = '後台管理';

/** 未設定網站名稱時，前台分頁標題（與 index.html 預設一致） */
export const DEFAULT_PUBLIC_DOCUMENT_TITLE = '旅遊規劃';

export async function fetchSiteNameFromSupabase(): Promise<string | null> {
  const { data } = await supabase
    .from('homepage_settings')
    .select('value')
    .eq('key', 'site_name')
    .maybeSingle();
  const v = data?.value;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}
