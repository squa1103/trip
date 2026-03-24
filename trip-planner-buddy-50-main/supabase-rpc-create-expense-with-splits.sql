-- =============================================================================
-- Atomic create: insert expenses + expense_splits in one Postgres transaction.
-- Run in Supabase SQL Editor after public.expenses / public.expense_splits exist.
-- =============================================================================

create or replace function public.create_expense_with_splits(
  p_trip_id uuid,
  p_title text,
  p_amount_total numeric,
  p_currency text,
  p_exchange_rate numeric,
  p_payer_id uuid,
  p_expense_date date,
  p_splits jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense_id uuid;
begin
  insert into public.expenses (
    trip_id,
    title,
    amount_total,
    currency,
    exchange_rate,
    payer_id,
    expense_date
  )
  values (
    p_trip_id,
    trim(p_title),
    p_amount_total,
    coalesce(nullif(trim(p_currency), ''), 'TWD'),
    coalesce(p_exchange_rate, 1),
    p_payer_id,
    p_expense_date
  )
  returning id into v_expense_id;

  insert into public.expense_splits (expense_id, participant_id, owed_amount)
  select
    v_expense_id,
    (elem->>'participant_id')::uuid,
    (elem->>'owed_amount')::numeric
  from jsonb_array_elements(coalesce(p_splits, '[]'::jsonb)) as elem;

  return v_expense_id;
end;
$$;

comment on function public.create_expense_with_splits(
  uuid, text, numeric, text, numeric, uuid, date, jsonb
) is
  'Inserts one expense row and related splits atomically; used by app via supabase.rpc.';

grant execute on function public.create_expense_with_splits(
  uuid, text, numeric, text, numeric, uuid, date, jsonb
) to authenticated;
