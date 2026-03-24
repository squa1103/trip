import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockCarouselSlides } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

type Slide = { id: string; imageUrl: string; title?: string };

const CAROUSEL_FALLBACK_IMAGE = mockCarouselSlides[0].imageUrl;
const CACHE_KEY = 'rq:carousel-slides';
const CACHE_TS_KEY = 'rq:carousel-slides:ts';

function isValidImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith('/')) return true;
  if (u.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeCarouselSlides(raw: unknown): Slide[] {
  if (!Array.isArray(raw)) return [];
  const out: Slide[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const imageUrl = typeof row.imageUrl === 'string' ? row.imageUrl : '';
    if (!isValidImageUrl(imageUrl)) continue;
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id
        : `slide-${i}-${imageUrl.slice(0, 32)}`;
    const slide: Slide = { id, imageUrl: imageUrl.trim() };
    if (typeof row.title === 'string' && row.title.trim()) slide.title = row.title.trim();
    out.push(slide);
  }
  return out;
}

async function fetchCarouselSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from('homepage_settings')
    .select('value')
    .eq('key', 'carousel_slides')
    .single();

  // #region agent log
  const rawLen = Array.isArray(data?.value) ? data.value.length : 0;
  const rawUrls = Array.isArray(data?.value) ? (data.value as Record<string,unknown>[]).map(s => String(s.imageUrl ?? '').substring(0, 80)) : [];
  fetch('http://127.0.0.1:7734/ingest/054f41fb-cd3b-4d1b-953e-11737b511e61',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2b75fe'},body:JSON.stringify({sessionId:'2b75fe',location:'HeroCarousel.tsx:fetch',message:'DB query result',data:{error:error?.message??null,hasData:!!data,rawLen,rawUrls},timestamp:Date.now(),hypothesisId:'H1,H2'})}).catch(()=>{});
  // #endregion

  let slides: Slide[] = mockCarouselSlides;
  if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
    const sanitized = sanitizeCarouselSlides(data.value);
    // #region agent log
    fetch('http://127.0.0.1:7734/ingest/054f41fb-cd3b-4d1b-953e-11737b511e61',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2b75fe'},body:JSON.stringify({sessionId:'2b75fe',location:'HeroCarousel.tsx:sanitize',message:'After sanitize',data:{sanitizedLen:sanitized.length,sanitizedUrls:sanitized.map(s=>s.imageUrl.substring(0,80))},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (sanitized.length > 0) slides = sanitized;
  }

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(slides));
    sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7734/ingest/054f41fb-cd3b-4d1b-953e-11737b511e61',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2b75fe'},body:JSON.stringify({sessionId:'2b75fe',location:'HeroCarousel.tsx:cache',message:'sessionStorage write failed',data:{err:String(e)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  }

  return slides;
}

function readCachedSlides(): Slide[] | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Slide[];
  } catch { /* corrupt cache – ignore */ }
  return undefined;
}

function readCachedTimestamp(): number {
  try {
    const ts = sessionStorage.getItem(CACHE_TS_KEY);
    if (ts) return Number(ts);
  } catch {}
  return 0;
}

const HeroCarousel = () => {
  const queryClient = useQueryClient();
  const { data: slides = mockCarouselSlides } = useQuery({
    queryKey: ['carousel-slides'],
    queryFn: fetchCarouselSlides,
    staleTime: 5 * 60 * 1000,
    initialData: readCachedSlides,
    initialDataUpdatedAt: readCachedTimestamp,
  });

  const [current, setCurrent] = useState(0);
  const [fallbackSrcById, setFallbackSrcById] = useState<Record<string, true>>({});

  useEffect(() => {
    setCurrent(0);
    setFallbackSrcById({});
  }, [slides]);

  useEffect(() => {
    const handleUpdate = () => queryClient.invalidateQueries({ queryKey: ['carousel-slides'] });
    window.addEventListener('carouselUpdated', handleUpdate);
    return () => window.removeEventListener('carouselUpdated', handleUpdate);
  }, [queryClient]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '12/5', maxHeight: '60vh' }}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img
            src={fallbackSrcById[slide.id] ? CAROUSEL_FALLBACK_IMAGE : slide.imageUrl}
            alt={slide.title || ''}
            className="w-full h-full object-cover"
            onError={() => {
              setFallbackSrcById((prev) => (prev[slide.id] ? prev : { ...prev, [slide.id]: true }));
            }}
          />
          <div className="absolute inset-0 bg-hero-overlay" />
          {slide.title && (
            <div className="absolute bottom-12 left-8 md:left-16">
              <h2 className="text-2xl md:text-4xl font-bold drop-shadow-lg animate-slide-up" style={{ color: '#FFF7FB' }}>
                {slide.title}
              </h2>
            </div>
          )}
        </div>
      ))}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-white flex items-center justify-center hover:bg-primary/70 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-white flex items-center justify-center hover:bg-primary/70 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-colors ${i === current ? 'bg-secondary' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
