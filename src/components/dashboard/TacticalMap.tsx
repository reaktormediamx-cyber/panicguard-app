import React, { useState } from "react";
import { MapPin, ExternalLink, Layers } from "lucide-react";
import { GeoCoordinates } from "../../types.js";

interface TacticalMapProps {
  coordinates?: GeoCoordinates;
  storeName: string;
  address: string;
  city?: string;
  className?: string;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  coordinates,
  storeName,
  address,
  city,
  className = "",
}) => {
  const [mapType, setMapType] = useState<"m" | "k">("m"); // "m" = mapa estándar, "k" = satélite

  // Construir la consulta de búsqueda exacta para Google Maps
  const cleanAddress = address ? address.replace(/^.*?—\s*/, "").trim() : "";
  const queryParts = [
    cleanAddress || "",
    city ? city.trim() : "",
    cleanAddress.toLowerCase().includes("méxico") || cleanAddress.toLowerCase().includes("mexico") ? "" : "México",
  ].filter(Boolean);

  const fullSearchQuery = queryParts.join(", ") || (coordinates ? `${coordinates.latitude},${coordinates.longitude}` : "México");

  // URL para abrir Google Maps externamente
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullSearchQuery
  )}`;

  // URL Universal de Google Maps sin restricciones de clave API
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    fullSearchQuery
  )}&t=${mapType}&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col h-full shadow-2xl ${className}`}>
      {/* Cabecera Táctica del Mapa */}
      <div className="bg-slate-900/95 backdrop-blur px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 min-w-0">
          <MapPin className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
          <span className="truncate max-w-[220px] sm:max-w-[280px]" title={fullSearchQuery}>
            {storeName ? `${storeName} — ` : ""}{cleanAddress || "Dirección del Establecimiento"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Alternar Mapa / Satélite */}
          <button
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
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
          title={`Ubicación Google Maps - ${storeName || "Establecimiento"}`}
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0 filter saturate-[1.1] contrast-[1.05]"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Overlay táctico inferior: Baliza de dirección confirmada */}
        <div className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-200 z-10 flex items-center gap-2 shadow-xl pointer-events-none max-w-[85%]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="font-mono text-emerald-400 font-semibold truncate">
            {cleanAddress ? `OBJETIVO: ${cleanAddress}` : coordinates ? `GPS: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}` : "UBICACIÓN CONFIRMADA"}
          </span>
        </div>
      </div>
    </div>
  );
};
