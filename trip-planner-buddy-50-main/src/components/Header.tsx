import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import { Trip } from '@/types/trip';
import { supabase } from '@/lib/supabase';
import { fetchTrips } from '@/lib/trips';
import { getActiveUnreadReminders, formatDateTimeZhTw, loadReminderAckSet, saveReminderAckSet } from '@/lib/todoReminders';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

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
  const activeUnreadReminders = getActiveUnreadReminders(effectiveTrips, nowMs, acked);
  const unreadCount = activeUnreadReminders.length;

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-full hover:bg-sidebar-accent transition-colors"
                  aria-label="待辦提醒"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[340px]">
                <DropdownMenuLabel>提醒事項</DropdownMenuLabel>
                {activeUnreadReminders.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">目前沒有提醒</div>
                ) : (
                  activeUnreadReminders.map((r) => (
                    <DropdownMenuItem
                      key={r.ackKey}
                      onSelect={(e) => {
                        // Radix 預設會把 item 當成選取事件，此處阻止預設行為後執行「標記已讀」
                        e.preventDefault();
                        handleAck(r.ackKey);
                      }}
                    >
                      <div className="min-w-0 flex flex-col">
                        <span className="text-sm font-medium text-foreground truncate">{r.tripTitle}</span>
                        <span className="text-xs text-muted-foreground truncate">{r.todoText}</span>
                        <span className="text-xs text-muted-foreground mt-1">{formatDateTimeZhTw(r.remindTimeIso)}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
