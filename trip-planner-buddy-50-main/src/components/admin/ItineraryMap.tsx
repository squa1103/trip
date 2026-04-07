import { useEffect, useRef } from 'react';
import { ActivityCard } from '@/types/trip';

interface Props {
  activities: ActivityCard[];
  /** When false the map is still rendered but no markers are drawn. */
  showMarkers: boolean;
}

const ACTION_COLOR = '#B8A390'; // matches CSS --action

/**
 * Renders a Google Maps panel with numbered markers for each activity that
 * has lat/lng data.  The map is initialised lazily on first render inside the
 * same effect that handles markers, so there is no init/markers race condition.
 */
const ItineraryMap = ({ activities, showMarkers }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!window.google?.maps) return;

    // ── 1. Initialise map on first run ──────────────────────────────────────
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: 25.033, lng: 121.565 }, // Taipei default
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    // Ensure the map re-renders correctly inside a flex/sticky container
    google.maps.event.trigger(mapRef.current, 'resize');

    // ── 2. Clear old markers ────────────────────────────────────────────────
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!showMarkers) return;

    // ── 3. Add numbered markers for activities with coordinates ─────────────
    const valid = activities.filter(
      (a) => typeof a.lat === 'number' && typeof a.lng === 'number'
    );
    if (valid.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    valid.forEach((act, i) => {
      const pos = { lat: act.lat as number, lng: act.lng as number };

      const marker = new google.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: act.title || `景點 ${i + 1}`,
        label: {
          text: String(i + 1),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '700',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: ACTION_COLOR,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 14,
          labelOrigin: new google.maps.Point(0, 0),
        },
      });

      markersRef.current.push(marker);
      bounds.extend(pos);
    });

    // ── 4. Fit bounds ───────────────────────────────────────────────────────
    if (valid.length === 1) {
      mapRef.current.setCenter({ lat: valid[0].lat as number, lng: valid[0].lng as number });
      mapRef.current.setZoom(15);
    } else {
      mapRef.current.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [activities, showMarkers]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default ItineraryMap;
