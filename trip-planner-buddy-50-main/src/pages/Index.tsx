import { useState, useEffect } from 'react';
import VideoIntro from '@/components/VideoIntro';
import Header from '@/components/Header';
import HeroCarousel from '@/components/HeroCarousel';
import OngoingTripsSection from '@/components/OngoingTripsSection';
import TripListSection from '@/components/TripListSection';

const Index = () => {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('introShown');
  });

  useEffect(() => {
    if (showIntro) {
      sessionStorage.setItem('introShown', 'true');
    }
  }, [showIntro]);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <VideoIntro />}
      <Header />
      <HeroCarousel />
      <OngoingTripsSection />
      <TripListSection />
      <footer className="py-8 bg-primary text-primary-foreground text-center text-sm">
        <p>© 2026 旅遊規劃. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
