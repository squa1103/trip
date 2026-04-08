import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';

export interface PlaceData {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface Props {
  initialValue?: string;
  onPlaceSelect: (data: PlaceData) => void;
  className?: string;
}

/**
 * Custom Places Autocomplete built on AutocompleteSuggestion (Places API New).
 *
 * Unlike `PlaceAutocompleteElement`, this component owns its own <input> and
 * dropdown, so styling is 100% under our control with plain Tailwind classes.
 *
 * Flow:
 *  1. User types → debounced fetchAutocompleteSuggestions()
 *  2. Dropdown renders suggestions
 *  3. User clicks a suggestion → place.fetchFields() → onPlaceSelect()
 *  4. Session token is refreshed after each completed selection (billing best-practice)
 */
const PlacesAutocomplete = ({ initialValue, onPlaceSelect, className }: Props) => {
  const [inputValue, setInputValue]   = useState(initialValue ?? '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen]           = useState(false);
  const [loading, setLoading]         = useState(false);

  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef  = useRef<any>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; });

  // ── Initialise session token ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const lib = await google.maps.importLibrary('places') as any;
      sessionTokenRef.current = lib.AutocompleteSessionToken
        ? new lib.AutocompleteSessionToken()
        : null;
    })();
  }, []);

  // ── Fetch suggestions (debounced 300 ms) ──────────────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSuggestions([]); setIsOpen(false); return; }

    setLoading(true);
    try {
      const lib = await google.maps.importLibrary('places') as any;
      const { suggestions: results } =
        await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          ...(sessionTokenRef.current ? { sessionToken: sessionTokenRef.current } : {}),
        });
      setSuggestions(results ?? []);
      setIsOpen((results ?? []).length > 0);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  // ── Handle suggestion selection ───────────────────────────────────────────
  const handleSelect = async (suggestion: any) => {
    setIsOpen(false);
    setSuggestions([]);

    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'formattedAddress', 'location', 'displayName'],
    });

    const address = place.formattedAddress ?? (place.displayName as any)?.text ?? '';
    setInputValue(address);

    // Renew session token for next search (billing best-practice)
    const lib = await google.maps.importLibrary('places') as any;
    if (lib.AutocompleteSessionToken) {
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    }

    onPlaceSelectRef.current({
      placeId: place.id ?? '',
      address,
      lat: place.location?.lat() ?? 0,
      lng: place.location?.lng() ?? 0,
    });
  };

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>

      {/* Input with search icon */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-[#5C4F45]" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="搜尋地點"
          autoComplete="off"
          className="w-full pl-7 pr-2 py-1.5 rounded border border-[#C4B09A] bg-[#D6C5B3]
                     text-[#5C4F45] text-sm outline-none
                     placeholder:text-[#5C4F45]/60
                     focus:border-[#5C4F45] focus:ring-1 focus:ring-[#5C4F45]
                     transition-colors"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-[#5C4F45]/30 border-t-[#5C4F45] animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-[#E5DDD5] shadow-lg overflow-hidden py-1">
          {suggestions.map((s: any, i: number) => {
            const pred      = s.placePrediction;
            const main      = pred?.mainText?.text      ?? pred?.text?.text ?? '';
            const secondary = pred?.secondaryText?.text ?? '';
            return (
              <li
                key={i}
                onMouseDown={() => handleSelect(s)}
                className="px-3 py-2 cursor-pointer hover:bg-[#F7F3F0] transition-colors"
              >
                <span className="block text-sm font-medium text-[#1F2937] leading-tight">
                  {main}
                </span>
                {secondary && (
                  <span className="block text-xs text-[#6B7280] leading-tight mt-0.5">
                    {secondary}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
