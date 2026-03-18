import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockCarouselSlides } from '@/data/mockData';

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const slides = mockCarouselSlides;

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
          <img src={slide.imageUrl} alt={slide.title || ''} className="w-full h-full object-cover" />
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
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-primary-foreground flex items-center justify-center hover:bg-primary/70 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/50 text-primary-foreground flex items-center justify-center hover:bg-primary/70 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-colors ${i === current ? 'bg-secondary' : 'bg-primary-foreground/40'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
