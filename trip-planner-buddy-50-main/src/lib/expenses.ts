import { supabase } from './supabase';
import type {
  CreateExpensePayload,
  CreateExpenseSplitPayload,
  Expense,
  ExpenseSplit,
  ExpenseWithSplits,
  TripParticipant,
} from '@/types/expense';

// --- DB row shapes (snake_case) ------------------------------------------------

export interface TripParticipantRow {
  id: string;
  trip_id: string;
  display_name: string;
  user_id: string | null;
  created_at?: string;
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  title: string;
  amount_total: string | number;
  currency: string;
  exchange_rate: string | number;
  payer_id: string;
  expense_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseSplitRow {
  id: string;
  expense_id: string;
  participant_id: string;
  owed_amount: string | number;
}

/** Supabase 巢狀 select 回傳列 */
export type ExpenseRowWithRelations = ExpenseRow & {
  payer: TripParticipantRow | TripParticipantRow[] | null;
  splits: ExpenseSplitRow[] | null;
};

// --- numeric：Postgres numeric 經 PostgREST 常為 string -------------------------

export function parseNumeric(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`無法將 ${field} 轉為數字：${String(value)}`);
}

// --- mappers ------------------------------------------------------------------

export function rowToTripParticipant(row: TripParticipantRow): TripParticipant {
  return {
    id: row.id,
    tripId: row.trip_id,
    displayName: row.display_name,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amountTotal: parseNumeric(row.amount_total, 'amount_total'),
    currency: row.currency,
    exchangeRate: parseNumeric(row.exchange_rate, 'exchange_rate'),
    payerId: row.payer_id,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToExpenseSplit(row: ExpenseSplitRow): ExpenseSplit {
  return {
    id: row.id,
    expenseId: row.expense_id,
    participantId: row.participant_id,
    owedAmount: parseNumeric(row.owed_amount, 'owed_amount'),
  };
}

/** Domain → DB 列（寫入／更新用，與 trips 專案 tripToRow 慣例對齊） */
export function tripParticipantToRow(p: TripParticipant): Omit<TripParticipantRow, 'created_at'> {
  return {
    id: p.id,
    trip_id: p.tripId,
    display_name: p.displayName,
    user_id: p.userId,
  };
}

export function expenseToRow(e: Expense): Omit<ExpenseRow, 'created_at' | 'updated_at'> {
  return {
    id: e.id,
    trip_id: e.tripId,
    title: e.title.trim(),
    amount_total: e.amountTotal,
    currency: e.currency,
    exchange_rate: e.exchangeRate,
    payer_id: e.payerId,
    expense_date: e.expenseDate,
  };
}

export function expenseSplitToRow(s: ExpenseSplit): ExpenseSplitRow {
  return {
    id: s.id,
    expense_id: s.expenseId,
    participant_id: s.participantId,
    owed_amount: s.owedAmount,
  };
}

/** 新增花費 payload → insert 列（無 id／時間戳） */
export function createExpensePayloadToInsertRow(
  p: CreateExpensePayload,
): Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    trip_id: p.tripId,
    title: p.title.trim(),
    amount_total: p.amountTotal,
    currency: p.currency ?? 'TWD',
    exchange_rate: p.exchangeRate ?? 1,
    payer_id: p.payerId,
    expense_date: p.expenseDate,
  };
}

function normalizeEmbeddedPayer(payer: ExpenseRowWithRelations['payer']): TripParticipantRow | null {
  if (payer == null) return null;
  if (Array.isArray(payer)) return payer[0] ?? null;
  return payer;
}

export function rowToExpenseWithSplits(row: ExpenseRowWithRelations): ExpenseWithSplits {
  const base = rowToExpense(row);
  const payerRow = normalizeEmbeddedPayer(row.payer);
  if (!payerRow) {
    throw new Error(`花費 ${base.id} 缺少付款人資料（payer）`);
  }
  const splitsRaw = row.splits ?? [];
  return {
    ...base,
    payer: rowToTripParticipant(payerRow),
    splits: splitsRaw.map(rowToExpenseSplit),
  };
}

// --- Trip participants ---------------------------------------------------------

export async function getTripParticipants(tripId: string): Promise<TripParticipant[]> {
  const { data, error } = await supabase
    .from('trip_participants')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as TripParticipantRow[]).map(rowToTripParticipant);
}

export async function addTripParticipant(tripId: string, name: string): Promise<TripParticipant> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('成員名稱不可為空白');
  const { data, error } = await supabase
    .from('trip_participants')
    .insert({ trip_id: tripId, display_name: trimmed })
    .select()
    .single();
  if (error) throw error;
  return rowToTripParticipant(data as TripParticipantRow);
}

// --- Expenses + splits ---------------------------------------------------------

const EXPENSE_SELECT_WITH_RELATIONS = `
  *,
  payer:trip_participants!expenses_payer_id_fkey (
    id,
    trip_id,
    display_name,
    user_id,
    created_at
  ),
  splits:expense_splits (
    id,
    expense_id,
    participant_id,
    owed_amount
  )
`;

export async function getExpensesByTripId(tripId: string): Promise<ExpenseWithSplits[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT_WITH_RELATIONS)
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ExpenseRowWithRelations[];
  return rows.map(rowToExpenseWithSplits);
}

/**
 * 刪除成員前必查：是否為任一筆花費的付款人 (payer_id) 或分攤列 (expense_splits.participant_id)。
 * DB 上 expense_splits 對 trip_participants 為 ON DELETE CASCADE，若未攔截會刪掉分攤列但主檔總額不變，造成帳不平；
 * 因此前端須一律先通過此檢查再呼叫 deleteTripParticipant；payer 則另受 DB RESTRICT 保護。
 */
export async function isTripParticipantInvolvedInLedger(
  tripId: string,
  participantId: string,
): Promise<boolean> {
  const expenses = await getExpensesByTripId(tripId);
  return expenses.some(
    (e) =>
      e.payerId === participantId ||
      e.splits.some((s) => s.participantId === participantId),
  );
}

async function getExpenseWithSplitsById(expenseId: string): Promise<ExpenseWithSplits | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT_WITH_RELATIONS)
    .eq('id', expenseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToExpenseWithSplits(data as ExpenseRowWithRelations);
}

/**
 * 單一流程：先插入 expenses，再批次插入 expense_splits；若明細失敗則刪除已建立的主檔。
 */
export async function createExpense(
  expenseData: CreateExpensePayload,
  splitsData: CreateExpenseSplitPayload[],
): Promise<ExpenseWithSplits> {
  if (!expenseData.title.trim()) throw new Error('花費標題不可為空白');

  const insertRow = createExpensePayloadToInsertRow(expenseData);

  const { data: inserted, error: insertErr } = await supabase
    .from('expenses')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertErr) throw insertErr;
  const expenseId = inserted.id as string;

  if (splitsData.length > 0) {
    const splitRows = splitsData.map((s) => ({
      expense_id: expenseId,
      participant_id: s.participantId,
      owed_amount: s.owedAmount,
    }));
    const { error: splitsErr } = await supabase.from('expense_splits').insert(splitRows);
    if (splitsErr) {
      await supabase.from('expenses').delete().eq('id', expenseId);
      throw splitsErr;
    }
  }

  const full = await getExpenseWithSplitsById(expenseId);
  if (!full) throw new Error('建立花費後無法讀取完整資料');
  return full;
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  const { id, ...patch } = expenseToRow(expense);
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToExpense(data as ExpenseRow);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function deleteTripParticipant(participantId: string): Promise<void> {
  const { error } = await supabase.from('trip_participants').delete().eq('id', participantId);
  if (error) throw error;
}
