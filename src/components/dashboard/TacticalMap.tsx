import React, { useState, useEffect } from "react";
import { MapPin, ExternalLink, Layers, Copy, Check, Radio } from "lucide-react";
import { GeoCoordinates } from "../../types.js";

interface TacticalMapProps {
  coordinates?: GeoCoordinates;
  storeName?: string;
  address?: string;
  city?: string;
  className?: string;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  coordinates,
  storeName = "",
  address = "",
  city = "",
  className = "",
}) => {
  const cleanAddress = address ? address.replace(/^.*?—\s*/, "").trim() : "";
  const cleanCity = city ? city.trim() : "";
  const cleanStore = storeName ? storeName.trim() : "";

  // 1. Comprobar si hay coordenadas numéricas disponibles
  const hasValidCoords = Boolean(
    coordinates &&
    typeof coordinates.latitude === "number" &&
    typeof coordinates.longitude === "number" &&
    coordinates.latitude !== 0 &&
    !isNaN(coordinates.latitude)
  );

  const [mapType, setMapType] = useState<"m" | "k">("m"); // "m" = callejero, "k" = satélite
  const hasCleanAddress = Boolean(cleanAddress && cleanAddress.trim().length > 3);

  // Default to ADDRESS mode whenever a registered establishment address is available
  const [targetMode, setTargetMode] = useState<"ADDRESS" | "COORDS">(() => {
    return hasCleanAddress ? "ADDRESS" : hasValidCoords ? "COORDS" : "ADDRESS";
  });
  const [copied, setCopied] = useState<boolean>(false);

  // Keep targetMode set to ADDRESS when address is present, unless manually toggled
  useEffect(() => {
    if (hasCleanAddress) {
      setTargetMode("ADDRESS");
    } else if (hasValidCoords) {
      setTargetMode("COORDS");
    }
  }, [cleanAddress, coordinates?.latitude, coordinates?.longitude, hasValidCoords, hasCleanAddress]);

  // 2. Construir la consulta de dirección oficial registrada
  const addressParts: string[] = [];
  if (cleanAddress) {
    // Si la dirección incluye prefijo de GPS de guardia, limpiar para búsqueda
    const sanitizedAddr = cleanAddress.replace(/^GPS(?:\s*(?:Oficial|Guardia|Sensor|En Terreno|Móvil))?:\s*[\d.-]+,\s*[\d.-]+\s*•\s*/i, "").trim();
    if (sanitizedAddr && !sanitizedAddr.toLowerCase().includes("patrullaje móvil")) {
      addressParts.push(sanitizedAddr);
    }
  }
  if (cleanCity && (!cleanAddress || !cleanAddress.toLowerCase().includes(cleanCity.toLowerCase()))) {
    addressParts.push(cleanCity);
  }
  if (addressParts.length > 0) {
    const joined = addressParts.join(", ").toLowerCase();
    if (!joined.includes("méxico") && !joined.includes("mexico")) {
      addressParts.push("México");
    }
  } else if (cleanStore && !cleanStore.toLowerCase().includes("oficial de seguridad") && !cleanStore.toLowerCase().includes("sos oficial")) {
    addressParts.push(cleanStore, "México");
  }

  const coordsQuery = hasValidCoords ? `${coordinates!.latitude},${coordinates!.longitude}` : "";
  const fullAddressQuery = addressParts.join(", ") || (hasValidCoords ? coordsQuery : "Ciudad de México, México");

  // 4. Seleccionar la consulta activa: si hay coordenadas válidas, ubicar el PIN en el punto GPS exacto
  const activeQuery = targetMode === "COORDS" && hasValidCoords ? coordsQuery : fullAddressQuery;

  // 5. URL para Google Maps externo
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeQuery)}`;

  // 6. URL Universal embebida de Google Maps (Zoom 17 táctico)
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    activeQuery
  )}&t=${mapType}&z=17&ie=UTF8&iwloc=&output=embed`;

  const handleCopyAddress = () => {
    const textToCopy = `${cleanStore ? cleanStore + " — " : ""}${cleanAddress}${cleanCity ? `, ${cleanCity}` : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col h-full shadow-2xl ${className}`}>
      {/* Cabecera Táctica del Mapa */}
      <div className="bg-slate-900/95 backdrop-blur px-3.5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-red-500 animate-bounce shrink-0" />
          <div className="min-w-0">
            <span className="truncate block font-bold text-white max-w-[260px] sm:max-w-[340px]" title={fullAddressQuery}>
              {cleanStore ? `${cleanStore} — ` : ""}{cleanAddress || "Dirección del Establecimiento"}
            </span>
            {cleanCity && (
              <span className="text-[10px] text-slate-400 block truncate">
                {cleanCity}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Selector de Modo: Dirección Registrada vs Coordenadas GPS */}
          {hasValidCoords && (
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setTargetMode("ADDRESS")}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  targetMode === "ADDRESS"
                    ? "bg-red-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Mostrar según la dirección oficial registrada de la terminal"
              >
                📍 Dirección
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("COORDS")}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  targetMode === "COORDS"
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title={`Mostrar según coordenadas GPS (${coordinates!.latitude.toFixed(4)}, ${coordinates!.longitude.toFixed(4)})`}
              >
                🛰️ GPS
              </button>
            </div>
          )}

          {/* Copiar Dirección para despacho policial */}
          <button
            type="button"
            onClick={handleCopyAddress}
            className="text-[10px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Copiar dirección registrada para despacho de patrulla"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span className="hidden md:inline">{copied ? "Copiada" : "Copiar"}</span>
          </button>

          {/* Alternar Mapa / Satélite */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === "m" ? "k" : "m"))}
            className="text-[10px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title={mapType === "m" ? "Cambiar a Vista Satélite" : "Cambiar a Vista Callejero"}
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">{mapType === "m" ? "Satélite" : "Callejero"}</span>
          </button>

          {/* Botón Abrir en Google Maps Externo */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Abrir en Google Maps para trazar ruta de patrulla"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Contenedor del Mapa Interactivo Universal */}
      <div className="relative w-full flex-1 min-h-[320px] sm:min-h-[380px] bg-slate-950">
        <iframe
          key={`${activeQuery}-${mapType}`}
          title={`Ubicación Google Maps - ${cleanStore || "Establecimiento"}`}
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0 filter saturate-[1.1] contrast-[1.05]"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Overlay táctico inferior: Baliza de dirección confirmada */}
        <div className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-200 z-10 flex items-center gap-2 shadow-xl pointer-events-none max-w-[90%]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <div className="truncate">
            <span className="font-mono text-emerald-400 font-bold mr-1.5">
              {targetMode === "ADDRESS" ? "DIRECCIÓN REGISTRADA:" : "GPS SENSOR:"}
            </span>
            <span className="text-slate-300 font-medium truncate">
              {targetMode === "ADDRESS"
                ? `${cleanAddress || fullAddressQuery}${cleanCity ? ` (${cleanCity})` : ""}`
                : `${coordinates!.latitude.toFixed(5)}, ${coordinates!.longitude.toFixed(5)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
