import { GeoCoordinates } from "../types.js";

// In-memory cache to prevent redundant requests
const geocodeCache = new Map<string, GeoCoordinates>();

export async function geocodeAddress(address: string, city?: string): Promise<GeoCoordinates | null> {
  if (!address || address.trim().length < 3) return null;

  const fullQuery = [
    address.trim(),
    city?.trim(),
    city?.toLowerCase().includes("méxico") || city?.toLowerCase().includes("mexico") || city?.toLowerCase().includes("cdmx") ? "" : "México"
  ]
    .filter(Boolean)
    .join(", ");

  if (geocodeCache.has(fullQuery)) {
    return geocodeCache.get(fullQuery)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`,
      {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "PanicGuard/1.0",
        },
      }
    );

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const coords: GeoCoordinates = {
            latitude: lat,
            longitude: lon,
            accuracy: 5,
          };
          geocodeCache.set(fullQuery, coords);
          return coords;
        }
      }
    }
  } catch (err) {
    console.warn("Geocoding error for address:", fullQuery, err);
  }

  return null;
}
