-- =============================================================================
-- Trip participants, expenses, expense_splits (LightSplit-style)
-- Run in Supabase SQL Editor after `trips` exists (see supabase-schema.sql).
--
-- Notes:
-- - expenses.payer_id -> trip_participants ON DELETE RESTRICT：刪除「仍為某筆花費付款人」的
--   成員會被擋下；刪除整個行程時，會先 CASCADE 刪除 expenses，再刪 participants（由資料庫排序）。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. trip_participants
-- -----------------------------------------------------------------------------
create table if not exists public.trip_participants (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  display_name  text not null,
  user_id       uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint trip_participants_display_name_not_empty check (char_length(trim(display_name)) > 0)
);

create index if not exists trip_participants_trip_id_idx
  on public.trip_participants (trip_id);

-- -----------------------------------------------------------------------------
-- 2. expenses
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  title           text not null,
  amount_total    numeric(14, 2) not null,
  currency        text not null default 'TWD',
  exchange_rate   numeric(18, 8) not null default 1,
  payer_id        uuid not null references public.trip_participants (id) on delete restrict,
  expense_date    date not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint expenses_amount_total_non_negative check (amount_total >= 0),
  constraint expenses_exchange_rate_positive check (exchange_rate > 0),
  constraint expenses_title_not_empty check (char_length(trim(title)) > 0)
);

create index if not exists expenses_trip_id_idx
  on public.expenses (trip_id);

create index if not exists expenses_trip_id_expense_date_desc_idx
  on public.expenses (trip_id, expense_date desc);

-- Keep updated_at in sync (pattern compatible with Supabase)
create or replace function public.set_expenses_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row
  execute procedure public.set_expenses_updated_at();

-- -----------------------------------------------------------------------------
-- 3. expense_splits
-- 注意：participant_id 使用 ON DELETE CASCADE，若直接刪成員會一併刪分攤列但 expenses.amount_total
-- 不變，應用層須禁止刪除仍參與記帳的成員（見 isTripParticipantInvolvedInLedger）。
-- -----------------------------------------------------------------------------
create table if not exists public.expense_splits (
  id              uuid primary key default gen_random_uuid(),
  expense_id      uuid not null references public.expenses (id) on delete cascade,
  participant_id  uuid not null references public.trip_participants (id) on delete cascade,
  owed_amount     numeric(14, 2) not null,
  constraint expense_splits_owed_non_negative check (owed_amount >= 0),
  constraint expense_splits_expense_participant_unique unique (expense_id, participant_id)
);

create index if not exists expense_splits_expense_id_idx
  on public.expense_splits (expense_id);

create index if not exists expense_splits_participant_id_idx
  on public.expense_splits (participant_id);

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (align with public.trips: anyone read, auth write)
-- -----------------------------------------------------------------------------
alter table public.trip_participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

-- trip_participants
drop policy if exists "Public read trip_participants" on public.trip_participants;
drop policy if exists "Auth users can insert trip_participants" on public.trip_participants;
drop policy if exists "Auth users can update trip_participants" on public.trip_participants;
drop policy if exists "Auth users can delete trip_participants" on public.trip_participants;

create policy "Public read trip_participants"
  on public.trip_participants for select
  using (true);

create policy "Auth users can insert trip_participants"
  on public.trip_participants for insert
  with check (auth.role() = 'authenticated');

create policy "Auth users can update trip_participants"
  on public.trip_participants for update
  using (auth.role() = 'authenticated');

create policy "Auth users can delete trip_participants"
  on public.trip_participants for delete
  using (auth.role() = 'authenticated');

-- expenses
drop policy if exists "Public read expenses" on public.expenses;
drop policy if exists "Auth users can insert expenses" on public.expenses;
drop policy if exists "Auth users can update expenses" on public.expenses;
drop policy if exists "Auth users can delete expenses" on public.expenses;

create policy "Public read expenses"
  on public.expenses for select
  using (true);

create policy "Auth users can insert expenses"
  on public.expenses for insert
  with check (auth.role() = 'authenticated');

create policy "Auth users can update expenses"
  on public.expenses for update
  using (auth.role() = 'authenticated');

create policy "Auth users can delete expenses"
  on public.expenses for delete
  using (auth.role() = 'authenticated');

-- expense_splits
drop policy if exists "Public read expense_splits" on public.expense_splits;
drop policy if exists "Auth users can insert expense_splits" on public.expense_splits;
drop policy if exists "Auth users can update expense_splits" on public.expense_splits;
drop policy if exists "Auth users can delete expense_splits" on public.expense_splits;

create policy "Public read expense_splits"
  on public.expense_splits for select
  using (true);

create policy "Auth users can insert expense_splits"
  on public.expense_splits for insert
  with check (auth.role() = 'authenticated');

create policy "Auth users can update expense_splits"
  on public.expense_splits for update
  using (auth.role() = 'authenticated');

create policy "Auth users can delete expense_splits"
  on public.expense_splits for delete
  using (auth.role() = 'authenticated');
