import { supabase } from './supabase';

/** 前端是否有設定 Supabase（未設定時 createClient 會使用 placeholder，登入必定失敗） */
export function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return Boolean(url && key);
}

/** 將 Supabase Auth 錯誤轉成可讀中文（避免一律顯示「帳號或密碼錯誤」） */
export function describeSignInError(error: unknown): string {
  if (!isSupabaseConfigured()) {
    return '請在專案根目錄的 .env 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY（Supabase 專案 → Project Settings → API）。';
  }

  if (error && typeof error === 'object') {
    const code = 'code' in error ? String((error as { code?: string }).code) : '';
    const message =
      'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

    if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
      return '帳號或密碼錯誤';
    }
    if (
      code === 'email_not_confirmed' ||
      /email not confirmed/i.test(message) ||
      message.includes('Email not confirmed')
    ) {
      return '請先至信箱完成 Email 驗證後再登入（或在 Supabase 後台將該使用者標記為已確認）。';
    }
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      if (import.meta.env.DEV) {
        return '無法連線到 Supabase。開發模式已啟用 Vite 代理（經 /__supabase）；請確認已用 npm run dev 重啟過，且 .env 的 VITE_SUPABASE_URL 正確。若仍失敗，請檢查防毒／VPN／瀏覽器擴充功能，或在 .env 設定 VITE_SUPABASE_DEV_PROXY=0 改回直連以比對差異。';
      }
      return '無法連線到 Supabase，請檢查網路、VITE_SUPABASE_URL 是否正確，以及瀏覽器是否阻擋請求。';
    }
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return '登入失敗，請稍後再試。';
}

async function callAdminAuth<T>(body: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('請先登入');
  }
  const { data, error } = await supabase.functions.invoke('admin-auth', {
    body,
  });
  if (error) {
    throw new Error((data as { error?: string })?.error ?? error.message ?? '請求失敗');
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function listUsers() {
  const { users } = await callAdminAuth<{ users: Array<{ id: string; email?: string; created_at: string }> }>({ action: 'listUsers' });
  return users;
}

export async function createUser(email: string, password: string) {
  const { user } = await callAdminAuth<{ user: { id: string; email?: string; created_at: string } }>({
    action: 'createUser',
    email,
    password,
  });
  return user;
}

export async function updateUserPassword(userId: string, password: string) {
  const { user } = await callAdminAuth<{ user: { id: string; email?: string } }>({
    action: 'updateUserPassword',
    userId,
    password,
  });
  return user;
}

export async function deleteUser(userId: string) {
  await callAdminAuth<{ ok: boolean }>({ action: 'deleteUser', userId });
}
