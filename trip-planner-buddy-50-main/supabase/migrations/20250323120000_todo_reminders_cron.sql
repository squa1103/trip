-- =============================================================================
-- 待辦「時間到了」：資料表 + RLS + pg_cron 呼叫 Edge Function
-- 執行前請在 Supabase Dashboard → Database → Extensions 啟用：
--   pg_cron, pg_net
-- 並將下方 <<PLACEHOLDERS>> 換成你的專案值後再執行「排程」段落。
-- =============================================================================

-- 1) 待辦提醒表（與 trips.jsonb todos 分離，便於排程與寄信）
create table if not exists public.todo_reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  trip_id     uuid references public.trips (id) on delete set null,
  title       text not null,
  body        text not null default '',
  remind_at   timestamptz not null,
  completed   boolean not null default false,
  reminded_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists todo_reminders_due_idx
  on public.todo_reminders (remind_at)
  where reminded_at is null and completed = false;

comment on table public.todo_reminders is '帶提醒時間的待辦；到期由 Edge Function 寫入 notifications 並寄信';

alter table public.todo_reminders enable row level security;

create policy "Users manage own todo_reminders"
  on public.todo_reminders
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 排程：每分鐘呼叫 Edge Function（請替換三個占位符）
-- <<PROJECT_REF>>  例如 abcdefghijklmnop
-- <<SUPABASE_ANON_KEY>>  Project Settings → API → anon public
-- <<CRON_SECRET>>  與 Edge Function Secret CRON_SECRET 完全相同

-- 若曾建立過同名 job，可先取消：
-- select cron.unschedule('todo-reminders-every-minute');

/*
select cron.schedule(
  'todo-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<<PROJECT_REF>>.supabase.co/functions/v1/todo-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <<SUPABASE_ANON_KEY>>',
      'x-cron-secret', '<<CRON_SECRET>>'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
*/

-- 3)（選用）以 Vault 保管 CRON_SECRET，避免明文寫在 cron 內：
--    Dashboard → Database → Vault，或使用 SQL：
--    select vault.create_secret('你的密鑰字串', 'todo_cron_secret', 'Todo cron');
--    再改寫 cron 內 headers，用 (select decrypted_secret from vault.decrypted_secrets where name = 'todo_cron_secret') 組 jsonb。
--    詳見：https://supabase.com/docs/guides/database/vault
