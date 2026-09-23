import { GeoCoordinates } from "../types.js";

// In-memory cache to prevent redundant requests
const geocodeCache = new Map<string, GeoCoordinates>();

// Mexican Postal Code prefix -> State / Major City map
const CP_STATE_MAP: Record<string, { state: string; city?: string }> = {
  "01": { state: "Ciudad de México", city: "Álvaro Obregón" },
  "02": { state: "Ciudad de México", city: "Azcapotzalco" },
  "03": { state: "Ciudad de México", city: "Benito Juárez" },
  "04": { state: "Ciudad de México", city: "Coyoacán" },
  "05": { state: "Ciudad de México", city: "Cuajimalpa" },
  "06": { state: "Ciudad de México", city: "Cuauhtémoc" },
  "07": { state: "Ciudad de México", city: "Gustavo A. Madero" },
  "08": { state: "Ciudad de México", city: "Iztacalco" },
  "09": { state: "Ciudad de México", city: "Iztapalapa" },
  "10": { state: "Ciudad de México", city: "Magdalena Contreras" },
  "11": { state: "Ciudad de México", city: "Miguel Hidalgo" },
  "12": { state: "Ciudad de México", city: "Milpa Alta" },
  "13": { state: "Ciudad de México", city: "Tláhuac" },
  "14": { state: "Ciudad de México", city: "Tlalpan" },
  "15": { state: "Ciudad de México", city: "Venustiano Carranza" },
  "16": { state: "Ciudad de México", city: "Xochimilco" },
  "20": { state: "Aguascalientes", city: "Aguascalientes" },
  "21": { state: "Baja California", city: "Mexicali" },
  "22": { state: "Baja California", city: "Tijuana" },
  "23": { state: "Baja California Sur", city: "La Paz" },
  "24": { state: "Campeche", city: "Campeche" },
  "25": { state: "Coahuila", city: "Saltillo" },
  "26": { state: "Coahuila", city: "Torreón" },
  "27": { state: "Coahuila", city: "Monclova" },
  "28": { state: "Colima", city: "Colima" },
  "29": { state: "Chiapas", city: "Tuxtla Gutiérrez" },
  "30": { state: "Chiapas", city: "Tapachula" },
  "31": { state: "Chihuahua", city: "Chihuahua" },
  "32": { state: "Chihuahua", city: "Ciudad Juárez" },
  "34": { state: "Durango", city: "Durango" },
  "36": { state: "Guanajuato", city: "Guanajuato" },
  "37": { state: "Guanajuato", city: "León" },
  "38": { state: "Guanajuato", city: "Celaya" },
  "39": { state: "Guerrero", city: "Acapulco" },
  "40": { state: "Guerrero", city: "Chilpancingo" },
  "42": { state: "Hidalgo", city: "Pachuca" },
  "44": { state: "Jalisco", city: "Guadalajara" },
  "45": { state: "Jalisco", city: "Zapopan" },
  "46": { state: "Jalisco", city: "Tlaquepaque" },
  "50": { state: "Estado de México", city: "Toluca" },
  "52": { state: "Estado de México", city: "Naucalpan" },
  "53": { state: "Estado de México", city: "Naucalpan" },
  "54": { state: "Estado de México", city: "Tlalnepantla" },
  "55": { state: "Estado de México", city: "Ecatepec" },
  "57": { state: "Estado de México", city: "Nezahualcóyotl" },
  "58": { state: "Michoacán", city: "Morelia" },
  "62": { state: "Morelos", city: "Cuernavaca" },
  "63": { state: "Nayarit", city: "Tepic" },
  "64": { state: "Nuevo León", city: "Monterrey" },
  "65": { state: "Nuevo León", city: "Guadalupe" },
  "66": { state: "Nuevo León", city: "San Pedro Garza García" },
  "68": { state: "Oaxaca", city: "Oaxaca" },
  "72": { state: "Puebla", city: "Puebla" },
  "76": { state: "Querétaro", city: "Santiago de Querétaro" },
  "77": { state: "Quintana Roo", city: "Cancún" },
  "78": { state: "San Luis Potosí", city: "San Luis Potosí" },
  "80": { state: "Sinaloa", city: "Culiacán" },
  "83": { state: "Sonora", city: "Hermosillo" },
  "86": { state: "Tabasco", city: "Villahermosa" },
  "87": { state: "Tamaulipas", city: "Ciudad Victoria" },
  "88": { state: "Tamaulipas", city: "Reynosa" },
  "90": { state: "Tlaxcala", city: "Tlaxcala" },
  "91": { state: "Veracruz", city: "Xalapa" },
  "92": { state: "Veracruz", city: "Veracruz" },
  "97": { state: "Yucatán", city: "Mérida" },
  "98": { state: "Zacatecas", city: "Zacatecas" },
};

async function queryOSMNominatim(query: string): Promise<GeoCoordinates | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "PanicGuard/1.0",
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return {
            latitude: lat,
            longitude: lon,
            accuracy: 10,
          };
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export async function geocodeAddress(address: string, city?: string): Promise<GeoCoordinates | null> {
  if (!address || address.trim().length < 3) return null;

  const cleanAddr = address.replace(/^.*?—\s*/, "").trim();
  const cacheKey = `${cleanAddr}|${city || ""}`.toLowerCase();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Check for 5-digit Mexican postal code (e.g. 62490)
  const cpMatch = cleanAddr.match(/\b(\d{5})\b/) || (city ? city.match(/\b(\d{5})\b/) : null);
  let inferredState = "";
  let inferredCity = "";
  if (cpMatch && cpMatch[1]) {
    const prefix = cpMatch[1].substring(0, 2);
    if (CP_STATE_MAP[prefix]) {
      inferredState = CP_STATE_MAP[prefix].state;
      inferredCity = CP_STATE_MAP[prefix].city || "";
    }
  }

  // Expanded street naming (Av. -> Avenida, Calz. -> Calzada)
  const expandedAddr = cleanAddr
    .replace(/\bAv\.?\b/gi, "Avenida")
    .replace(/\bCalz\.?\b/gi, "Calzada")
    .replace(/\bBlvd\.?\b/gi, "Boulevard")
    .replace(/\bCol\.?\b/gi, "Colonia");

  const withoutNumber = expandedAddr
    .replace(/\s+\d+[-A-Za-z0-9]*,?/g, "")
    .replace(/\b(Colonia|Col\.?)\s+[A-Za-z0-9]+/gi, "")
    .trim();

  // Multi-stage prioritized queries
  const searchQueries: string[] = [];

  if (inferredState) {
    // Prioritize precise state and municipality
    if (withoutNumber) {
      searchQueries.push(`${withoutNumber}, ${inferredCity}, ${inferredState}, México`);
    }
    searchQueries.push(`${expandedAddr}, ${inferredCity}, ${inferredState}, México`);
    searchQueries.push(`${expandedAddr}, ${inferredState}, México`);
    if (inferredCity) {
      searchQueries.push(`${inferredCity}, ${inferredState}, México`);
    }
  } else if (city) {
    if (withoutNumber) {
      searchQueries.push(`${withoutNumber}, ${city}, México`);
    }
    searchQueries.push(`${expandedAddr}, ${city}, México`);
  }

  // General fallbacks
  if (withoutNumber) {
    searchQueries.push(`${withoutNumber}, México`);
  }
  searchQueries.push(`${expandedAddr}, México`);

  // Execute progressive queries
  for (const q of searchQueries) {
    const coords = await queryOSMNominatim(q);
    if (coords) {
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
  }

  return null;
}
