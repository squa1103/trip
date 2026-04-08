/**
 * Google Maps JavaScript API bootstrap — production-safe loader.
 *
 * Uses Google's official "inline bootstrap" pattern:
 *   https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 *
 * Key design:
 *   1. `google.maps.importLibrary` is installed as a queuing stub IMMEDIATELY
 *      (synchronously, before any network request), so any early caller that
 *      fires before the script finishes loading never hits
 *      "importLibrary is not a function".
 *   2. The stub queues library names and dispatches them to the real
 *      implementation once the Maps script has executed.
 *   3. The module-level `bootstrapPromise` prevents duplicate <script> tags.
 */

let bootstrapPromise: Promise<void> | null = null;

export function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // Fast path: bootstrap already finished and real importLibrary is in place.
  const win = window as any;
  if (bootstrapPromise && typeof win.google?.maps?.importLibrary === 'function') {
    return bootstrapPromise;
  }
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = new Promise<void>((resolve, reject) => {
    const g   = (win.google  = win.google  || {}) as Record<string, any>;
    const maps = (g.maps     = g.maps      || {}) as Record<string, any>;

    // ── Step 1: install stub immediately ─────────────────────────────────
    // This matches Google's official pattern. Any component that calls
    // `google.maps.importLibrary(...)` before the script finishes loading
    // will have its request queued and re-dispatched once the script is ready.
    const queuedLibs = new Set<string>();

    if (typeof maps['importLibrary'] !== 'function') {
      maps['importLibrary'] = (lib: string, ...args: unknown[]) => {
        queuedLibs.add(lib);
        // scriptReady resolves when onload fires (real importLibrary is set).
        // After that, delegate to whatever importLibrary is now (the real one).
        return scriptReady.then(() => (maps['importLibrary'] as Function)(lib, ...args));
      };
    }

    // ── Step 2: inject the actual Maps script ─────────────────────────────
    const params = new URLSearchParams({
      key:     apiKey,
      loading: 'async',
      v:       'weekly',
    });

    const script       = document.createElement('script');
    script.src         = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async       = true;
    script.defer       = true;

    // scriptReady is declared before it's referenced in the stub above.
    // eslint-disable-next-line prefer-const
    let scriptResolve!: () => void;
    // eslint-disable-next-line prefer-const
    let scriptReject!:  (err: Error) => void;
    const scriptReady  = new Promise<void>((res, rej) => {
      scriptResolve = res;
      scriptReject  = rej;
    });

    script.onload = () => {
      // The Maps script has now executed and (re-)set importLibrary to its real
      // implementation.  Resolve both the internal scriptReady and the exported
      // bootstrapPromise so callers can proceed.
      scriptResolve();
      resolve();
    };

    script.onerror = () => {
      bootstrapPromise = null;
      const err = new Error('Google Maps script failed to load — check the API key and network.');
      scriptReject(err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return bootstrapPromise;
}
