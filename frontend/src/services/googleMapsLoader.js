/**
 * Helper to dynamically load Google Maps JavaScript API with Places library.
 */
let loadPromise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(new Error("No Google Maps API key provided."));
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const scriptId = "google-maps-script";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google);
      } else {
        loadPromise = null;
        reject(new Error("Google Maps script loaded but window.google is not available."));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(
        new Error(
          "Failed to load Google Maps script. Please verify your API key and network connection."
        )
      );
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
