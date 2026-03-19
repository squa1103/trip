import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import VideoIntro from '@/components/VideoIntro';
import Header from '@/components/Header';
import HeroCarousel from '@/components/HeroCarousel';
import OngoingTripsSection from '@/components/OngoingTripsSection';
import TripListSection from '@/components/TripListSection';
import { fetchTrips } from '@/lib/trips';

const Index = () => {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('introShown');
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  useEffect(() => {
    if (showIntro) {
      sessionStorage.setItem('introShown', 'true');
    }
  }, [showIntro]);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <VideoIntro />}
      <Header trips={trips} />
      <HeroCarousel />
      <OngoingTripsSection trips={trips} />
      <TripListSection trips={trips} />
      <footer className="py-8 bg-primary text-primary-foreground text-center text-sm">
        <p>© 2026 旅遊規劃. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
