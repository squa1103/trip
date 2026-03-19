// Admin auth Edge Function: list users, create user, update password, delete user.
// Always returns 200 and puts errors in body so the client can show the real message.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: object, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return jsonResponse({ error: '缺少登入憑證，請重新登入' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    return jsonResponse({ error: '伺服器未設定 SERVICE_ROLE_KEY，請在 Edge Functions → Secrets 新增' });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return jsonResponse({
      error: userError?.message
        ? `登入已過期或無效：${userError.message}`
        : '登入已過期或無效，請重新登入',
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { action: string; email?: string; password?: string; userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: '請求格式錯誤' });
  }

  const { action } = body;

  try {
    switch (action) {
      case 'listUsers': {
        const { data, error } = await adminClient.auth.admin.listUsers();
        if (error) return jsonResponse({ error: error.message });
        return jsonResponse({ users: data.users });
      }
      case 'createUser': {
        const { email, password } = body;
        if (!email || !password) {
          return jsonResponse({ error: '請填寫 Email 與密碼' });
        }
        const { data, error } = await adminClient.auth.admin.createUser({
          email: String(email).trim(),
          password: String(password),
          email_confirm: true,
        });
        if (error) return jsonResponse({ error: error.message });
        return jsonResponse({ user: data.user });
      }
      case 'updateUserPassword': {
        const { userId, password } = body;
        if (!userId || !password) {
          return jsonResponse({ error: '請提供使用者 ID 與新密碼' });
        }
        const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
          password: String(password),
        });
        if (error) return jsonResponse({ error: error.message });
        return jsonResponse({ user: data.user });
      }
      case 'deleteUser': {
        const { userId } = body;
        if (!userId) return jsonResponse({ error: '請提供使用者 ID' });
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) return jsonResponse({ error: error.message });
        return jsonResponse({ ok: true });
      }
      default:
        return jsonResponse({ error: '未知操作' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return jsonResponse({ error: message });
  }
});
