import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { Trip } from '@/types/trip';
import { supabase } from '@/lib/supabase';
import { fetchTrips } from '@/lib/trips';
import { getTriggeredReminders, formatDateTimeZhTw, loadReminderAckSet, saveReminderAckSet } from '@/lib/todoReminders';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

interface Props {
  trips?: Trip[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const Header = ({ trips = [] }: Props) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [acked, setAcked] = useState<Set<string>>(() => loadReminderAckSet());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchLogo = async () => {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const apiUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/homepage_settings?key=eq.site_logo&select=value`;
        const res = await fetch(apiUrl, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        const data = await res.json();
        const value = Array.isArray(data) && data[0] != null ? data[0].value : data?.value;
        if (value != null && typeof value === 'string' && value.length > 0) {
          setLogoUrl(value);
          return;
        }
      } catch {
        // 略過，改用下方 fallback
      }
    }
    const { data } = await supabase
      .from('homepage_settings')
      .select('value')
      .eq('key', 'site_logo')
      .maybeSingle();
    const urlOrData = data?.value;
    if (urlOrData != null && typeof urlOrData === 'string' && urlOrData.length > 0) {
      setLogoUrl(urlOrData);
      return;
    }
    const local = localStorage.getItem('siteLogo');
    if (local) setLogoUrl(local);
  };

  useEffect(() => {
    fetchLogo();
    const retryId = setTimeout(fetchLogo, 1500);
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ logoUrl: string | null }>)?.detail?.logoUrl;
      if (url !== undefined) {
        setLogoUrl(url ?? null);
      } else {
        fetchLogo();
      }
    };
    window.addEventListener('logoUpdated', handler);
    return () => {
      clearTimeout(retryId);
      window.removeEventListener('logoUpdated', handler);
    };
  }, []);

  const { data: fetchedTrips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    enabled: trips.length === 0,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const effectiveTrips = trips.length > 0 ? trips : fetchedTrips;
  const triggeredReminders = getTriggeredReminders(effectiveTrips, nowMs, acked);
  const unreadReminders = triggeredReminders.filter((r) => !r.isRead);
  const readReminders = triggeredReminders.filter((r) => r.isRead);
  const unreadCount = unreadReminders.length;

  const handleAck = (ackKey: string) => {
    setAcked((prev) => {
      const next = new Set(prev);
      if (!next.has(ackKey)) next.add(ackKey);
      saveReminderAckSet(next);
      return next;
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-lg">
        <div className="w-full flex items-center justify-between h-16 px-4 md:px-8">
          <button onClick={() => navigate('/')} className="flex items-center mr-auto">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 sm:h-10 max-w-[120px] sm:max-w-[160px] object-contain" />
            ) : (
              <span className="text-lg sm:text-xl font-bold tracking-wider text-gold-gradient">LOGO</span>
            )}
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-sidebar-accent transition-colors"
              aria-label="搜尋"
            >
              <Search className="h-5 w-5" />
            </button>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  className="relative p-2 rounded-full hover:bg-sidebar-accent transition-colors"
                  aria-label="待辦提醒"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-3/4 sm:max-w-sm p-0">
                <div className="p-6">
                  <SheetTitle>提醒事項</SheetTitle>
                  <div className="mt-4 space-y-6">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">未讀</div>
                      {unreadReminders.length === 0 ? (
                        <div className="mt-2 text-sm text-muted-foreground">目前沒有未讀提醒</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {unreadReminders.map((r) => (
                            <button
                              key={r.ackKey}
                              type="button"
                              onClick={() => handleAck(r.ackKey)}
                              className="w-full text-left rounded-lg border border-border bg-card hover:bg-muted/50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{r.tripTitle}</div>
                                <div className="text-xs text-muted-foreground truncate">{r.todoText}</div>
                                <div className="text-xs text-muted-foreground mt-1">{formatDateTimeZhTw(r.remindTimeIso)}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">已讀</div>
                      {readReminders.length === 0 ? (
                        <div className="mt-2 text-sm text-muted-foreground">尚無已讀提醒</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {readReminders.map((r) => (
                            <div
                              key={r.ackKey}
                              className="w-full text-left rounded-lg border border-border bg-muted/30 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{r.tripTitle}</div>
                                <div className="text-xs text-muted-foreground truncate">{r.todoText}</div>
                                <div className="text-xs text-muted-foreground mt-1">{formatDateTimeZhTw(r.remindTimeIso)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <button
              onClick={() => navigate('/admin/login')}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 text-primary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              登入管理
            </button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} trips={trips} />
    </>
  );
};

export default Header;
