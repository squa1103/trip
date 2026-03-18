import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { introVideoUrl } from '@/data/mockData';

const VideoIntro = () => {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  const handleEnd = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => setShow(false), 800);
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleEnd, 6000);
    return () => clearTimeout(timer);
  }, [handleEnd]);

  if (!show) return null;

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
        <source src={introVideoUrl} type="video/mp4" />
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
