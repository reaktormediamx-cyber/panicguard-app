import React, { useState, useEffect } from "react";
import { MapPin, Navigation, ExternalLink, Shield } from "lucide-react";
import { GeoCoordinates } from "../../types.js";
import { geocodeAddress } from "../../utils/geocoding.js";

interface TacticalMapProps {
  coordinates: GeoCoordinates;
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
  const [mapCoords, setMapCoords] = useState<GeoCoordinates>(coordinates);

  useEffect(() => {
    let isMounted = true;
    if (coordinates && (coordinates.latitude !== 0 || coordinates.longitude !== 0)) {
      setMapCoords(coordinates);
    } else if (address && address.trim().length > 3) {
      geocodeAddress(address, city).then((res) => {
        if (isMounted && res) {
          setMapCoords(res);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [address, city, coordinates?.latitude, coordinates?.longitude]);

  const { latitude, longitude } = mapCoords;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address ? (address.includes("México") ? address : `${address}, México`) : `${latitude},${longitude}`
  )}`;

  // OpenStreetMap static tile embed URL or interactive tactical visualizer
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.006}%2C${latitude - 0.005}%2C${longitude + 0.006}%2C${latitude + 0.005}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col ${className}`}>
      {/* Map Header / Actions */}
      <div className="bg-slate-900/90 backdrop-blur px-3.5 py-2 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-red-400 animate-bounce" />
          <span className="truncate max-w-[200px]">{address}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded transition-colors"
          >
            Google Maps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Map Frame */}
      <div className="relative w-full h-48 sm:h-56 bg-slate-950">
        <iframe
          title="Ubicación GPS del Comercio"
          src={osmEmbedUrl}
          className="w-full h-full border-0 filter invert contrast-125 hue-rotate-180 opacity-85"
          loading="lazy"
        />

        {/* Tactical Crosshair Center */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <span className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping" />
            <div className="w-8 h-8 rounded-full bg-red-600/80 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* GPS Coordinates Badge Bottom Left */}
        <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 z-10 flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-emerald-400 rotate-45" />
          <span>LAT: {latitude.toFixed(5)}</span>
          <span>LNG: {longitude.toFixed(5)}</span>
        </div>
      </div>
    </div>
  );
};
