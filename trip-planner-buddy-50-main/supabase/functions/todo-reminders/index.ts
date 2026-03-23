/**
 * 由 pg_cron + pg_net 週期呼叫：處理到期待辦 → 寫入 notifications + Resend 寄信。
 * 需在 Dashboard → Edge Functions → Secrets 設定：CRON_SECRET、RESEND_API_KEY、
 * RESEND_FROM（可選）、SERVICE_ROLE_KEY（若專案未自動注入則手動加）。
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom =
    Deno.env.get('RESEND_FROM') ?? 'Trip Planner <onboarding@resend.dev>';

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();

  const { data: due, error: selectError } = await admin
    .from('todo_reminders')
    .select('id, user_id, title, body, trip_id, remind_at')
    .lte('remind_at', nowIso)
    .is('reminded_at', null)
    .eq('completed', false)
    .order('remind_at', { ascending: true })
    .limit(100);

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string; warning?: string }> = [];

  for (const row of due ?? []) {
    const notifTitle = '待辦時間到了';
    const notifMessage = row.body?.trim()
      ? `${row.title}\n\n${row.body}`
      : row.title;

    const { error: insErr } = await admin.from('notifications').insert({
      user_id: row.user_id,
      title: notifTitle,
      message: notifMessage,
      is_read: false,
    });

    if (insErr) {
      results.push({ id: row.id, ok: false, error: insErr.message });
      continue;
    }

    let canMarkReminded = true;
    let lastError: string | undefined;
    let emailWarning: string | undefined;

    if (resendKey) {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
      const email = userData?.user?.email;

      if (userErr || !email) {
        emailWarning = userErr?.message ?? 'No email for user';
      } else {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [email],
            subject: `待辦提醒：${row.title}`,
            html: `<p><strong>${escapeHtml(row.title)}</strong></p>${
              row.body?.trim()
                ? `<p style="white-space:pre-wrap">${escapeHtml(row.body)}</p>`
                : ''
            }`,
          }),
        });

        if (!res.ok) {
          canMarkReminded = false;
          lastError = (await res.text()) || res.statusText;
        }
      }
    }

    if (!canMarkReminded) {
      results.push({ id: row.id, ok: false, error: lastError ?? 'Email failed' });
      continue;
    }

    const { error: updErr } = await admin
      .from('todo_reminders')
      .update({ reminded_at: nowIso })
      .eq('id', row.id)
      .is('reminded_at', null);

    if (updErr) {
      results.push({ id: row.id, ok: false, error: updErr.message });
      continue;
    }

    results.push({
      id: row.id,
      ok: true,
      ...(emailWarning ? { warning: emailWarning } : {}),
    });
  }

  return new Response(
    JSON.stringify({
      processed: results.length,
      results,
      skippedEmail: !resendKey,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
