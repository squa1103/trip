import { useState, useEffect, useCallback } from 'react';
import { introVideoUrl } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

const VideoIntro = () => {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('homepage_settings')
      .select('value')
      .eq('key', 'intro_video')
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value && typeof data.value === 'string') {
          setSrc(data.value);
        } else {
          setSrc(introVideoUrl);
        }
      });
  }, []);

  const handleEnd = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => setShow(false), 800);
  }, []);

  useEffect(() => {
    if (!src) return;
    const timer = setTimeout(handleEnd, 6000);
    return () => clearTimeout(timer);
  }, [handleEnd, src]);

  if (!show || src === null) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-primary transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleEnd}
    >
      <video
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover animate-zoom-in-slow"
        onEnded={handleEnd}
      >
        <source src={src} type="video/mp4" />
      </video>
      <button
        onClick={handleEnd}
        className="absolute bottom-8 right-8 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        略過
      </button>
    </div>
  );
};

export default VideoIntro;
