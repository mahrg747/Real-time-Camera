import { GpsLocation } from '../types';

// In-memory cache for reverse geocoding to avoid rate-limiting
const geocodeCache = new Map<string, string>();

function getCacheKey(lat: number, lng: number): string {
  // Round to ~10 meters precision for caching
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Perform reverse geocoding using OpenStreetMap Nominatim with BigDataCloud fallback.
 * Strictly returns null or descriptive error string if network/service fails.
 * NEVER fabricates an address.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const cacheKey = getCacheKey(latitude, longitude);
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Try OpenStreetMap Nominatim (High detail)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RealTimeCameraLocationMG/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        // Construct concise readable address
        const addr = data.address || {};
        const parts: string[] = [];
        
        if (addr.road || addr.street || addr.pedestrian) {
          parts.push(addr.road || addr.street || addr.pedestrian);
        }
        if (addr.suburb || addr.neighbourhood || addr.residential) {
          parts.push(addr.suburb || addr.neighbourhood || addr.residential);
        }
        if (addr.city || addr.town || addr.village || addr.county) {
          parts.push(addr.city || addr.town || addr.village || addr.county);
        }
        if (addr.state || addr.province) {
          parts.push(addr.state || addr.province);
        }
        if (addr.country) {
          parts.push(addr.country);
        }

        const formatted = parts.length > 0 ? parts.join(', ') : data.display_name;
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch {
    // Attempt fallback
  }

  // 2. Fallback to BigDataCloud client API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const parts: string[] = [];
      if (data.locality) parts.push(data.locality);
      if (data.city && data.city !== data.locality) parts.push(data.city);
      if (data.principalSubdivision) parts.push(data.principalSubdivision);
      if (data.countryName) parts.push(data.countryName);

      if (parts.length > 0) {
        const formatted = parts.join(', ');
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

/**
 * Get current device GPS location snapshot with high accuracy.
 */
export function getCurrentGpsPosition(): Promise<GpsLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
        address: null,
        isLocating: false,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = pos.coords;
        let address: string | null = null;
        try {
          address = await reverseGeocode(latitude, longitude);
        } catch {
          address = null;
        }

        resolve({
          latitude,
          longitude,
          accuracy: Math.round(accuracy * 10) / 10,
          altitude: altitude ? Math.round(altitude * 10) / 10 : null,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: pos.timestamp || Date.now(),
          address,
          isLocating: false,
          error: null,
        });
      },
      (err) => {
        let msg = 'Failed to obtain GPS location';
        if (err.code === 1) msg = 'Location access permission was denied';
        else if (err.code === 2) msg = 'GPS signal unavailable or disabled';
        else if (err.code === 3) msg = 'GPS location request timed out';

        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          altitude: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
          address: null,
          isLocating: false,
          error: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Format decimal coordinates to readable display (e.g. "28.613938, 77.209021" or with cardinal directions)
 */
export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return 'N/A';
  const latStr = Math.abs(lat).toFixed(6) + (lat >= 0 ? '° N' : '° S');
  const lngStr = Math.abs(lng).toFixed(6) + (lng >= 0 ? '° E' : '° W');
  return `${latStr}, ${lngStr} (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
}

/**
 * Google Maps link generator for given coordinates
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
