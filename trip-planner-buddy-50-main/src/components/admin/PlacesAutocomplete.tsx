import { useEffect, useRef } from 'react';

export interface PlaceData {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onPlaceSelect: (data: PlaceData) => void;
  onInputChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Wraps `google.maps.places.Autocomplete` on a controlled input.
 *
 * Key design decisions:
 * - The autocomplete is created only once (`[]` deps).
 * - `onPlaceSelect` is kept in a ref so the closure is always fresh without
 *   causing the autocomplete to be torn down and recreated on every render.
 */
const PlacesAutocomplete = ({
  value,
  onPlaceSelect,
  onInputChange,
  placeholder = '搜尋地點或貼上地址',
  className,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Keep a stable ref to the latest callback — avoids re-creating the autocomplete
  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  });

  // Create autocomplete once after mount (google.maps.places is guaranteed
  // to exist because the parent only renders this component after mapsReady).
  useEffect(() => {
    if (!inputRef.current) return;
    if (!window.google?.maps?.places) return;
    if (autocompleteRef.current) return; // guard against double-init in dev StrictMode

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'geometry', 'formatted_address', 'name'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      onPlaceSelectRef.current({
        address: place.formatted_address || place.name || '',
        placeId: place.place_id || '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });

    autocompleteRef.current = ac;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — init once, keep callback fresh via ref above

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onInputChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
};

export default PlacesAutocomplete;
