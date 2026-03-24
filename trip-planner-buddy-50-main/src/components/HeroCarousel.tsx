import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockCarouselSlides } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

type Slide = { id: string; imageUrl: string; title?: string };

const CAROUSEL_FALLBACK_IMAGE = mockCarouselSlides[0].imageUrl;

/** 避免空字串、非 http(s)／相對路徑以外的無效值被當成 img src */
function isValidImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith('/')) return true;
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

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<Slide[]>(mockCarouselSlides);
  const [fallbackSrcById, setFallbackSrcById] = useState<Record<string, true>>({});

  const fetchSlides = useCallback(async () => {
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('value')
      .eq('key', 'carousel_slides')
      .single();
    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      const next = sanitizeCarouselSlides(data.value);
      setSlides(next.length > 0 ? next : mockCarouselSlides);
      setCurrent(0);
      setFallbackSrcById({});
    }
  }, []);

  useEffect(() => {
    fetchSlides();
    const handleUpdate = () => fetchSlides();
    window.addEventListener('carouselUpdated', handleUpdate);
    return () => window.removeEventListener('carouselUpdated', handleUpdate);
  }, [fetchSlides]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1200/500', maxHeight: '50vh' }}>
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
