import { supabase } from './supabase';

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
