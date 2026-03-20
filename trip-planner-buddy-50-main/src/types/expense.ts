/** 行程成員（對應 public.trip_participants） */
export interface TripParticipant {
  id: string;
  tripId: string;
  displayName: string;
  userId: string | null;
  createdAt?: string;
}

/** 花費主檔（對應 public.expenses） */
export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amountTotal: number;
  /** ISO 4217，例如 TWD、JPY */
  currency: string;
  /** 語意：1 單位 currency 兌換多少基準幣（例如 TWD）；預設 1 */
  exchangeRate: number;
  payerId: string;
  /** YYYY-MM-DD（與 HTML date input 相同格式） */
  expenseDate: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 分攤明細（對應 public.expense_splits；金額通常與主檔 currency 相同） */
export interface ExpenseSplit {
  id: string;
  expenseId: string;
  participantId: string;
  owedAmount: number;
}

/** 含分攤與付款人（巢狀查詢結果） */
export interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
  payer: TripParticipant;
}

/** 新增花費（無 id / 時間戳） */
export interface CreateExpensePayload {
  tripId: string;
  title: string;
  amountTotal: number;
  currency?: string;
  exchangeRate?: number;
  payerId: string;
  expenseDate: string;
}

/** 新增分攤列（由 createExpense 寫入 expense_id） */
export interface CreateExpenseSplitPayload {
  participantId: string;
  owedAmount: number;
}
