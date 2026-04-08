/**
 * Bootstrap loader for the Google Maps JavaScript API (loading=async mode).
 *
 * With `loading=async`, the script only injects the `google.maps.importLibrary`
 * stub.  Actual libraries (maps, places, …) are fetched on demand by each
 * component via `await google.maps.importLibrary('...')`.
 *
 * Do NOT use `callback=` or `libraries=` together with `loading=async` —
 * they conflict with the dynamic import pattern.
 */
let bootstrapPromise: Promise<void> | null = null;

export function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // Already bootstrapped?
  if ((window as Record<string, unknown>).google &&
      typeof (window as any).google.maps?.importLibrary === 'function') {
    return Promise.resolve();
  }

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      bootstrapPromise = null;
      reject(new Error('Google Maps bootstrap script failed to load'));
    };
    document.head.appendChild(script);
  });

  return bootstrapPromise;
}
