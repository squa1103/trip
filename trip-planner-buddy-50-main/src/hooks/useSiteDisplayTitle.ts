import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_TITLE = '後台管理';
export const SITE_NAME_STORAGE_KEY = 'siteName';

export function useSiteDisplayTitle(): string {
  const [title, setTitle] = useState(() => {
    const local = localStorage.getItem(SITE_NAME_STORAGE_KEY);
    if (local?.trim()) return local.trim();
    return DEFAULT_TITLE;
  });

  useEffect(() => {
    const fetchName = async () => {
      const { data } = await supabase
        .from('homepage_settings')
        .select('value')
        .eq('key', 'site_name')
        .maybeSingle();
      const v = data?.value;
      if (typeof v === 'string' && v.trim()) {
        const t = v.trim();
        setTitle(t);
        localStorage.setItem(SITE_NAME_STORAGE_KEY, t);
      } else {
        setTitle(DEFAULT_TITLE);
        localStorage.removeItem(SITE_NAME_STORAGE_KEY);
      }
    };

    const onUpdated = (e: Event) => {
      const name = (e as CustomEvent<{ name: string }>).detail?.name;
      if (name === undefined) return;
      const trimmed = name.trim();
      if (trimmed) {
        localStorage.setItem(SITE_NAME_STORAGE_KEY, trimmed);
        setTitle(trimmed);
      } else {
        localStorage.removeItem(SITE_NAME_STORAGE_KEY);
        setTitle(DEFAULT_TITLE);
      }
    };

    fetchName();
    window.addEventListener('siteNameUpdated', onUpdated);
    return () => window.removeEventListener('siteNameUpdated', onUpdated);
  }, []);

  return title;
}
