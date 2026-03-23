import { useEffect, useState, useMemo, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, is_read, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as NotificationRow[]);
    } else {
      setNotifications([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchNotifications();
    });

    return () => subscription.unsubscribe();
  }, [fetchNotifications]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.is_read), [notifications]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);

    if (error) {
      await fetchNotifications();
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-sidebar-accent transition-colors text-primary-foreground"
          aria-label="通知"
        >
          <Bell className="h-5 w-5" />
          {hasUnread ? (
            <span
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-primary"
              aria-hidden
            />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-0 border-border bg-popover text-popover-foreground"
        sideOffset={8}
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">通知</p>
        </div>
        {loading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">載入中…</div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">目前沒有通知</div>
        ) : (
          <ScrollArea className="h-[min(320px,50vh)]">
            <ul className="p-1">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) void handleMarkRead(n.id);
                    }}
                    className={cn(
                      'w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      !n.is_read && 'bg-accent/40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1.5 w-2 shrink-0 flex justify-center" aria-hidden>
                        {!n.is_read ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium leading-tight">{n.title}</p>
                        <p className="text-muted-foreground text-xs leading-snug whitespace-pre-wrap break-words">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
