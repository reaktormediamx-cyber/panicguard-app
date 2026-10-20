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

  // Default to COORDS mode whenever valid GPS coordinates are provided (essential for exact Guard & Store GPS pin)
  const [targetMode, setTargetMode] = useState<"ADDRESS" | "COORDS">(() => {
    return hasValidCoords ? "COORDS" : "ADDRESS";
  });
  const [copied, setCopied] = useState<boolean>(false);

  // Prioritize exact GPS coordinates whenever available
  useEffect(() => {
    if (hasValidCoords) {
      setTargetMode("COORDS");
    } else if (hasCleanAddress) {
      setTargetMode("ADDRESS");
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
    <div className={`relative rounded-2xl overflow-hidden border border-[#262833] bg-[#181920] flex flex-col h-full shadow-2xl ${className}`}>
      {/* Cabecera Táctica del Mapa */}
      <div className="bg-[#181920]/95 backdrop-blur px-3 py-1.5 border-b border-[#262833] flex flex-wrap items-center justify-between gap-1.5 z-10 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 min-w-0 flex-1">
          <MapPin className="w-3.5 h-3.5 text-[#f43f5e] animate-bounce shrink-0" />
          <div className="min-w-0">
            <span className="truncate block font-bold text-white text-xs max-w-[260px] sm:max-w-[340px]" title={fullAddressQuery}>
              {cleanStore ? `${cleanStore} — ` : ""}{cleanAddress || "Dirección del Establecimiento"}
            </span>
            {cleanCity && (
              <span className="text-[10px] text-[#9ca3af] block truncate leading-tight">
                {cleanCity}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Selector de Modo: Dirección Registrada vs Coordenadas GPS */}
          {hasValidCoords && (
            <div className="flex items-center bg-[#111215] rounded-md p-0.5 border border-[#262833] text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setTargetMode("ADDRESS")}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  targetMode === "ADDRESS"
                    ? "bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Mostrar según la dirección oficial registrada"
              >
                Dir
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("COORDS")}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  targetMode === "COORDS"
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title={`Mostrar según coordenadas GPS (${coordinates!.latitude.toFixed(4)}, ${coordinates!.longitude.toFixed(4)})`}
              >
                GPS
              </button>
            </div>
          )}

          {/* Copiar Dirección */}
          <button
            type="button"
            onClick={handleCopyAddress}
            className="text-[10px] font-medium text-slate-300 hover:text-white bg-[#111215] hover:bg-[#22242e] px-2 py-0.5 rounded-md border border-[#262833] transition-colors flex items-center gap-1 cursor-pointer"
            title="Copiar dirección registrada para despacho de patrulla"
          >
            {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3 text-[#9ca3af]" />}
            <span className="hidden md:inline">{copied ? "Copiado" : "Copiar"}</span>
          </button>

          {/* Alternar Mapa / Satélite */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === "m" ? "k" : "m"))}
            className="text-[10px] font-medium text-slate-300 hover:text-white bg-[#111215] hover:bg-[#22242e] px-2 py-0.5 rounded-md border border-[#262833] transition-colors flex items-center gap-1 cursor-pointer"
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
            className="text-[10px] font-bold text-white bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#f43f5e] hover:to-[#e11d48] flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-sm"
            title="Abrir en Google Maps"
          >
            <span>Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Contenedor del Mapa Interactivo Universal (Flexible) */}
      <div className="relative w-full flex-1 min-h-[160px] bg-[#111215]">
        <iframe
          key={`${activeQuery}-${mapType}`}
          title={`Ubicación Google Maps - ${cleanStore || "Establecimiento"}`}
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0 filter saturate-[1.1] contrast-[1.05]"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Overlay táctico inferior: Baliza compacta */}
        <div className="absolute bottom-1.5 left-1.5 bg-[#111215]/90 backdrop-blur-sm px-2 py-0.5 rounded-md border border-[#262833] text-[9px] text-slate-300 z-10 flex items-center gap-1 shadow pointer-events-none max-w-[85%]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-ping shrink-0" />
          <span className="font-mono text-[#10b981] font-bold">
            {targetMode === "ADDRESS" ? "DIR:" : "GPS:"}
          </span>
          <span className="text-slate-300 truncate">
            {targetMode === "ADDRESS"
              ? (cleanAddress || fullAddressQuery)
              : `${coordinates!.latitude.toFixed(4)}, ${coordinates!.longitude.toFixed(4)}`}
          </span>
        </div>
      </div>
    </div>
  );
};
