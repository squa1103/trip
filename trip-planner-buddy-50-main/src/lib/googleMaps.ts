/** Singleton loader for the Google Maps JavaScript API (with Places library).
 *
 * Uses the `callback=` URL parameter — the only reliable signal that ALL
 * requested libraries (including `places`) are fully initialised.
 */
let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // Already loaded (including places)?
  if (window.google?.maps?.places) return Promise.resolve();
  // Already loading?
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Google calls this global function after every library is ready.
    (window as Record<string, unknown>).__googleMapsInit = () => {
      delete (window as Record<string, unknown>).__googleMapsInit;
      resolve();
    };

    const script = document.createElement('script');
    // NOTE: Do NOT add `loading=async` when using `callback=` — the two
    // mechanisms conflict. The callback approach is the classic, reliable way.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__googleMapsInit`;
    script.async = true;
    script.onerror = () => {
      delete (window as Record<string, unknown>).__googleMapsInit;
      loadPromise = null; // allow retry
      reject(new Error('Google Maps API failed to load'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
