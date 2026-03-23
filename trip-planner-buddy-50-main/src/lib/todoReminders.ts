import type { Trip, TodoItem } from '@/types/trip';

export const remindOffsetOptions: Array<{ label: string; minutes: number }> = [
  { label: '準時', minutes: 0 },
  { label: '30 分鐘前', minutes: 30 },
  { label: '1 小時前', minutes: 60 },
  { label: '2 小時前', minutes: 120 },
  { label: '1 天前', minutes: 1440 },
  { label: '2 天前', minutes: 2880 },
];

const ACK_STORAGE_KEY = 'todoReminderAcks_v1';

export function datetimeLocalToISO(datetimeLocal: string): string | null {
  // `datetime-local` has no timezone info, so `new Date(value)` is interpreted as local time by browsers.
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return d.toISOString();
}

export function computeRemindTimeISO(dueAtIso: string, remindOffsetMinutes: number): string {
  const dueMs = Date.parse(dueAtIso);
  return new Date(dueMs - remindOffsetMinutes * 60_000).toISOString();
}

export function formatDateTimeZhTw(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getReminderAckKey(tripId: string, todoId: string, remindTimeIso: string): string {
  return `${tripId}|${todoId}|${remindTimeIso}`;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadReminderAckSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
  const parsed = safeParseJSON<string[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((x): x is string => typeof x === 'string'));
}

export function saveReminderAckSet(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export interface ActiveReminder {
  tripId: string;
  tripTitle: string;
  todoId: string;
  todoText: string;
  remindTimeIso: string;
  ackKey: string;
}

export function getActiveUnreadReminders(trips: Trip[], nowMs: number, acked: Set<string>): ActiveReminder[] {
  const out: ActiveReminder[] = [];

  for (const trip of trips) {
    for (const todo of trip.todos as TodoItem[]) {
      if (todo.checked) continue;
      if (!todo.remindTime) continue;

      const remindMs = Date.parse(todo.remindTime);
      if (Number.isNaN(remindMs)) continue;
      if (remindMs > nowMs) continue; // not due yet

      const ackKey = getReminderAckKey(trip.id, todo.id, todo.remindTime);
      if (acked.has(ackKey)) continue;

      out.push({
        tripId: trip.id,
        tripTitle: trip.title,
        todoId: todo.id,
        todoText: todo.text,
        remindTimeIso: todo.remindTime,
        ackKey,
      });
    }
  }

  out.sort((a, b) => Date.parse(a.remindTimeIso) - Date.parse(b.remindTimeIso));
  return out;
}

export interface TriggeredReminder extends ActiveReminder {
  isRead: boolean;
}

/**
 * 目前「已觸發」的提醒：todo 未完成且 remindTime 已到（remindTime <= nowMs）。
 * isRead 由 localStorage ack 集合決定；未點擊則 isRead=false。
 */
export function getTriggeredReminders(trips: Trip[], nowMs: number, acked: Set<string>): TriggeredReminder[] {
  const out: TriggeredReminder[] = [];

  for (const trip of trips) {
    for (const todo of trip.todos as TodoItem[]) {
      if (todo.checked) continue;
      if (!todo.remindTime) continue;

      const remindMs = Date.parse(todo.remindTime);
      if (Number.isNaN(remindMs)) continue;
      if (remindMs > nowMs) continue; // not triggered yet

      const ackKey = getReminderAckKey(trip.id, todo.id, todo.remindTime);
      const isRead = acked.has(ackKey);

      out.push({
        tripId: trip.id,
        tripTitle: trip.title,
        todoId: todo.id,
        todoText: todo.text,
        remindTimeIso: todo.remindTime,
        ackKey,
        isRead,
      });
    }
  }

  out.sort((a, b) => Date.parse(a.remindTimeIso) - Date.parse(b.remindTimeIso));
  return out;
}

